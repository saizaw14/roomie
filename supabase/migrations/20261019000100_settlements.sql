begin;
create table public.settlements (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete restrict,
 sender_id uuid not null, recipient_id uuid not null,
 amount_minor bigint not null check(amount_minor between 1 and 1000000000), currency text not null references public.supported_currencies(code),
 status text not null default 'pending' check(status in ('pending','confirmed','rejected')),
 payment_date date not null check(payment_date between date '2000-01-01' and date '2100-12-31'),
 created_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now(),
 decided_at timestamptz, decided_by uuid references public.profiles(id) on delete restrict,
 request_key text not null check(char_length(request_key) between 1 and 100),
 foreign key(sender_id,household_id) references public.household_members(id,household_id) on delete restrict,
 foreign key(recipient_id,household_id) references public.household_members(id,household_id) on delete restrict,
 check(sender_id<>recipient_id), unique(household_id,created_by,request_key),
 check((status='pending' and decided_at is null and decided_by is null) or (status<>'pending' and decided_at is not null and decided_by is not null))
);
create index settlements_house on public.settlements(household_id,created_at desc,id);
alter table public.settlements enable row level security;
revoke all on public.settlements from public,anon,authenticated;
grant select on public.settlements to authenticated;
create policy settlements_read on public.settlements for select to authenticated using(roomie_private.is_member(household_id));

create function public.roomie_record_settlement(p_household uuid,p_recipient uuid,p_amount bigint,p_date date,p_request text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_sender uuid; v_currency text; v_row public.settlements;
begin
 if auth.uid() is null or not roomie_private.is_member(p_household) then raise exception 'Active membership required' using errcode='42501'; end if;
 if p_amount is null or p_amount not between 1 and 1000000000 or p_date is null or p_date not between date '2000-01-01' and least(current_date,date '2100-12-31') or p_request is null or char_length(p_request) not between 1 and 100 then raise exception 'Invalid repayment details' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_household::text||auth.uid()::text||p_request,19));
 select * into v_row from public.settlements where household_id=p_household and created_by=auth.uid() and request_key=p_request;
 if v_row.id is not null then
  if v_row.recipient_id is distinct from p_recipient or v_row.amount_minor<>p_amount or v_row.payment_date<>p_date then raise exception 'Request key already used for different details' using errcode='22023'; end if;
  return v_row.id;
 end if;
 select id into v_sender from public.household_members where household_id=p_household and user_id=auth.uid() and status='active';
 perform 1 from public.household_members where household_id=p_household and id in (v_sender,p_recipient) and status='active' order by id for share;
 if v_sender is null or not exists(select 1 from public.household_members where id=v_sender and status='active') or p_recipient is null or v_sender=p_recipient or not exists(select 1 from public.household_members where id=p_recipient and household_id=p_household and status='active') then raise exception 'Choose another active household member' using errcode='22023'; end if;
 select currency into v_currency from public.households where id=p_household;
 insert into public.settlements(household_id,sender_id,recipient_id,amount_minor,currency,payment_date,created_by,request_key)
 values(p_household,v_sender,p_recipient,p_amount,v_currency,p_date,auth.uid(),p_request) returning * into v_row;
 insert into public.activity_events(household_id,actor_id,event_type,entity_type,entity_id,metadata) values(p_household,auth.uid(),'settlement_recorded','settlement',v_row.id,jsonb_build_object('amount_minor',p_amount,'status','pending'));
 return v_row.id;
end; $$;

create function public.roomie_decide_settlement(p_id uuid,p_confirm boolean) returns void
language plpgsql security definer set search_path='' as $$
declare v_row public.settlements; v_status text;
begin
 select * into v_row from public.settlements where id=p_id for update;
 if v_row.id is null or auth.uid() is null or not roomie_private.is_member(v_row.household_id) or not exists(select 1 from public.household_members where id=v_row.recipient_id and user_id=auth.uid() and status='active') then raise exception 'Only the recipient may decide' using errcode='42501'; end if;
 if p_confirm is null then raise exception 'Decision required' using errcode='22023'; end if;
 v_status:=case when p_confirm then 'confirmed' else 'rejected' end;
 if v_row.status=v_status then return; end if;
 if v_row.status<>'pending' then raise exception 'Repayment already decided' using errcode='40001'; end if;
 update public.settlements set status=v_status,decided_at=now(),decided_by=auth.uid() where id=p_id;
 insert into public.activity_events(household_id,actor_id,event_type,entity_type,entity_id,metadata) values(v_row.household_id,auth.uid(),'settlement_'||v_status,'settlement',p_id,jsonb_build_object('amount_minor',v_row.amount_minor,'status',v_status));
end; $$;

-- One SQL statement gives balances and repayment history a consistent MVCC snapshot.
create function public.roomie_settlement_dashboard(p_household uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb;
begin
 if auth.uid() is null or not roomie_private.is_member(p_household) then raise exception 'Active membership required' using errcode='42501'; end if;
 with movements as (
  select p.member_id,p.paid_minor::numeric value from public.expense_payers p join public.expenses e on e.id=p.expense_id where e.household_id=p_household and e.status='posted'
  union all select s.member_id,-s.owed_minor::numeric from public.expense_splits s join public.expenses e on e.id=s.expense_id where e.household_id=p_household and e.status='posted'
  union all select sender_id,amount_minor::numeric from public.settlements where household_id=p_household and status='confirmed'
  union all select recipient_id,-amount_minor::numeric from public.settlements where household_id=p_household and status='confirmed'
 ), balances as (
  select m.id member_id,m.user_id,m.status,coalesce(sum(v.value),0)::text net from public.household_members m left join movements v on v.member_id=m.id where m.household_id=p_household group by m.id
 ), recent as (
  select s.* from public.settlements s where household_id=p_household and (status='pending' or id in(select id from public.settlements where household_id=p_household and status<>'pending' order by created_at desc,id limit 100))
 ) select jsonb_build_object('balances',coalesce((select jsonb_agg(to_jsonb(b) order by member_id) from balances b),'[]'::jsonb),'settlements',coalesce((select jsonb_agg(to_jsonb(r)-'request_key' order by created_at desc,id) from recent r),'[]'::jsonb)) into v_result;
 return v_result;
end; $$;
revoke all on function public.roomie_record_settlement(uuid,uuid,bigint,date,text),public.roomie_decide_settlement(uuid,boolean),public.roomie_settlement_dashboard(uuid) from public,anon;
grant execute on function public.roomie_record_settlement(uuid,uuid,bigint,date,text),public.roomie_decide_settlement(uuid,boolean),public.roomie_settlement_dashboard(uuid) to authenticated;
commit;
