-- Roomie milestone 4: run this entire file once after profiles and households.
begin;
set local lock_timeout='4s';
-- Money is bounded to RM10,000,000 per expense (1,000,000,000 sen), safely representable in JS.
create table public.expenses (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete restrict,
 title text not null check(char_length(btrim(title)) between 1 and 120), category text not null check(category in ('Groceries','Utilities','Rent','Transport','Other')),
 amount_minor bigint not null check(amount_minor between 1 and 1000000000), currency text not null default 'MYR' check(currency='MYR'),
 expense_date date not null check(expense_date between date '2000-01-01' and date '2100-12-31'), notes text not null default '' check(char_length(notes)<=1000),
 split_method text not null check(split_method in ('equal','exact','percentage')), status text not null default 'posted' check(status in ('posted','void')),
 created_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 version integer not null default 1 check(version>0), request_key text not null check(char_length(request_key) between 1 and 100), request_payload jsonb not null,
 voided_by uuid references public.profiles(id) on delete restrict, voided_at timestamptz, void_reason text,
 unique(household_id,created_by,request_key), unique(id,household_id),
 check((status='posted' and voided_by is null and voided_at is null and void_reason is null) or (status='void' and voided_by is not null and voided_at is not null and char_length(btrim(void_reason)) between 1 and 500))
);
create index expenses_house_date on public.expenses(household_id,expense_date desc,id);
-- Composite foreign keys prevent references to a member from another household.
alter table public.household_members add constraint household_members_id_house_unique unique(id,household_id);
create table public.expense_payers (
 expense_id uuid not null, household_id uuid not null, member_id uuid not null, paid_minor bigint not null check(paid_minor between 1 and 1000000000),
 primary key(expense_id,member_id), foreign key(expense_id,household_id) references public.expenses(id,household_id) on delete restrict,
 foreign key(member_id,household_id) references public.household_members(id,household_id) on delete restrict
);
create table public.expense_splits (
 expense_id uuid not null, household_id uuid not null, member_id uuid not null, owed_minor bigint not null check(owed_minor between 0 and 1000000000), percentage_bps integer check(percentage_bps between 0 and 10000),
 primary key(expense_id,member_id), foreign key(expense_id,household_id) references public.expenses(id,household_id) on delete restrict,
 foreign key(member_id,household_id) references public.household_members(id,household_id) on delete restrict
);
create table public.expense_revisions (
 expense_id uuid not null references public.expenses(id) on delete restrict, household_id uuid not null references public.households(id) on delete restrict,
 version integer not null, actor_id uuid not null references public.profiles(id) on delete restrict, action text not null check(action in ('created','edited','voided')),
 snapshot jsonb not null, created_at timestamptz not null default now(), primary key(expense_id,version)
);
create table public.activity_events (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete restrict,
 actor_id uuid not null references public.profiles(id) on delete restrict, event_type text not null, entity_type text not null, entity_id uuid not null,
 metadata jsonb not null, created_at timestamptz not null default now()
);
create index activity_events_house_time on public.activity_events(household_id,created_at desc);
-- All client writes go through transactional RPCs, including revisions and activity.
alter table public.expenses enable row level security;
alter table public.expense_payers enable row level security;
alter table public.expense_splits enable row level security;
alter table public.expense_revisions enable row level security;
alter table public.activity_events enable row level security;
revoke all on public.expenses,public.expense_payers,public.expense_splits,public.expense_revisions,public.activity_events from anon,authenticated;
grant select on public.expenses,public.expense_payers,public.expense_splits,public.expense_revisions,public.activity_events to authenticated;
create policy expenses_read on public.expenses for select to authenticated using(roomie_private.is_member(household_id));
create policy payers_read on public.expense_payers for select to authenticated using(roomie_private.is_member(household_id));
create policy splits_read on public.expense_splits for select to authenticated using(roomie_private.is_member(household_id));
create policy revisions_read on public.expense_revisions for select to authenticated using(roomie_private.is_member(household_id));
create policy activity_read on public.activity_events for select to authenticated using(roomie_private.is_member(household_id));

-- Deferred checks protect the complete financial state even from accidental SQL writes.
create function roomie_private.check_expense_totals() returns trigger language plpgsql set search_path='' as $$
declare v_id uuid; v_exp public.expenses;
begin
 if tg_table_name='expenses' then v_id:=coalesce(new.id,old.id); else v_id:=coalesce(new.expense_id,old.expense_id); end if;
 select * into v_exp from public.expenses where id=v_id;
 if v_exp.id is null then return null; end if;
 if (select coalesce(sum(paid_minor),0) from public.expense_payers where expense_id=v_id) <> v_exp.amount_minor
 or (select coalesce(sum(owed_minor),0) from public.expense_splits where expense_id=v_id) <> v_exp.amount_minor then
  raise exception 'Expense payments and shares must equal its amount' using errcode='23514';
 end if;
 if v_exp.split_method='percentage' then
  if (select coalesce(sum(percentage_bps),0) from public.expense_splits where expense_id=v_id)<>10000
  or exists(select 1 from public.expense_splits where expense_id=v_id and percentage_bps is null) then raise exception 'Percentages must total 10000 basis points' using errcode='23514'; end if;
 elsif exists(select 1 from public.expense_splits where expense_id=v_id and percentage_bps is not null) then raise exception 'Unexpected percentages' using errcode='23514'; end if;
 return null;
end; $$;
create constraint trigger expense_totals after insert or update on public.expenses deferrable initially deferred for each row execute function roomie_private.check_expense_totals();
create constraint trigger payer_totals after insert or update or delete on public.expense_payers deferrable initially deferred for each row execute function roomie_private.check_expense_totals();
create constraint trigger split_totals after insert or update or delete on public.expense_splits deferrable initially deferred for each row execute function roomie_private.check_expense_totals();

create function roomie_private.audit_expense(p_id uuid,p_action text) returns void language plpgsql set search_path='' as $$
declare v_exp public.expenses; v_snapshot jsonb;
begin
 select * into v_exp from public.expenses where id=p_id;
 v_snapshot:=jsonb_build_object('expense',to_jsonb(v_exp)-'request_payload'-'request_key',
  'payers',(select jsonb_agg(to_jsonb(p) order by member_id) from public.expense_payers p where expense_id=p_id),
  'splits',(select jsonb_agg(to_jsonb(s) order by member_id) from public.expense_splits s where expense_id=p_id));
 insert into public.expense_revisions(expense_id,household_id,version,actor_id,action,snapshot) values(p_id,v_exp.household_id,v_exp.version,auth.uid(),p_action,v_snapshot);
 insert into public.activity_events(household_id,actor_id,event_type,entity_type,entity_id,metadata) values(v_exp.household_id,auth.uid(),'expense_'||p_action,'expense',p_id,jsonb_build_object('version',v_exp.version,'title',v_exp.title,'amount_minor',v_exp.amount_minor));
end; $$;

create function roomie_private.write_expense(p_id uuid,p_household uuid,p_title text,p_category text,p_amount bigint,p_date date,p_notes text,p_method text,p_payers jsonb,p_participants jsonb,p_version integer,p_request text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_exp public.expenses; v_id uuid; v_item jsonb; v_member uuid; v_total bigint:=0; v_value bigint; v_count integer; v_index integer:=0; v_remainder bigint; v_payload jsonb;
begin
 if not roomie_private.is_member(p_household) then raise exception 'Active household membership required' using errcode='42501'; end if;
 if p_title is null or char_length(btrim(p_title)) not between 1 and 120 or p_category is null or p_category not in ('Groceries','Utilities','Rent','Transport','Other')
 or p_amount is null or p_amount not between 1 and 1000000000 or p_date is null or p_date not between date '2000-01-01' and date '2100-12-31'
 or p_notes is null or char_length(p_notes)>1000 or p_method is null or p_method not in ('equal','exact','percentage') then raise exception 'Invalid expense details' using errcode='22023'; end if;
 if jsonb_typeof(p_payers) is distinct from 'array' or jsonb_typeof(p_participants) is distinct from 'array' then raise exception 'Invalid allocation' using errcode='22023'; end if;
 if jsonb_array_length(p_payers) not between 1 and 50 or jsonb_array_length(p_participants) not between 1 and 50 then raise exception 'Select 1–50 payers and participants' using errcode='22023'; end if;
 v_payload:=jsonb_build_object('title',btrim(p_title),'category',p_category,'amount',p_amount,'date',p_date,'notes',p_notes,'method',p_method,'payers',p_payers,'participants',p_participants);
 if p_id is null then
  if p_request is null or char_length(p_request) not between 1 and 100 then raise exception 'Request key required' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_household::text||auth.uid()::text||p_request,0));
  select * into v_exp from public.expenses where household_id=p_household and created_by=auth.uid() and request_key=p_request;
  if v_exp.id is not null then
   if v_exp.request_payload<>v_payload then raise exception 'Request key already used for different details' using errcode='22023'; end if;
   return v_exp.id;
  end if;
 else
  select * into v_exp from public.expenses where id=p_id and household_id=p_household for update;
  if v_exp.id is null or (v_exp.created_by<>auth.uid() and not roomie_private.is_owner(p_household)) then raise exception 'Only creator or owner can edit' using errcode='42501'; end if;
  if v_exp.status<>'posted' or p_version is null or v_exp.version<>p_version then raise exception 'Expense changed; refresh before editing' using errcode='40001'; end if;
 end if;
 -- Validate all identities and integer values before any financial write.
 for v_item in select value from jsonb_array_elements(p_payers||p_participants) loop
  if jsonb_typeof(v_item) is distinct from 'object' or coalesce(v_item->>'member_id','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then raise exception 'Invalid member' using errcode='22023'; end if;
  v_member:=(v_item->>'member_id')::uuid;
  perform 1 from public.household_members where id=v_member and household_id=p_household and status='active' for share;
  if not found then raise exception 'Allocation member must be active in this household' using errcode='22023'; end if;
 end loop;
 if (select count(distinct (value->>'member_id')::uuid) from jsonb_array_elements(p_payers))<>jsonb_array_length(p_payers)
 or (select count(distinct (value->>'member_id')::uuid) from jsonb_array_elements(p_participants))<>jsonb_array_length(p_participants) then raise exception 'Duplicate allocation member' using errcode='22023'; end if;
 for v_item in select value from jsonb_array_elements(p_payers) loop
  if jsonb_typeof(v_item->'value') is distinct from 'number' or coalesce(v_item->>'value','') !~ '^[0-9]{1,10}$' then raise exception 'Payments must be integer sen' using errcode='22023'; end if;
  v_value:=(v_item->>'value')::bigint;
  if v_value not between 1 and p_amount then raise exception 'Invalid payment' using errcode='22023'; end if;
  v_total:=v_total+v_value;
 end loop;
 if v_total<>p_amount then raise exception 'Payments must equal expense amount' using errcode='22023'; end if;
 v_total:=0;
 for v_item in select value from jsonb_array_elements(p_participants) loop
  if p_method<>'equal' then
   if jsonb_typeof(v_item->'value') is distinct from 'number' or coalesce(v_item->>'value','') !~ '^[0-9]{1,10}$' then raise exception 'Shares must be integer sen or basis points' using errcode='22023'; end if;
   v_value:=(v_item->>'value')::bigint;
   if v_value<0 or (p_method='exact' and v_value>p_amount) or (p_method='percentage' and v_value>10000) then raise exception 'Invalid share' using errcode='22023'; end if;
   v_total:=v_total+v_value;
  end if;
 end loop;
 if (p_method='exact' and v_total<>p_amount) or (p_method='percentage' and v_total<>10000) then raise exception 'Shares must total the amount or 10000 basis points' using errcode='22023'; end if;
 if p_id is null then
  insert into public.expenses(household_id,title,category,amount_minor,expense_date,notes,split_method,created_by,request_key,request_payload)
  values(p_household,btrim(p_title),p_category,p_amount,p_date,p_notes,p_method,auth.uid(),p_request,v_payload) returning id into v_id;
 else
  v_id:=p_id;
  update public.expenses set title=btrim(p_title),category=p_category,amount_minor=p_amount,expense_date=p_date,notes=p_notes,split_method=p_method,version=version+1,updated_at=now() where id=v_id;
  delete from public.expense_payers where expense_id=v_id;
  delete from public.expense_splits where expense_id=v_id;
 end if;
 insert into public.expense_payers(expense_id,household_id,member_id,paid_minor) select v_id,p_household,(value->>'member_id')::uuid,(value->>'value')::bigint from jsonb_array_elements(p_payers);
 v_count:=jsonb_array_length(p_participants);
 if p_method='percentage' then
  select p_amount-coalesce(sum(p_amount*(value->>'value')::bigint/10000),0) into v_remainder from jsonb_array_elements(p_participants);
 else v_remainder:=p_amount%v_count; end if;
 -- Equal: UUID ascending. Percentage: largest fractional remainder, then UUID ascending.
 for v_item in select value from jsonb_array_elements(p_participants)
 order by case when p_method='percentage' then (p_amount*(value->>'value')::bigint)%10000 else 0 end desc,(value->>'member_id')::uuid loop
  v_value:=case when p_method='equal' then p_amount/v_count+case when v_index<v_remainder then 1 else 0 end
    when p_method='exact' then (v_item->>'value')::bigint
    else p_amount*(v_item->>'value')::bigint/10000+case when v_index<v_remainder then 1 else 0 end end;
  insert into public.expense_splits(expense_id,household_id,member_id,owed_minor,percentage_bps) values(v_id,p_household,(v_item->>'member_id')::uuid,v_value,case when p_method='percentage' then (v_item->>'value')::integer else null end);
  v_index:=v_index+1;
 end loop;
 perform roomie_private.audit_expense(v_id,case when p_id is null then 'created' else 'edited' end);
 return v_id;
end; $$;

create function public.roomie_create_expense(p_household uuid,p_title text,p_category text,p_amount bigint,p_date date,p_notes text,p_method text,p_payers jsonb,p_participants jsonb,p_request text) returns uuid
language sql security definer set search_path='' as $$ select roomie_private.write_expense(null,p_household,p_title,p_category,p_amount,p_date,p_notes,p_method,p_payers,p_participants,null,p_request); $$;
create function public.roomie_update_expense(p_id uuid,p_household uuid,p_title text,p_category text,p_amount bigint,p_date date,p_notes text,p_method text,p_payers jsonb,p_participants jsonb,p_version integer) returns uuid
language sql security definer set search_path='' as $$ select roomie_private.write_expense(p_id,p_household,p_title,p_category,p_amount,p_date,p_notes,p_method,p_payers,p_participants,p_version,null); $$;
create function public.roomie_void_expense(p_id uuid,p_version integer,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare v_exp public.expenses;
begin
 select * into v_exp from public.expenses where id=p_id for update;
 if v_exp.id is null or not roomie_private.is_member(v_exp.household_id) or (v_exp.created_by<>auth.uid() and not roomie_private.is_owner(v_exp.household_id)) then raise exception 'Only creator or owner can void' using errcode='42501'; end if;
 if p_reason is null or char_length(btrim(p_reason)) not between 1 and 500 then raise exception 'Void reason required' using errcode='22023'; end if;
 if v_exp.status='void' and v_exp.version=p_version+1 and v_exp.voided_by=auth.uid() and v_exp.void_reason=btrim(p_reason) then return; end if;
 if v_exp.status<>'posted' or p_version is null or v_exp.version<>p_version then raise exception 'Expense changed; refresh before voiding' using errcode='40001'; end if;
 update public.expenses set status='void',version=version+1,updated_at=now(),voided_by=auth.uid(),voided_at=now(),void_reason=btrim(p_reason) where id=p_id;
 perform roomie_private.audit_expense(p_id,'voided');
end; $$;
revoke all on function roomie_private.check_expense_totals(),roomie_private.audit_expense(uuid,text),roomie_private.write_expense(uuid,uuid,text,text,bigint,date,text,text,jsonb,jsonb,integer,text) from public,anon,authenticated;
revoke all on function public.roomie_create_expense(uuid,text,text,bigint,date,text,text,jsonb,jsonb,text),public.roomie_update_expense(uuid,uuid,text,text,bigint,date,text,text,jsonb,jsonb,integer),public.roomie_void_expense(uuid,integer,text) from public,anon;
grant execute on function public.roomie_create_expense(uuid,text,text,bigint,date,text,text,jsonb,jsonb,text),public.roomie_update_expense(uuid,uuid,text,text,bigint,date,text,text,jsonb,jsonb,integer),public.roomie_void_expense(uuid,integer,text) to authenticated;

insert into supabase_migrations.schema_migrations(version,name,statements)
values('20261012000100','expenses',array[$roomie_expenses$-- Money is bounded to RM10,000,000 per expense (1,000,000,000 sen), safely representable in JS.
create table public.expenses (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete restrict,
 title text not null check(char_length(btrim(title)) between 1 and 120), category text not null check(category in ('Groceries','Utilities','Rent','Transport','Other')),
 amount_minor bigint not null check(amount_minor between 1 and 1000000000), currency text not null default 'MYR' check(currency='MYR'),
 expense_date date not null check(expense_date between date '2000-01-01' and date '2100-12-31'), notes text not null default '' check(char_length(notes)<=1000),
 split_method text not null check(split_method in ('equal','exact','percentage')), status text not null default 'posted' check(status in ('posted','void')),
 created_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 version integer not null default 1 check(version>0), request_key text not null check(char_length(request_key) between 1 and 100), request_payload jsonb not null,
 voided_by uuid references public.profiles(id) on delete restrict, voided_at timestamptz, void_reason text,
 unique(household_id,created_by,request_key), unique(id,household_id),
 check((status='posted' and voided_by is null and voided_at is null and void_reason is null) or (status='void' and voided_by is not null and voided_at is not null and char_length(btrim(void_reason)) between 1 and 500))
);
create index expenses_house_date on public.expenses(household_id,expense_date desc,id);
-- Composite foreign keys prevent references to a member from another household.
alter table public.household_members add constraint household_members_id_house_unique unique(id,household_id);
create table public.expense_payers (
 expense_id uuid not null, household_id uuid not null, member_id uuid not null, paid_minor bigint not null check(paid_minor between 1 and 1000000000),
 primary key(expense_id,member_id), foreign key(expense_id,household_id) references public.expenses(id,household_id) on delete restrict,
 foreign key(member_id,household_id) references public.household_members(id,household_id) on delete restrict
);
create table public.expense_splits (
 expense_id uuid not null, household_id uuid not null, member_id uuid not null, owed_minor bigint not null check(owed_minor between 0 and 1000000000), percentage_bps integer check(percentage_bps between 0 and 10000),
 primary key(expense_id,member_id), foreign key(expense_id,household_id) references public.expenses(id,household_id) on delete restrict,
 foreign key(member_id,household_id) references public.household_members(id,household_id) on delete restrict
);
create table public.expense_revisions (
 expense_id uuid not null references public.expenses(id) on delete restrict, household_id uuid not null references public.households(id) on delete restrict,
 version integer not null, actor_id uuid not null references public.profiles(id) on delete restrict, action text not null check(action in ('created','edited','voided')),
 snapshot jsonb not null, created_at timestamptz not null default now(), primary key(expense_id,version)
);
create table public.activity_events (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete restrict,
 actor_id uuid not null references public.profiles(id) on delete restrict, event_type text not null, entity_type text not null, entity_id uuid not null,
 metadata jsonb not null, created_at timestamptz not null default now()
);
create index activity_events_house_time on public.activity_events(household_id,created_at desc);
-- All client writes go through transactional RPCs, including revisions and activity.
alter table public.expenses enable row level security;
alter table public.expense_payers enable row level security;
alter table public.expense_splits enable row level security;
alter table public.expense_revisions enable row level security;
alter table public.activity_events enable row level security;
revoke all on public.expenses,public.expense_payers,public.expense_splits,public.expense_revisions,public.activity_events from anon,authenticated;
grant select on public.expenses,public.expense_payers,public.expense_splits,public.expense_revisions,public.activity_events to authenticated;
create policy expenses_read on public.expenses for select to authenticated using(roomie_private.is_member(household_id));
create policy payers_read on public.expense_payers for select to authenticated using(roomie_private.is_member(household_id));
create policy splits_read on public.expense_splits for select to authenticated using(roomie_private.is_member(household_id));
create policy revisions_read on public.expense_revisions for select to authenticated using(roomie_private.is_member(household_id));
create policy activity_read on public.activity_events for select to authenticated using(roomie_private.is_member(household_id));

-- Deferred checks protect the complete financial state even from accidental SQL writes.
create function roomie_private.check_expense_totals() returns trigger language plpgsql set search_path='' as $$
declare v_id uuid; v_exp public.expenses;
begin
 if tg_table_name='expenses' then v_id:=coalesce(new.id,old.id); else v_id:=coalesce(new.expense_id,old.expense_id); end if;
 select * into v_exp from public.expenses where id=v_id;
 if v_exp.id is null then return null; end if;
 if (select coalesce(sum(paid_minor),0) from public.expense_payers where expense_id=v_id) <> v_exp.amount_minor
 or (select coalesce(sum(owed_minor),0) from public.expense_splits where expense_id=v_id) <> v_exp.amount_minor then
  raise exception 'Expense payments and shares must equal its amount' using errcode='23514';
 end if;
 if v_exp.split_method='percentage' then
  if (select coalesce(sum(percentage_bps),0) from public.expense_splits where expense_id=v_id)<>10000
  or exists(select 1 from public.expense_splits where expense_id=v_id and percentage_bps is null) then raise exception 'Percentages must total 10000 basis points' using errcode='23514'; end if;
 elsif exists(select 1 from public.expense_splits where expense_id=v_id and percentage_bps is not null) then raise exception 'Unexpected percentages' using errcode='23514'; end if;
 return null;
end; $$;
create constraint trigger expense_totals after insert or update on public.expenses deferrable initially deferred for each row execute function roomie_private.check_expense_totals();
create constraint trigger payer_totals after insert or update or delete on public.expense_payers deferrable initially deferred for each row execute function roomie_private.check_expense_totals();
create constraint trigger split_totals after insert or update or delete on public.expense_splits deferrable initially deferred for each row execute function roomie_private.check_expense_totals();

create function roomie_private.audit_expense(p_id uuid,p_action text) returns void language plpgsql set search_path='' as $$
declare v_exp public.expenses; v_snapshot jsonb;
begin
 select * into v_exp from public.expenses where id=p_id;
 v_snapshot:=jsonb_build_object('expense',to_jsonb(v_exp)-'request_payload'-'request_key',
  'payers',(select jsonb_agg(to_jsonb(p) order by member_id) from public.expense_payers p where expense_id=p_id),
  'splits',(select jsonb_agg(to_jsonb(s) order by member_id) from public.expense_splits s where expense_id=p_id));
 insert into public.expense_revisions(expense_id,household_id,version,actor_id,action,snapshot) values(p_id,v_exp.household_id,v_exp.version,auth.uid(),p_action,v_snapshot);
 insert into public.activity_events(household_id,actor_id,event_type,entity_type,entity_id,metadata) values(v_exp.household_id,auth.uid(),'expense_'||p_action,'expense',p_id,jsonb_build_object('version',v_exp.version,'title',v_exp.title,'amount_minor',v_exp.amount_minor));
end; $$;

create function roomie_private.write_expense(p_id uuid,p_household uuid,p_title text,p_category text,p_amount bigint,p_date date,p_notes text,p_method text,p_payers jsonb,p_participants jsonb,p_version integer,p_request text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_exp public.expenses; v_id uuid; v_item jsonb; v_member uuid; v_total bigint:=0; v_value bigint; v_count integer; v_index integer:=0; v_remainder bigint; v_payload jsonb;
begin
 if not roomie_private.is_member(p_household) then raise exception 'Active household membership required' using errcode='42501'; end if;
 if p_title is null or char_length(btrim(p_title)) not between 1 and 120 or p_category is null or p_category not in ('Groceries','Utilities','Rent','Transport','Other')
 or p_amount is null or p_amount not between 1 and 1000000000 or p_date is null or p_date not between date '2000-01-01' and date '2100-12-31'
 or p_notes is null or char_length(p_notes)>1000 or p_method is null or p_method not in ('equal','exact','percentage') then raise exception 'Invalid expense details' using errcode='22023'; end if;
 if jsonb_typeof(p_payers) is distinct from 'array' or jsonb_typeof(p_participants) is distinct from 'array' then raise exception 'Invalid allocation' using errcode='22023'; end if;
 if jsonb_array_length(p_payers) not between 1 and 50 or jsonb_array_length(p_participants) not between 1 and 50 then raise exception 'Select 1–50 payers and participants' using errcode='22023'; end if;
 v_payload:=jsonb_build_object('title',btrim(p_title),'category',p_category,'amount',p_amount,'date',p_date,'notes',p_notes,'method',p_method,'payers',p_payers,'participants',p_participants);
 if p_id is null then
  if p_request is null or char_length(p_request) not between 1 and 100 then raise exception 'Request key required' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_household::text||auth.uid()::text||p_request,0));
  select * into v_exp from public.expenses where household_id=p_household and created_by=auth.uid() and request_key=p_request;
  if v_exp.id is not null then
   if v_exp.request_payload<>v_payload then raise exception 'Request key already used for different details' using errcode='22023'; end if;
   return v_exp.id;
  end if;
 else
  select * into v_exp from public.expenses where id=p_id and household_id=p_household for update;
  if v_exp.id is null or (v_exp.created_by<>auth.uid() and not roomie_private.is_owner(p_household)) then raise exception 'Only creator or owner can edit' using errcode='42501'; end if;
  if v_exp.status<>'posted' or p_version is null or v_exp.version<>p_version then raise exception 'Expense changed; refresh before editing' using errcode='40001'; end if;
 end if;
 -- Validate all identities and integer values before any financial write.
 for v_item in select value from jsonb_array_elements(p_payers||p_participants) loop
  if jsonb_typeof(v_item) is distinct from 'object' or coalesce(v_item->>'member_id','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then raise exception 'Invalid member' using errcode='22023'; end if;
  v_member:=(v_item->>'member_id')::uuid;
  perform 1 from public.household_members where id=v_member and household_id=p_household and status='active' for share;
  if not found then raise exception 'Allocation member must be active in this household' using errcode='22023'; end if;
 end loop;
 if (select count(distinct (value->>'member_id')::uuid) from jsonb_array_elements(p_payers))<>jsonb_array_length(p_payers)
 or (select count(distinct (value->>'member_id')::uuid) from jsonb_array_elements(p_participants))<>jsonb_array_length(p_participants) then raise exception 'Duplicate allocation member' using errcode='22023'; end if;
 for v_item in select value from jsonb_array_elements(p_payers) loop
  if jsonb_typeof(v_item->'value') is distinct from 'number' or coalesce(v_item->>'value','') !~ '^[0-9]{1,10}$' then raise exception 'Payments must be integer sen' using errcode='22023'; end if;
  v_value:=(v_item->>'value')::bigint;
  if v_value not between 1 and p_amount then raise exception 'Invalid payment' using errcode='22023'; end if;
  v_total:=v_total+v_value;
 end loop;
 if v_total<>p_amount then raise exception 'Payments must equal expense amount' using errcode='22023'; end if;
 v_total:=0;
 for v_item in select value from jsonb_array_elements(p_participants) loop
  if p_method<>'equal' then
   if jsonb_typeof(v_item->'value') is distinct from 'number' or coalesce(v_item->>'value','') !~ '^[0-9]{1,10}$' then raise exception 'Shares must be integer sen or basis points' using errcode='22023'; end if;
   v_value:=(v_item->>'value')::bigint;
   if v_value<0 or (p_method='exact' and v_value>p_amount) or (p_method='percentage' and v_value>10000) then raise exception 'Invalid share' using errcode='22023'; end if;
   v_total:=v_total+v_value;
  end if;
 end loop;
 if (p_method='exact' and v_total<>p_amount) or (p_method='percentage' and v_total<>10000) then raise exception 'Shares must total the amount or 10000 basis points' using errcode='22023'; end if;
 if p_id is null then
  insert into public.expenses(household_id,title,category,amount_minor,expense_date,notes,split_method,created_by,request_key,request_payload)
  values(p_household,btrim(p_title),p_category,p_amount,p_date,p_notes,p_method,auth.uid(),p_request,v_payload) returning id into v_id;
 else
  v_id:=p_id;
  update public.expenses set title=btrim(p_title),category=p_category,amount_minor=p_amount,expense_date=p_date,notes=p_notes,split_method=p_method,version=version+1,updated_at=now() where id=v_id;
  delete from public.expense_payers where expense_id=v_id;
  delete from public.expense_splits where expense_id=v_id;
 end if;
 insert into public.expense_payers(expense_id,household_id,member_id,paid_minor) select v_id,p_household,(value->>'member_id')::uuid,(value->>'value')::bigint from jsonb_array_elements(p_payers);
 v_count:=jsonb_array_length(p_participants);
 if p_method='percentage' then
  select p_amount-coalesce(sum(p_amount*(value->>'value')::bigint/10000),0) into v_remainder from jsonb_array_elements(p_participants);
 else v_remainder:=p_amount%v_count; end if;
 -- Equal: UUID ascending. Percentage: largest fractional remainder, then UUID ascending.
 for v_item in select value from jsonb_array_elements(p_participants)
 order by case when p_method='percentage' then (p_amount*(value->>'value')::bigint)%10000 else 0 end desc,(value->>'member_id')::uuid loop
  v_value:=case when p_method='equal' then p_amount/v_count+case when v_index<v_remainder then 1 else 0 end
    when p_method='exact' then (v_item->>'value')::bigint
    else p_amount*(v_item->>'value')::bigint/10000+case when v_index<v_remainder then 1 else 0 end end;
  insert into public.expense_splits(expense_id,household_id,member_id,owed_minor,percentage_bps) values(v_id,p_household,(v_item->>'member_id')::uuid,v_value,case when p_method='percentage' then (v_item->>'value')::integer else null end);
  v_index:=v_index+1;
 end loop;
 perform roomie_private.audit_expense(v_id,case when p_id is null then 'created' else 'edited' end);
 return v_id;
end; $$;

create function public.roomie_create_expense(p_household uuid,p_title text,p_category text,p_amount bigint,p_date date,p_notes text,p_method text,p_payers jsonb,p_participants jsonb,p_request text) returns uuid
language sql security definer set search_path='' as $$ select roomie_private.write_expense(null,p_household,p_title,p_category,p_amount,p_date,p_notes,p_method,p_payers,p_participants,null,p_request); $$;
create function public.roomie_update_expense(p_id uuid,p_household uuid,p_title text,p_category text,p_amount bigint,p_date date,p_notes text,p_method text,p_payers jsonb,p_participants jsonb,p_version integer) returns uuid
language sql security definer set search_path='' as $$ select roomie_private.write_expense(p_id,p_household,p_title,p_category,p_amount,p_date,p_notes,p_method,p_payers,p_participants,p_version,null); $$;
create function public.roomie_void_expense(p_id uuid,p_version integer,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare v_exp public.expenses;
begin
 select * into v_exp from public.expenses where id=p_id for update;
 if v_exp.id is null or not roomie_private.is_member(v_exp.household_id) or (v_exp.created_by<>auth.uid() and not roomie_private.is_owner(v_exp.household_id)) then raise exception 'Only creator or owner can void' using errcode='42501'; end if;
 if p_reason is null or char_length(btrim(p_reason)) not between 1 and 500 then raise exception 'Void reason required' using errcode='22023'; end if;
 if v_exp.status='void' and v_exp.version=p_version+1 and v_exp.voided_by=auth.uid() and v_exp.void_reason=btrim(p_reason) then return; end if;
 if v_exp.status<>'posted' or p_version is null or v_exp.version<>p_version then raise exception 'Expense changed; refresh before voiding' using errcode='40001'; end if;
 update public.expenses set status='void',version=version+1,updated_at=now(),voided_by=auth.uid(),voided_at=now(),void_reason=btrim(p_reason) where id=p_id;
 perform roomie_private.audit_expense(p_id,'voided');
end; $$;
revoke all on function roomie_private.check_expense_totals(),roomie_private.audit_expense(uuid,text),roomie_private.write_expense(uuid,uuid,text,text,bigint,date,text,text,jsonb,jsonb,integer,text) from public,anon,authenticated;
revoke all on function public.roomie_create_expense(uuid,text,text,bigint,date,text,text,jsonb,jsonb,text),public.roomie_update_expense(uuid,uuid,text,text,bigint,date,text,text,jsonb,jsonb,integer),public.roomie_void_expense(uuid,integer,text) from public,anon;
grant execute on function public.roomie_create_expense(uuid,text,text,bigint,date,text,text,jsonb,jsonb,text),public.roomie_update_expense(uuid,uuid,text,text,bigint,date,text,text,jsonb,jsonb,integer),public.roomie_void_expense(uuid,integer,text) to authenticated;
$roomie_expenses$]);
commit;
select version,name,to_regclass('public.expenses') is not null as expenses_created from supabase_migrations.schema_migrations where version='20261012000100';
