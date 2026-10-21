begin;
alter table public.settlements add column receipt_path text unique;
alter table public.settlements add column receipt_object_id uuid unique references storage.objects(id) on delete restrict;
create function roomie_private.can_view_payment_qr(p_owner uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(
  select 1 from public.household_members mine join public.household_members peer on peer.household_id=mine.household_id
  cross join lateral (select public.roomie_settlement_dashboard(mine.household_id) data) snapshot
  where mine.user_id=(select auth.uid()) and mine.status='active' and peer.user_id=p_owner and peer.status='active'
  and exists(select 1 from jsonb_array_elements(snapshot.data->'balances') b where b->>'member_id'=mine.id::text and (b->>'net')::numeric<0)
  and exists(select 1 from jsonb_array_elements(snapshot.data->'balances') b where b->>'member_id'=peer.id::text and (b->>'net')::numeric>0)
 );
$$;
revoke all on function roomie_private.can_view_payment_qr(uuid) from public,anon;
grant execute on function roomie_private.can_view_payment_qr(uuid) to authenticated;
-- Resolve the owner through existing profiles, without casting untrusted object paths.
create policy roomie_qr_debtor_read on storage.objects for select to authenticated using(
 bucket_id='payment-qr' and exists(select 1 from public.profiles p where name=p.id::text||'/payment-qr' and roomie_private.can_view_payment_qr(p.id))
);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('payment-receipts','payment-receipts',false,5242880,array['image/png','image/jpeg']);
create policy roomie_receipt_insert on storage.objects for insert to authenticated with check(
 bucket_id='payment-receipts' and name ~ ('^'||(select auth.uid())::text||'/[0-9a-f-]{36}$')
);
create policy roomie_receipt_read on storage.objects for select to authenticated using(
 bucket_id='payment-receipts' and (split_part(name,'/',1)=(select auth.uid())::text or exists(
 select 1 from public.settlements s join public.household_members m on m.id=s.recipient_id
 where s.receipt_path=name and m.user_id=(select auth.uid()) and m.status='active' and roomie_private.is_member(s.household_id)))
);
create policy roomie_receipt_remove_unused on storage.objects for delete to authenticated using(
 bucket_id='payment-receipts' and split_part(name,'/',1)=(select auth.uid())::text and not exists(select 1 from public.settlements s where s.receipt_path=name)
);
-- No UPDATE policy: submitted receipt bytes cannot be replaced. Orphaned uploads may be removed by their sender.
create function public.roomie_record_qr_settlement(p_household uuid,p_recipient uuid,p_amount bigint,p_date date,p_request text,p_receipt text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_receipt text; v_object uuid; v_status text;
begin
 if auth.uid() is null or p_receipt is null or split_part(p_receipt,'/',1)<>auth.uid()::text or not exists(select 1 from storage.objects where bucket_id='payment-receipts' and name=p_receipt) then raise exception 'Your payment receipt is required' using errcode='22023'; end if;
 select id into v_object from storage.objects where bucket_id='payment-receipts' and name=p_receipt for share;
 if v_object is null then raise exception 'Receipt unavailable' using errcode='22023'; end if;
 -- Serialize identical request keys across both the generic and QR recording flows.
 v_id:=public.roomie_record_settlement(p_household,p_recipient,p_amount,p_date,p_request);
 select receipt_path,status into v_receipt,v_status from public.settlements where id=v_id for update;
 if v_receipt is not null and v_receipt<>p_receipt then raise exception 'Request already used with another receipt' using errcode='22023'; end if;
 if v_receipt is null and v_status<>'pending' then raise exception 'Repayment already decided' using errcode='40001'; end if;
 update public.settlements set receipt_path=p_receipt,receipt_object_id=v_object where id=v_id and receipt_path is null;
 return v_id;
end; $$;
revoke all on function public.roomie_record_qr_settlement(uuid,uuid,bigint,date,text,text) from public,anon;
grant execute on function public.roomie_record_qr_settlement(uuid,uuid,bigint,date,text,text) to authenticated;
commit;
