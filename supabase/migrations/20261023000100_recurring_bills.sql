begin;
create table public.recurring_expense_templates (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete restrict,
 title text not null check(char_length(btrim(title)) between 1 and 120),
 category text not null check(category in ('Groceries','Utilities','Rent','Transport','Other')),
 amount_minor bigint check(amount_minor between 1 and 1000000000),
 frequency text not null check(frequency in ('weekly','monthly')),
 anchor_day integer not null check(anchor_day between 1 and 31),
 next_due_date date not null check(next_due_date between date '2000-01-01' and date '2100-12-31'),
 payer_id uuid not null, active boolean not null default true,
 created_by uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default now(), version integer not null default 1,
 request_key text not null check(char_length(request_key) between 1 and 100), request_payload jsonb not null,
 unique(id,household_id),unique(household_id,created_by,request_key),
 foreign key(payer_id,household_id) references public.household_members(id,household_id) on delete restrict
);
create table public.recurring_bill_participants (
 template_id uuid not null, household_id uuid not null, member_id uuid not null,
 primary key(template_id,member_id),
 foreign key(template_id,household_id) references public.recurring_expense_templates(id,household_id) on delete restrict,
 foreign key(member_id,household_id) references public.household_members(id,household_id) on delete restrict
);
create table public.recurring_bill_occurrences (
 template_id uuid not null, household_id uuid not null, due_date date not null,
 expense_id uuid not null unique, posted_by uuid not null references public.profiles(id) on delete restrict,
 posted_at timestamptz not null default now(), request_payload jsonb not null,
 primary key(template_id,due_date),
 foreign key(template_id,household_id) references public.recurring_expense_templates(id,household_id) on delete restrict,
 foreign key(expense_id,household_id) references public.expenses(id,household_id) on delete restrict
);
create index recurring_templates_household on public.recurring_expense_templates(household_id,next_due_date);
alter table public.recurring_expense_templates enable row level security;
alter table public.recurring_bill_participants enable row level security;
alter table public.recurring_bill_occurrences enable row level security;
revoke all on public.recurring_expense_templates,public.recurring_bill_participants,public.recurring_bill_occurrences from anon,authenticated;
grant select on public.recurring_expense_templates,public.recurring_bill_participants,public.recurring_bill_occurrences to authenticated;
create policy recurring_templates_read on public.recurring_expense_templates for select to authenticated using(roomie_private.is_member(household_id));
create policy recurring_participants_read on public.recurring_bill_participants for select to authenticated using(roomie_private.is_member(household_id));
create policy recurring_occurrences_read on public.recurring_bill_occurrences for select to authenticated using(roomie_private.is_member(household_id));

create function roomie_private.next_bill_date(p_date date,p_frequency text,p_anchor integer) returns date
language sql immutable set search_path='' as $$
 select case when p_frequency='weekly' then p_date+7 else
 (date_trunc('month',p_date::timestamp)+interval '1 month')::date +
 (least(p_anchor,extract(day from date_trunc('month',p_date::timestamp)+interval '2 months - 1 day')::integer)-1) end;
$$;
create function roomie_private.validate_bill_members(p_household uuid,p_payer uuid,p_members uuid[]) returns void
language plpgsql set search_path='' as $$
begin
 if p_payer is null or not exists(select 1 from public.household_members where id=p_payer and household_id=p_household and status='active') then
 raise exception 'Choose an active household payer' using errcode='22023'; end if;
 if p_members is null or cardinality(p_members) not between 1 and 50
 or (select count(distinct x) from unnest(p_members) x)<>cardinality(p_members)
 or exists(select 1 from unnest(p_members) x where not exists(select 1 from public.household_members where id=x and household_id=p_household and status='active')) then
 raise exception 'Choose 1–50 distinct active household participants' using errcode='22023'; end if;
end; $$;
create function public.roomie_create_bill(p_household uuid,p_title text,p_category text,p_amount bigint,p_frequency text,p_due date,p_payer uuid,p_members uuid[],p_request text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_payload jsonb;v_existing public.recurring_expense_templates;
begin
 if not roomie_private.is_owner(p_household) then raise exception 'Only the owner can manage bills' using errcode='42501'; end if;
 if p_title is null or char_length(btrim(p_title)) not between 1 and 120 or p_category is null or p_category not in ('Groceries','Utilities','Rent','Transport','Other')
 or (p_amount is not null and p_amount not between 1 and 1000000000) or p_frequency is null or p_frequency not in ('weekly','monthly')
 or p_due is null or p_due not between date '2000-01-01' and date '2100-11-30'
 or p_request is null or char_length(p_request) not between 1 and 100 then raise exception 'Invalid bill details' using errcode='22023'; end if;
 v_payload:=jsonb_build_object('title',btrim(p_title),'category',p_category,'amount',p_amount,'frequency',p_frequency,'due',p_due,'payer',p_payer,'members',p_members);
 perform pg_advisory_xact_lock(hashtextextended(p_household::text||auth.uid()::text||p_request,0));
 select * into v_existing from public.recurring_expense_templates where household_id=p_household and created_by=auth.uid() and request_key=p_request;
 if v_existing.id is not null then
 if v_existing.request_payload<>v_payload then raise exception 'Request already used with different bill details' using errcode='22023'; end if;
 return v_existing.id; end if;
 perform roomie_private.validate_bill_members(p_household,p_payer,p_members);
 insert into public.recurring_expense_templates(household_id,title,category,amount_minor,frequency,anchor_day,next_due_date,payer_id,created_by,request_key,request_payload)
 values(p_household,btrim(p_title),p_category,p_amount,p_frequency,extract(day from p_due),p_due,p_payer,auth.uid(),p_request,v_payload) returning id into v_id;
 insert into public.recurring_bill_participants select v_id,p_household,x from unnest(p_members) x;
 insert into public.activity_events(household_id,actor_id,event_type,entity_type,entity_id,metadata)
 values(p_household,auth.uid(),'bill_created','bill',v_id,jsonb_build_object('title',btrim(p_title)));
 return v_id;
end; $$;
create function public.roomie_set_bill_active(p_id uuid,p_active boolean,p_version integer) returns void
language plpgsql security definer set search_path='' as $$
declare v_bill public.recurring_expense_templates;
begin
 select * into v_bill from public.recurring_expense_templates where id=p_id for update;
 if v_bill.id is null or not roomie_private.is_owner(v_bill.household_id) then raise exception 'Only the owner can manage bills' using errcode='42501'; end if;
 if p_active is null then raise exception 'Choose a bill status' using errcode='22023'; end if;
 if v_bill.active=p_active then return; end if;
 if p_version is null or v_bill.version<>p_version then raise exception 'Bill changed; refresh before updating' using errcode='40001'; end if;
 update public.recurring_expense_templates set active=p_active,version=version+1 where id=p_id;
 insert into public.activity_events(household_id,actor_id,event_type,entity_type,entity_id,metadata)
 values(v_bill.household_id,auth.uid(),case when p_active then 'bill_resumed' else 'bill_paused' end,'bill',p_id,jsonb_build_object('title',v_bill.title));
end; $$;
create function public.roomie_post_bill(p_id uuid,p_due date,p_amount bigint,p_paid_date date,p_payer uuid,p_members uuid[]) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_bill public.recurring_expense_templates;v_existing public.recurring_bill_occurrences;v_payload jsonb;v_expense uuid;v_next date;v_participants jsonb;
begin
 select * into v_bill from public.recurring_expense_templates where id=p_id for update;
 if v_bill.id is null or not roomie_private.is_member(v_bill.household_id) then raise exception 'Active household membership required' using errcode='42501'; end if;
 v_payload:=jsonb_build_object('amount',p_amount,'paid_date',p_paid_date,'payer',p_payer,'members',p_members);
 select * into v_existing from public.recurring_bill_occurrences where template_id=p_id and due_date=p_due;
 if v_existing.expense_id is not null then
 if v_existing.request_payload<>v_payload then raise exception 'Occurrence already posted with different details' using errcode='22023'; end if;
 return v_existing.expense_id; end if;
 if not v_bill.active or p_due is null or v_bill.next_due_date<>p_due then raise exception 'Bill changed; refresh before posting' using errcode='40001'; end if;
 if p_amount is null or p_amount not between 1 and 1000000000 or p_paid_date is null or p_paid_date>current_date or p_paid_date<date '2000-01-01' then raise exception 'Check the final amount and payment date' using errcode='22023'; end if;
 perform roomie_private.validate_bill_members(v_bill.household_id,p_payer,p_members);
 select jsonb_agg(jsonb_build_object('member_id',x)) into v_participants from unnest(p_members) x;
 v_expense:=public.roomie_create_expense(v_bill.household_id,v_bill.title,v_bill.category,p_amount,p_paid_date,
 'Recurring bill due '||p_due::text,'equal',jsonb_build_array(jsonb_build_object('member_id',p_payer,'value',p_amount)),v_participants,'bill:'||p_id::text||':'||p_due::text);
 insert into public.recurring_bill_occurrences(template_id,household_id,due_date,expense_id,posted_by,request_payload)
 values(p_id,v_bill.household_id,p_due,v_expense,auth.uid(),v_payload);
 v_next:=roomie_private.next_bill_date(p_due,v_bill.frequency,v_bill.anchor_day);
 -- Keep the final supported reminder date and stop instead of overflowing the date domain.
 update public.recurring_expense_templates set next_due_date=case when v_next>date '2100-12-31' then next_due_date else v_next end,
 active=(v_next<=date '2100-12-31'),version=version+1 where id=p_id;
 return v_expense;
end; $$;
create function public.roomie_bill_dashboard(p_household uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not roomie_private.is_member(p_household) then raise exception 'Active household membership required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(to_jsonb(b) order by b.next_due_date,b.id) from (
 select t.id,t.household_id,t.title,t.category,t.amount_minor::text,t.frequency,t.next_due_date,t.payer_id,t.active,t.version,
 (select coalesce(jsonb_agg(member_id order by member_id),'[]'::jsonb) from public.recurring_bill_participants where template_id=t.id) as participants
 from public.recurring_expense_templates t where t.household_id=p_household
 ) b),'[]'::jsonb);
end; $$;
revoke all on function roomie_private.next_bill_date(date,text,integer),roomie_private.validate_bill_members(uuid,uuid,uuid[]) from public,anon,authenticated;
revoke all on function public.roomie_create_bill(uuid,text,text,bigint,text,date,uuid,uuid[],text),public.roomie_set_bill_active(uuid,boolean,integer),public.roomie_post_bill(uuid,date,bigint,date,uuid,uuid[]),public.roomie_bill_dashboard(uuid) from public,anon;
grant execute on function public.roomie_create_bill(uuid,text,text,bigint,text,date,uuid,uuid[],text),public.roomie_set_bill_active(uuid,boolean,integer),public.roomie_post_bill(uuid,date,bigint,date,uuid,uuid[]),public.roomie_bill_dashboard(uuid) to authenticated;
commit;
