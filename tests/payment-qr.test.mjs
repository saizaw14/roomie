import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { QR_MAX_BYTES,qrImageType } from '../src/features/profile/qr-image.ts';
test('QR image uploads enforce size and supported signatures',()=>{
 assert.equal(qrImageType(Uint8Array.from([137,80,78,71,13,10,26,10])),'image/png');
 assert.equal(qrImageType(Uint8Array.from([255,216,255,224])),'image/jpeg');
 for(const bytes of [new Uint8Array(),new Uint8Array(QR_MAX_BYTES+1),new TextEncoder().encode('<svg></svg>'),new TextEncoder().encode('GIF89a')])assert.throws(()=>qrImageType(bytes));
});
test('private QR storage policies isolate each user and restrict paths',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon nologin;create role authenticated nologin;create schema auth;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,unique(bucket_id,name));
 alter table storage.objects enable row level security;grant usage on schema storage,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;grant select,insert,update,delete on storage.objects to authenticated;grant select on storage.objects to anon;
 create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);`);
 const fallback=await readFile(new URL('../docs/supabase-dashboard-payment-qr.sql',import.meta.url),'utf8');await db.exec(fallback);
 const bucket=(await db.query("select * from storage.buckets where id='payment-qr'")).rows[0];assert.equal(bucket.public,false);assert.equal(Number(bucket.file_size_limit),QR_MAX_BYTES);assert.deepEqual(bucket.allowed_mime_types,['image/png','image/jpeg']);
 const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
 const as=(id,sql,args=[],role='authenticated')=>db.transaction(async tx=>{await tx.exec(`set local role ${role}`);await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);return tx.query(sql,args);});
 for(const id of [a,b])await as(id,"insert into storage.objects(bucket_id,name) values('payment-qr',$1)",[id+'/payment-qr']);
 assert.equal((await as(a,'select * from storage.objects')).rows.length,1);assert.equal((await as(b,'select * from storage.objects')).rows[0].name,b+'/payment-qr');assert.equal((await as('','select * from storage.objects',[],'anon')).rows.length,0);
 for(const path of [b+'/payment-qr',a+'/another-file',a+'/../'+b+'/payment-qr'])await assert.rejects(as(a,"insert into storage.objects(bucket_id,name) values('payment-qr',$1)",[path]));
 assert.equal((await as(a,'update storage.objects set name=name where name=$1 returning id',[b+'/payment-qr'])).rows.length,0);
 await assert.rejects(as(a,'update storage.objects set name=$1 where name=$2',[b+'/hijacked',a+'/payment-qr']));
 assert.equal((await as(a,'delete from storage.objects where name=$1 returning id',[b+'/payment-qr'])).rows.length,0);
 assert.equal((await as(a,'update storage.objects set name=name where name=$1 returning id',[a+'/payment-qr'])).rows.length,1);
 assert.equal((await as(a,'delete from storage.objects where name=$1 returning id',[a+'/payment-qr'])).rows.length,1);
 const migration=await readFile(new URL('../supabase/migrations/20261020000100_payment_qr.sql',import.meta.url),'utf8');assert.equal(fallback.split('$roomie_qr$')[1].trim(),migration.slice(7,migration.lastIndexOf('commit;')).trim());
 }finally{await db.close();}
});
