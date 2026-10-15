import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { currencies,currencyInfo } from '../src/utils/currencies.ts';
import { parseMinor,parseBps,decimal,money } from '../src/features/expenses/domain.ts';
test('ISO currency parsing uses zero, two, three, and four decimal units',()=>{
 assert.equal(parseMinor('125',false,'JPY'),125);assert.throws(()=>parseMinor('125.01',false,'JPY'));
 assert.equal(parseMinor('12.34',false,'USD'),1234);assert.equal(money(1234,'USD'),'USD 12.34');
 assert.equal(parseMinor('1.234',false,'KWD'),1234);assert.equal(decimal(1234,'KWD'),'1.234');
 assert.equal(parseMinor('1.2345',false,'CLF'),12345);assert.equal(money(125,'JPY'),'JPY 125');
 assert.throws(()=>parseMinor('1.2345',false,'KWD'));assert.throws(()=>currencyInfo('BTC'));
 assert.equal(parseBps('33.33'),3333);assert.equal(currencies.length,165);
});
test('household currencies migrate existing data and enforce server consistency',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$;grant usage on schema public,auth to authenticated;grant execute on function auth.uid() to authenticated;
 create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);`);
 for(const name of ['20261008000100_profiles','20261009000100_households','20261012000100_expenses'])await db.exec(await readFile(new URL('../supabase/migrations/'+name+'.sql',import.meta.url),'utf8'));
 const user='00000000-0000-4000-8000-000000000001';await db.query('insert into auth.users values($1,$2)',[user,{}]);
 const as=(sql,args=[])=>db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);return tx.query(sql,args);});
 const old=(await as("select public.roomie_create_household('Existing') id")).rows[0].id;
 const fallback=await readFile(new URL('../docs/supabase-dashboard-currencies.sql',import.meta.url),'utf8');await db.exec(fallback);
 assert.equal((await db.query('select currency from public.households where id=$1',[old])).rows[0].currency,'MYR');
 const stored=(await db.query("select statements from supabase_migrations.schema_migrations where version='20261015000100'")).rows[0].statements[0];
 assert.equal(stored,await readFile(new URL('../supabase/migrations/20261015000100_household_currencies.sql',import.meta.url),'utf8'));
 const catalog=(await as('select * from public.supported_currencies order by code')).rows;assert.deepEqual(catalog.map(c=>[c.code,c.minor_digits]),currencies.map(c=>[c.code,c.decimals]));
 for(const currency of ['JPY','USD','KWD','CLF']){
  const house=(await as('select public.roomie_create_household($1,$2) id',['Home',currency])).rows[0].id;
  const member=(await db.query('select id from public.household_members where household_id=$1',[house])).rows[0].id;
  const expense=(await as('select public.roomie_create_expense($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) id',[house,'Food','Groceries',123,'2026-10-15','','equal',[{member_id:member,value:123}],[{member_id:member}],currency])).rows[0].id;
  assert.equal((await db.query('select currency from public.expenses where id=$1',[expense])).rows[0].currency,currency);
  await assert.rejects(db.query("update public.expenses set currency='MYR' where id=$1",[expense]),e=>e.code==='22023');
  await assert.rejects(db.query("update public.households set currency='MYR' where id=$1",[house]),e=>e.code==='22023');
 }
 await assert.rejects(as("select public.roomie_create_household('Bad','BTC')"),e=>e.code==='22023');
 await assert.rejects(as("insert into public.supported_currencies values('BTC','Bitcoin',4)"),e=>e.code==='42501');
 }finally{await db.close();}
});
