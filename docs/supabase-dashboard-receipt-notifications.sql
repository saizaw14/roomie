-- Run once after QR repayments. Creates in-app receipt notifications.
begin;
create table public.receipt_notifications (
 id uuid primary key default gen_random_uuid(),
 settlement_id uuid not null unique references public.settlements(id) on delete restrict,
 household_id uuid not null references public.households(id) on delete restrict,
 recipient_id uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default now(), read_at timestamptz
);
alter table public.receipt_notifications enable row level security;
revoke all on public.receipt_notifications from anon,authenticated;
create index receipt_notifications_recipient on public.receipt_notifications(recipient_id,created_at desc);
create function roomie_private.notify_receipt() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.receipt_path is not null and old.receipt_path is null then
  insert into public.receipt_notifications(settlement_id,household_id,recipient_id)
  select new.id,new.household_id,user_id from public.household_members where id=new.recipient_id
  on conflict(settlement_id) do nothing;
 end if;
 return new;
end; $$;
revoke all on function roomie_private.notify_receipt() from public,anon,authenticated;
create trigger receipt_submitted_notification after update of receipt_path on public.settlements for each row execute function roomie_private.notify_receipt();
-- Include receipts already awaiting review before this migration.
insert into public.receipt_notifications(settlement_id,household_id,recipient_id,created_at)
select s.id,s.household_id,m.user_id,s.created_at from public.settlements s join public.household_members m on m.id=s.recipient_id
where s.receipt_path is not null and s.status='pending' on conflict(settlement_id) do nothing;
create function public.roomie_receipt_notifications() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc),'[]'::jsonb) from (
 select n.id,n.household_id,n.settlement_id,n.created_at,n.read_at,h.name as household_name,p.display_name as sender_name,s.amount_minor::text,s.currency,s.status
 from public.receipt_notifications n join public.settlements s on s.id=n.settlement_id
 join public.households h on h.id=n.household_id join public.household_members m on m.id=s.sender_id join public.profiles p on p.id=m.user_id
 where n.recipient_id=(select auth.uid()) and roomie_private.is_member(n.household_id)
 and (n.read_at is null or n.id in (select recent.id from public.receipt_notifications recent where recent.recipient_id=(select auth.uid()) order by recent.created_at desc limit 200))
 order by n.created_at desc
 ) n;
$$;
create function public.roomie_read_receipt_notification(p_id uuid) returns void language sql security definer set search_path='' as $$
 update public.receipt_notifications set read_at=coalesce(read_at,now()) where id=p_id and recipient_id=(select auth.uid()) and roomie_private.is_member(household_id);
$$;
revoke all on function public.roomie_receipt_notifications(),public.roomie_read_receipt_notification(uuid) from public,anon;
grant execute on function public.roomie_receipt_notifications(),public.roomie_read_receipt_notification(uuid) to authenticated;
insert into supabase_migrations.schema_migrations(version,name,statements) values('20261022000100','receipt_notifications',array[$roomie_notifications$create table public.receipt_notifications (
 id uuid primary key default gen_random_uuid(),
 settlement_id uuid not null unique references public.settlements(id) on delete restrict,
 household_id uuid not null references public.households(id) on delete restrict,
 recipient_id uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default now(), read_at timestamptz
);
alter table public.receipt_notifications enable row level security;
revoke all on public.receipt_notifications from anon,authenticated;
create index receipt_notifications_recipient on public.receipt_notifications(recipient_id,created_at desc);
create function roomie_private.notify_receipt() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.receipt_path is not null and old.receipt_path is null then
  insert into public.receipt_notifications(settlement_id,household_id,recipient_id)
  select new.id,new.household_id,user_id from public.household_members where id=new.recipient_id
  on conflict(settlement_id) do nothing;
 end if;
 return new;
end; $$;
revoke all on function roomie_private.notify_receipt() from public,anon,authenticated;
create trigger receipt_submitted_notification after update of receipt_path on public.settlements for each row execute function roomie_private.notify_receipt();
-- Include receipts already awaiting review before this migration.
insert into public.receipt_notifications(settlement_id,household_id,recipient_id,created_at)
select s.id,s.household_id,m.user_id,s.created_at from public.settlements s join public.household_members m on m.id=s.recipient_id
where s.receipt_path is not null and s.status='pending' on conflict(settlement_id) do nothing;
create function public.roomie_receipt_notifications() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc),'[]'::jsonb) from (
 select n.id,n.household_id,n.settlement_id,n.created_at,n.read_at,h.name as household_name,p.display_name as sender_name,s.amount_minor::text,s.currency,s.status
 from public.receipt_notifications n join public.settlements s on s.id=n.settlement_id
 join public.households h on h.id=n.household_id join public.household_members m on m.id=s.sender_id join public.profiles p on p.id=m.user_id
 where n.recipient_id=(select auth.uid()) and roomie_private.is_member(n.household_id)
 and (n.read_at is null or n.id in (select recent.id from public.receipt_notifications recent where recent.recipient_id=(select auth.uid()) order by recent.created_at desc limit 200))
 order by n.created_at desc
 ) n;
$$;
create function public.roomie_read_receipt_notification(p_id uuid) returns void language sql security definer set search_path='' as $$
 update public.receipt_notifications set read_at=coalesce(read_at,now()) where id=p_id and recipient_id=(select auth.uid()) and roomie_private.is_member(household_id);
$$;
revoke all on function public.roomie_receipt_notifications(),public.roomie_read_receipt_notification(uuid) from public,anon;
grant execute on function public.roomie_receipt_notifications(),public.roomie_read_receipt_notification(uuid) to authenticated;$roomie_notifications$]);
commit;
select version,name from supabase_migrations.schema_migrations where version='20261022000100';
