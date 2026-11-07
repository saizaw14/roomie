begin;
alter table public.recurring_expense_templates add column split_method text not null default 'equal' check(split_method in ('equal','exact','percentage','single'));
alter table public.recurring_expense_templates add column allocations jsonb not null default '[]'::jsonb;
drop function public.roomie_create_bill(uuid,text,text,bigint,text,date,uuid,uuid[],text);
drop function public.roomie_post_bill(uuid,date,bigint,date,uuid,uuid[]);
create function roomie_private.bill_allocation(p_method text,p_amount bigint,p_payer uuid,p_members uuid[],p_values jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare v_item jsonb; v_sum bigint:=0; v_result jsonb;
begin
 if p_method is null or p_method not in ('equal','exact','percentage','single') then raise exception 'Invalid bill split method' using errcode='22023'; end if;
 if p_method='single' then
  if p_members is distinct from array[p_payer] then raise exception 'The payer must cover the full bill' using errcode='22023'; end if;
 end if;
 if p_method in ('equal','single') then
  select jsonb_agg(jsonb_build_object('member_id',x) order by x) into v_result from unnest(p_members) x;
  return v_result;
 end if;
 if jsonb_typeof(p_values) is distinct from 'array' then raise exception 'Allocation required' using errcode='22023'; end if;
 if jsonb_array_length(p_values)<>cardinality(p_members) then raise exception 'Allocation must match participants' using errcode='22023'; end if;
 for v_item in select value from jsonb_array_elements(p_values) loop
  if jsonb_typeof(v_item) is distinct from 'object' or coalesce(v_item->>'member_id','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
   or jsonb_typeof(v_item->'value') is distinct from 'number' or coalesce(v_item->>'value','') !~ '^[0-9]{1,10}$' then raise exception 'Invalid bill allocation' using errcode='22023'; end if;
  if not ((v_item->>'member_id')::uuid=any(p_members)) or (v_item->>'value')::bigint>(case when p_method='percentage' then 10000 else 1000000000 end) then raise exception 'Invalid allocation member or value' using errcode='22023'; end if;
  v_sum:=v_sum+(v_item->>'value')::bigint;
 end loop;
 if (select count(distinct (value->>'member_id')::uuid) from jsonb_array_elements(p_values))<>cardinality(p_members) then raise exception 'Duplicate allocation' using errcode='22023'; end if;
 if (p_method='percentage' and v_sum<>10000) or (p_method='exact' and (v_sum<1 or v_sum>1000000000 or (p_amount is not null and v_sum<>p_amount))) then raise exception 'Allocation totals do not match' using errcode='22023'; end if;
 select jsonb_agg(jsonb_build_object('member_id',(value->>'member_id')::uuid,'value',(value->>'value')::bigint) order by (value->>'member_id')::uuid) into v_result from jsonb_array_elements(p_values);
 return v_result;
end; $$;
revoke all on function roomie_private.bill_allocation(text,bigint,uuid,uuid[],jsonb) from public,anon,authenticated;
create function public.roomie_create_bill(p_household uuid,p_title text,p_category text,p_amount bigint,p_frequency text,p_due date,p_payer uuid,p_members uuid[],p_request text,p_method text default 'equal',p_allocations jsonb default '[]'::jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_payload jsonb;v_existing public.recurring_expense_templates;v_allocation jsonb;
begin
 if not roomie_private.is_owner(p_household) then raise exception 'Only the owner can manage bills' using errcode='42501'; end if;
 if p_title is null or char_length(btrim(p_title)) not between 1 and 120 or p_category is null or p_category not in ('Groceries','Utilities','Rent','Transport','Other')
 or (p_amount is not null and p_amount not between 1 and 1000000000) or p_frequency is null or p_frequency not in ('weekly','monthly')
 or p_due is null or p_due not between date '2000-01-01' and date '2100-11-30'
 or p_request is null or char_length(p_request) not between 1 and 100 then raise exception 'Invalid bill details' using errcode='22023'; end if;
 perform roomie_private.validate_bill_members(p_household,p_payer,p_members);
 v_allocation:=roomie_private.bill_allocation(p_method,p_amount,p_payer,p_members,p_allocations);
 v_payload:=jsonb_build_object('title',btrim(p_title),'category',p_category,'amount',p_amount,'frequency',p_frequency,'due',p_due,'payer',p_payer,'members',p_members,'method',p_method,'allocation',v_allocation);
 perform pg_advisory_xact_lock(hashtextextended(p_household::text||auth.uid()::text||p_request,0));
 select * into v_existing from public.recurring_expense_templates where household_id=p_household and created_by=auth.uid() and request_key=p_request;
 if v_existing.id is not null then
 if v_existing.request_payload<>v_payload and not (p_method='equal' and not (v_existing.request_payload ? 'method') and v_existing.request_payload=(v_payload-'method'-'allocation')) then raise exception 'Request already used with different bill details' using errcode='22023'; end if;
 return v_existing.id; end if;
 perform roomie_private.validate_bill_members(p_household,p_payer,p_members);
 insert into public.recurring_expense_templates(household_id,title,category,amount_minor,frequency,anchor_day,next_due_date,payer_id,created_by,request_key,request_payload,split_method,allocations)
 values(p_household,btrim(p_title),p_category,p_amount,p_frequency,extract(day from p_due),p_due,p_payer,auth.uid(),p_request,v_payload,p_method,v_allocation) returning id into v_id;
 insert into public.recurring_bill_participants select v_id,p_household,x from unnest(p_members) x;
 insert into public.activity_events(household_id,actor_id,event_type,entity_type,entity_id,metadata)
 values(p_household,auth.uid(),'bill_created','bill',v_id,jsonb_build_object('title',btrim(p_title)));
 return v_id;
end; $$;
create function public.roomie_post_bill(p_id uuid,p_due date,p_amount bigint,p_paid_date date,p_payer uuid,p_members uuid[],p_method text default null,p_allocations jsonb default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_bill public.recurring_expense_templates;v_existing public.recurring_bill_occurrences;v_payload jsonb;v_expense uuid;v_next date;v_participants jsonb;v_method text;
begin
 select * into v_bill from public.recurring_expense_templates where id=p_id for update;
 if v_bill.id is null or not roomie_private.is_member(v_bill.household_id) then raise exception 'Active household membership required' using errcode='42501'; end if;
 v_method:=coalesce(p_method,v_bill.split_method);
 perform roomie_private.validate_bill_members(v_bill.household_id,p_payer,p_members);
 v_participants:=roomie_private.bill_allocation(v_method,p_amount,p_payer,p_members,coalesce(p_allocations,v_bill.allocations));
 v_payload:=jsonb_build_object('amount',p_amount,'paid_date',p_paid_date,'payer',p_payer,'members',p_members,'method',v_method,'allocation',v_participants);
 select * into v_existing from public.recurring_bill_occurrences where template_id=p_id and due_date=p_due;
 if v_existing.expense_id is not null then
 if v_existing.request_payload<>v_payload and not (v_method='equal' and not (v_existing.request_payload ? 'method') and v_existing.request_payload=(v_payload-'method'-'allocation')) then raise exception 'Occurrence already posted with different details' using errcode='22023'; end if;
 return v_existing.expense_id; end if;
 if not v_bill.active or p_due is null or v_bill.next_due_date<>p_due then raise exception 'Bill changed; refresh before posting' using errcode='40001'; end if;
 if p_amount is null or p_amount not between 1 and 1000000000 or p_paid_date is null or p_paid_date>current_date or p_paid_date<date '2000-01-01' then raise exception 'Check the final amount and payment date' using errcode='22023'; end if;
 perform roomie_private.validate_bill_members(v_bill.household_id,p_payer,p_members);
 v_expense:=public.roomie_create_expense(v_bill.household_id,v_bill.title,v_bill.category,p_amount,p_paid_date,
 'Recurring bill due '||p_due::text,case when v_method='single' then 'equal' else v_method end,jsonb_build_array(jsonb_build_object('member_id',p_payer,'value',p_amount)),v_participants,'bill:'||p_id::text||':'||p_due::text);
 insert into public.recurring_bill_occurrences(template_id,household_id,due_date,expense_id,posted_by,request_payload)
 values(p_id,v_bill.household_id,p_due,v_expense,auth.uid(),v_payload);
 v_next:=roomie_private.next_bill_date(p_due,v_bill.frequency,v_bill.anchor_day);
 -- Keep the final supported reminder date and stop instead of overflowing the date domain.
 update public.recurring_expense_templates set next_due_date=case when v_next>date '2100-12-31' then next_due_date else v_next end,
 active=(v_next<=date '2100-12-31'),version=version+1 where id=p_id;
 return v_expense;
end; $$;
create or replace function public.roomie_bill_dashboard(p_household uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not roomie_private.is_member(p_household) then raise exception 'Active household membership required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(to_jsonb(b) order by b.next_due_date,b.id) from (
 select t.id,t.household_id,t.title,t.category,t.amount_minor::text,t.frequency,t.next_due_date,t.payer_id,t.active,t.version,t.split_method,t.allocations,
 (select coalesce(jsonb_agg(member_id order by member_id),'[]'::jsonb) from public.recurring_bill_participants where template_id=t.id) as participants
 from public.recurring_expense_templates t where t.household_id=p_household
 ) b),'[]'::jsonb);
end; $$;
revoke all on function public.roomie_create_bill(uuid,text,text,bigint,text,date,uuid,uuid[],text,text,jsonb),public.roomie_post_bill(uuid,date,bigint,date,uuid,uuid[],text,jsonb) from public,anon;
grant execute on function public.roomie_create_bill(uuid,text,text,bigint,text,date,uuid,uuid[],text,text,jsonb),public.roomie_post_bill(uuid,date,bigint,date,uuid,uuid[],text,jsonb) to authenticated;
commit;
