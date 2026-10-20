begin;
-- Private, account-owned images. No public URLs or household sharing.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('payment-qr','payment-qr',false,5242880,array['image/png','image/jpeg']);
create policy roomie_qr_read on storage.objects for select to authenticated
 using(bucket_id='payment-qr' and name=(select auth.uid())::text||'/payment-qr');
create policy roomie_qr_insert on storage.objects for insert to authenticated
 with check(bucket_id='payment-qr' and name=(select auth.uid())::text||'/payment-qr');
create policy roomie_qr_update on storage.objects for update to authenticated
 using(bucket_id='payment-qr' and name=(select auth.uid())::text||'/payment-qr')
 with check(bucket_id='payment-qr' and name=(select auth.uid())::text||'/payment-qr');
create policy roomie_qr_remove on storage.objects for delete to authenticated
 using(bucket_id='payment-qr' and name=(select auth.uid())::text||'/payment-qr');
commit;
