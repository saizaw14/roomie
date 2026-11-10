begin;
create table public.app_notifications (
 id uuid primary key default gen_random_uuid(), recipient_id uuid not null references public.profiles(id) on delete restrict,
 household_id uuid not null references public.households(id) on delete restrict,
 event_key text not null, kind text not null check(kind in ('payment_review','payment_confirmed','payment_rejected','expense_created','expense_edited','expense_voided','bill_due','bill_created','bill_paused','bill_resumed','member_joined','member_left','household_renamed')),
 entity_id uuid not null, actor_id uuid references public.profiles(id) on delete restrict,
 title text not null, body text not null, requires_action boolean not null default false,
 created_at timestamptz not null default now(), read_at timestamptz,
 unique(recipient_id,event_key)
);
alter table public.app_notifications enable row level security;
revoke all on public.app_notifications from public,anon,authenticated;
create index app_notifications_inbox on public.app_notifications(recipient_id,created_at desc);
-- Preserve the existing inbox, including read state.
insert into public.app_notifications(id,recipient_id,household_id,event_key,kind,entity_id,actor_id,title,body,requires_action,created_at,read_at)
select n.id,n.recipient_id,n.household_id,'payment-review:'||n.settlement_id,'payment_review',n.settlement_id,s.created_by,
 'Review a payment','A household member sent a payment for your review.',true,n.created_at,n.read_at
from public.receipt_notifications n join public.settlements s on s.id=n.settlement_id;

create function roomie_private.notify_receipt_inbox() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.app_notifications(id,recipient_id,household_id,event_key,kind,entity_id,actor_id,title,body,requires_action,created_at,read_at)
 select new.id,new.recipient_id,new.household_id,'payment-review:'||new.settlement_id,'payment_review',new.settlement_id,s.created_by,
 'Review a payment','A household member sent a receipt for your review.',true,new.created_at,new.read_at
 from public.settlements s where s.id=new.settlement_id
 on conflict(recipient_id,event_key) do nothing;
 return new;
end; $$;
revoke all on function roomie_private.notify_receipt_inbox() from public,anon,authenticated;
create trigger receipt_unified_inbox after insert on public.receipt_notifications for each row execute function roomie_private.notify_receipt_inbox();

create function roomie_private.notify_roomie_activity() returns trigger language plpgsql security definer set search_path='' as $$
declare v_exp public.expenses;v_payment public.settlements;v_actor text;v_user uuid;v_previous jsonb;
begin
 select display_name into v_actor from public.profiles where id=new.actor_id;
 v_actor:=coalesce(v_actor,'A household member');
 if new.entity_type='expense' and new.event_type in ('expense_created','expense_edited','expense_voided') then
  select * into v_exp from public.expenses where id=new.entity_id;
  select snapshot into v_previous from public.expense_revisions where expense_id=v_exp.id and version=v_exp.version-1;
  for v_user in
   select distinct m.user_id from public.household_members m where m.household_id=new.household_id and m.status='active' and m.user_id<>new.actor_id and (
    m.id in (select member_id from public.expense_payers where expense_id=v_exp.id union select member_id from public.expense_splits where expense_id=v_exp.id)
    or m.id::text in (select value->>'member_id' from jsonb_array_elements(coalesce(v_previous->'payers','[]'::jsonb)||coalesce(v_previous->'splits','[]'::jsonb))))
  loop
   insert into public.app_notifications(recipient_id,household_id,event_key,kind,entity_id,actor_id,title,body,created_at)
   values(v_user,new.household_id,'activity:'||new.id,new.event_type,new.entity_id,new.actor_id,
    case new.event_type when 'expense_created' then 'New shared expense' when 'expense_edited' then 'Expense updated' else 'Expense cancelled' end,
    v_actor||case new.event_type when 'expense_created' then ' added ' when 'expense_edited' then ' updated ' else ' cancelled ' end||v_exp.title||'. Review the details and your share.',new.created_at)
   on conflict(recipient_id,event_key) do nothing;
  end loop;
 elsif new.entity_type='settlement' and new.event_type in ('settlement_recorded','settlement_confirmed','settlement_rejected') then
  select * into v_payment from public.settlements where id=new.entity_id;
  select user_id into v_user from public.household_members where id=case when new.event_type='settlement_recorded' then v_payment.recipient_id else v_payment.sender_id end and status='active';
  if v_user is not null and v_user<>new.actor_id then
   insert into public.app_notifications(recipient_id,household_id,event_key,kind,entity_id,actor_id,title,body,requires_action,created_at)
   values(v_user,new.household_id,case when new.event_type='settlement_recorded' then 'payment-review:'||new.entity_id else 'activity:'||new.id end,
    case when new.event_type='settlement_recorded' then 'payment_review' when new.event_type='settlement_confirmed' then 'payment_confirmed' else 'payment_rejected' end,
    new.entity_id,new.actor_id,case new.event_type when 'settlement_recorded' then 'Review a payment' when 'settlement_confirmed' then 'Payment confirmed' else 'Payment needs your attention' end,
    v_actor||case new.event_type when 'settlement_recorded' then ' sent a payment for you to review.' when 'settlement_confirmed' then ' confirmed your payment.' else ' rejected your payment. Check the details before sending another.' end,
    new.event_type in ('settlement_recorded','settlement_rejected'),new.created_at) on conflict(recipient_id,event_key) do nothing;
  end if;
 elsif new.entity_type='bill' and new.event_type in ('bill_created','bill_paused','bill_resumed') then
  insert into public.app_notifications(recipient_id,household_id,event_key,kind,entity_id,actor_id,title,body,created_at)
  select distinct m.user_id,new.household_id,'activity:'||new.id,new.event_type,new.entity_id,new.actor_id,
   case new.event_type when 'bill_created' then 'Recurring bill added' when 'bill_paused' then 'Recurring bill paused' else 'Recurring bill resumed' end,
   v_actor||' updated the reminder for '||t.title||'.',new.created_at
  from public.recurring_expense_templates t join public.household_members m on m.household_id=t.household_id
  where t.id=new.entity_id and m.status='active' and m.user_id<>new.actor_id and (m.id=t.payer_id or exists(select 1 from public.recurring_bill_participants p where p.template_id=t.id and p.member_id=m.id))
  on conflict(recipient_id,event_key) do nothing;
 end if;
 return new;
end; $$;
create trigger roomie_activity_notifications after insert on public.activity_events for each row execute function roomie_private.notify_roomie_activity();

create function roomie_private.notify_household_change() returns trigger language plpgsql security definer set search_path='' as $$
declare v_house uuid;v_kind text;v_entity uuid;v_title text;v_body text;v_name text;
begin
 if tg_table_name='households' then
  if new.name is not distinct from old.name then return new;end if;
  v_house:=new.id;v_kind:='household_renamed';v_entity:=new.id;v_title:='Household name changed';v_body:='Your household is now called '||new.name||'.';
 else
  if tg_op='UPDATE' and new.status is not distinct from old.status then return new;end if;
  if new.status not in ('active','left') then return new;end if;
  select display_name into v_name from public.profiles where id=new.user_id;
  v_house:=new.household_id;v_entity:=new.id;v_kind:=case when new.status='active' then 'member_joined' else 'member_left' end;
  v_title:=case when new.status='active' then 'New household member' else 'Household member left' end;
  v_body:=coalesce(v_name,'A member')||case when new.status='active' then ' joined your household.' else ' left your household.' end;
 end if;
 insert into public.app_notifications(recipient_id,household_id,event_key,kind,entity_id,actor_id,title,body)
 select m.user_id,v_house,'household:'||gen_random_uuid(),v_kind,v_entity,auth.uid(),v_title,v_body
 from public.household_members m where m.household_id=v_house and m.status='active' and m.user_id is distinct from auth.uid()
 and (tg_table_name='households' or m.id<>v_entity);
 return new;
end; $$;
create trigger roomie_household_notifications after update of name on public.households for each row execute function roomie_private.notify_household_change();
create trigger roomie_membership_notifications after insert or update of status on public.household_members for each row execute function roomie_private.notify_household_change();

create function public.roomie_notifications() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 -- Due dates change with time, not writes. Materialize once per occurrence while the app refreshes.
 insert into public.app_notifications(recipient_id,household_id,event_key,kind,entity_id,title,body,requires_action)
 select auth.uid(),t.household_id,'bill-due:'||t.id||':'||t.next_due_date,'bill_due',t.id,'Bill due: '||t.title,
  case when m.id=t.payer_id then 'Review this bill and post it after payment.' else 'A shared bill is due. Check the reminder with your household.' end,m.id=t.payer_id
 from public.recurring_expense_templates t join public.household_members m on m.household_id=t.household_id and m.user_id=auth.uid() and m.status='active'
 where t.active and t.next_due_date<=current_date and (m.id=t.payer_id or exists(select 1 from public.recurring_bill_participants p where p.template_id=t.id and p.member_id=m.id))
 on conflict(recipient_id,event_key) do nothing;
 return coalesce((select jsonb_agg(to_jsonb(inbox) order by inbox.created_at desc,inbox.id) from (
  select n.id,n.household_id,n.kind,n.entity_id,
   case when n.kind='payment_review' and exists(select 1 from public.settlements s where s.id=n.entity_id and s.status<>'pending') then 'Payment already reviewed' else n.title end title,
   case when n.kind='payment_review' and exists(select 1 from public.settlements s where s.id=n.entity_id and s.status<>'pending') then 'Open this payment to see the decision.' else n.body end body,n.created_at,n.read_at,h.name household_name,
   case when n.kind='payment_review' then exists(select 1 from public.settlements s where s.id=n.entity_id and s.status='pending') else n.requires_action end requires_action
  from public.app_notifications n join public.households h on h.id=n.household_id
  where n.recipient_id=auth.uid() and roomie_private.is_member(n.household_id)
   and (n.kind<>'bill_due' or exists(select 1 from public.recurring_expense_templates t where t.id=n.entity_id and t.active and t.next_due_date<=current_date and n.event_key='bill-due:'||t.id||':'||t.next_due_date))
   and (n.read_at is null or n.id in(select id from public.app_notifications where recipient_id=auth.uid() and read_at is not null order by created_at desc,id limit 200))
 ) inbox),'[]'::jsonb);
end; $$;
create function public.roomie_read_notification(p_id uuid) returns void language sql security definer set search_path='' as $$
 update public.app_notifications set read_at=coalesce(read_at,now()) where id=p_id and recipient_id=auth.uid() and roomie_private.is_member(household_id);
$$;
revoke all on function roomie_private.notify_roomie_activity(),roomie_private.notify_household_change() from public,anon,authenticated;
revoke all on function public.roomie_notifications(),public.roomie_read_notification(uuid) from public,anon;
grant execute on function public.roomie_notifications(),public.roomie_read_notification(uuid) to authenticated;
commit;
