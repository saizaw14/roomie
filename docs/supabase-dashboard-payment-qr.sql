-- Run this file once to enable private QR image storage.
begin;
set local lock_timeout='4s';
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

insert into supabase_migrations.schema_migrations(version,name,statements) values('20261020000100','payment_qr',array[$roomie_qr$-- Private, account-owned images. No public URLs or household sharing.
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
$roomie_qr$]);
commit;
select version,name from supabase_migrations.schema_migrations where version='20261020000100';
