import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { parseMinor,parseBps,safeMinor,splitExpense,validDate } from '../src/features/expenses/domain.ts';
test('money/date boundaries reject unsafe or ambiguous values',()=>{
 assert.equal(parseMinor('24.90'),2490); assert.equal(parseMinor('10000000.00'),1000000000); assert.equal(parseBps('25.00'),2500);
 for(const value of ['','-1','1e2','Infinity','NaN','0','1.001','10000000.01','01.00','1,000']) assert.throws(()=>parseMinor(value));
 assert.throws(()=>safeMinor('9007199254740993')); assert.throws(()=>parseBps('100.01'));
 assert.equal(validDate('2026-02-29'),false); assert.equal(validDate('2028-02-29'),true);
});
test('integer splitting is deterministic, exact, and zero-sum',()=>{
 const people=[{member_id:'c'},{member_id:'a'},{member_id:'b'}];
 assert.deepEqual(splitExpense(10000,'equal',people).map(p=>p.owed_minor),[3334,3333,3333]);
 assert.deepEqual(splitExpense(2,'equal',people).map(p=>p.owed_minor),[1,1,0]);
 assert.throws(()=>splitExpense(100,'exact',[{member_id:'a',value:99}]));
 assert.throws(()=>splitExpense(100,'percentage',[{member_id:'a',value:9999}]));
 assert.throws(()=>splitExpense(100,'equal',[{member_id:'a'},{member_id:'a'}]));
 for(let amount=1;amount<150;amount++) {
  const parts=[{member_id:'c',value:3333},{member_id:'a',value:3334},{member_id:'b',value:3333}];
  const result=splitExpense(amount,'percentage',parts);
  assert.equal(result.reduce((s,p)=>s+p.owed_minor,0),amount);
  assert.deepEqual(result,splitExpense(amount,'percentage',parts.reverse()));
 }
});
test('expense SQL enforces authorization, atomic money, revisions, and retries',async t=>{
 const db=new PGlite();
 try {
 await db.exec(`create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$;
 grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
 for(const file of ['20261008000100_profiles','20261009000100_households','20261012000100_expenses']) await db.exec(await readFile(new URL('../supabase/migrations/'+file+'.sql',import.meta.url),'utf8'));
 const users=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004'];
 for(const id of users) await db.query('insert into auth.users values($1,$2)',[id,{display_name:id.slice(-1)}]);
 const as=(user,sql,args=[],role='authenticated')=>db.transaction(async tx=>{await tx.exec(`set local role ${role}`);await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);return tx.query(sql,args);});
 const house=(await as(users[0],"select public.roomie_create_household('Home') id")).rows[0].id;
 const other=(await as(users[3],"select public.roomie_create_household('Other') id")).rows[0].id;
 const code=(await as(users[0],'select * from public.roomie_create_invite($1)',[house])).rows[0].code;
 for(const id of users.slice(1,3)) await as(id,'select public.roomie_join_household($1)',[code]);
 const members=(await db.query('select * from public.household_members where household_id=$1 order by id',[house])).rows;
 const foreign=(await db.query('select id from public.household_members where household_id=$1',[other])).rows[0].id;
 const parts=members.map(p=>({member_id:p.id}));
 let serial=0;
 const create=(user=users[1],amount=10000,method='equal',participants=parts,request='request-'+(++serial),payers=[{member_id:members[0].id,value:amount}])=>as(user,'select public.roomie_create_expense($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) id',[house,'Groceries','Groceries',amount,'2026-10-12','Notes',method,payers,participants,request]);
 const id=(await create()).rows[0].id;
 const update=(user,version,amount=9999)=>as(user,'select public.roomie_update_expense($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[id,house,'Edited','Utilities',amount,'2026-10-11','Changed','equal',[{member_id:members[0].id,value:amount}],parts,version]);
 const denied=e=>e.code==='42501',invalid=e=>e.code==='22023',conflict=e=>e.code==='40001';
 await t.test('shares match client deterministic rounding and payer totals',async()=>{
  const rows=(await db.query('select * from public.expense_splits where expense_id=$1 order by member_id',[id])).rows;
  assert.deepEqual(rows.map(p=>Number(p.owed_minor)),splitExpense(10000,'equal',parts).map(p=>p.owed_minor));
  assert.equal((await db.query('select count(*)::int n from public.expense_revisions')).rows[0].n,1);
  const percent=parts.map((p,i)=>({...p,value:i===0?3334:3333}));
  const pid=(await create(users[1],101,'percentage',percent)).rows[0].id;
  assert.deepEqual((await db.query('select owed_minor from public.expense_splits where expense_id=$1 order by member_id',[pid])).rows.map(p=>Number(p.owed_minor)),splitExpense(101,'percentage',percent).map(p=>p.owed_minor));
  const tiny=(await create(users[1],1)).rows[0].id;
  assert.equal((await db.query('select sum(owed_minor)::int n from public.expense_splits where expense_id=$1',[tiny])).rows[0].n,1);
 });
 await t.test('invalid totals, foreign and duplicate members roll back all effects',async()=>{
  const before=(await db.query('select count(*)::int n from public.expenses')).rows[0].n;
  await assert.rejects(create(users[1],100,'exact',parts.map(p=>({...p,value:10}))),invalid);
  await assert.rejects(create(users[1],100,'percentage',parts.map(p=>({...p,value:3000}))),invalid);
  await assert.rejects(create(users[1],100,'equal',[{member_id:foreign}]),invalid);
  await assert.rejects(create(users[1],100,'equal',[parts[0],parts[0]]),invalid);
  await assert.rejects(create(users[1],100,'equal',parts,'badpay',[{member_id:members[0].id,value:99}]),invalid);
  await assert.rejects(create(users[1],100,'exact',[{member_id:members[0].id,value:100.1}]),invalid);
  assert.equal((await db.query('select count(*)::int n from public.expenses')).rows[0].n,before);
 });
 await t.test('duplicate create retries have exactly one financial and audit effect',async()=>{
  const a=(await create(users[1],100,'equal',parts,'stable')).rows[0].id;
  const b=(await create(users[1],100,'equal',parts,'stable')).rows[0].id;assert.equal(a,b);
  await assert.rejects(create(users[1],101,'equal',parts,'stable'),invalid);
  assert.equal((await db.query('select count(*)::int n from public.expense_revisions where expense_id=$1',[a])).rows[0].n,1);
 });
 await t.test('outsiders and anonymous users cannot read or mutate expenses or history',async()=>{
  for(const table of ['expenses','expense_payers','expense_splits','expense_revisions','activity_events']) {
   assert.equal((await as(users[3],'select * from public.'+table)).rows.length,0);
   await assert.rejects(as('','select * from public.'+table,[],'anon'),denied);
   await assert.rejects(as(users[0],'delete from public.'+table),denied);
  }
  await assert.rejects(create(users[3]),denied);await assert.rejects(update(users[2],1),denied);
  await assert.rejects(as(users[1],"select roomie_private.audit_expense($1,'edited')",[id]),denied);
 });
 await t.test('creator and owner edits retain snapshots and reject stale versions',async()=>{
  await update(users[1],1);await assert.rejects(update(users[0],1),conflict);await update(users[0],2,10001);
  const history=(await db.query('select * from public.expense_revisions where expense_id=$1 order by version',[id])).rows;
  assert.equal(history.length,3);assert.equal(history[0].snapshot.expense.amount_minor,10000);assert.equal(history[1].snapshot.expense.amount_minor,9999);
  assert.equal(history[2].snapshot.splits.reduce((sum,p)=>sum+Number(p.owed_minor),0),10001);
 });
 await t.test('void is authorized, retry-safe, permanent, and preserves financial references',async()=>{
  await assert.rejects(as(users[2],'select public.roomie_void_expense($1,3,$2)',[id,'Mistake']),denied);
  await as(users[1],'select public.roomie_void_expense($1,3,$2)',[id,'Mistake']);await as(users[1],'select public.roomie_void_expense($1,3,$2)',[id,'Mistake']);
  await assert.rejects(update(users[0],4),conflict);
  assert.equal((await db.query('select count(*)::int n from public.expense_revisions where expense_id=$1',[id])).rows[0].n,4);
  assert.equal((await db.query('select count(*)::int n from public.expense_splits where expense_id=$1',[id])).rows[0].n,3);
  assert.equal((await db.query('select status from public.expenses where id=$1',[id])).rows[0].status,'void');
 });
 await t.test('multiple payers and exact shares retain a zero-sum posted ledger',async()=>{
  const multi=(await create(users[0],100,'exact',parts.map((p,i)=>({...p,value:i===0?40:30})),'multi',[{member_id:members[0].id,value:60},{member_id:members[1].id,value:40}])).rows[0].id;
  assert.equal((await db.query('select count(*)::int n from public.expense_payers where expense_id=$1',[multi])).rows[0].n,2);
  const totals=await db.query("select (select coalesce(sum(paid_minor),0) from public.expense_payers p join public.expenses e on e.id=p.expense_id where e.status='posted')-(select coalesce(sum(owed_minor),0) from public.expense_splits s join public.expenses e on e.id=s.expense_id where e.status='posted') as net");
  assert.equal(Number(totals.rows[0].net),0);
  await assert.rejects(db.query('update public.expenses set amount_minor=101 where id=$1',[multi]),e=>e.code==='23514');
  assert.equal(Number((await db.query('select amount_minor from public.expenses where id=$1',[multi])).rows[0].amount_minor),100);
 });
 await t.test('contending versioned edits allow only one revision',async()=>{
  const cid=(await create(users[0],100)).rows[0].id;
  const args=[cid,house,'Concurrent','Other',100,'2026-10-12','','equal',[{member_id:members[0].id,value:100}],parts,1];
  const sql='select public.roomie_update_expense($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)';
  const results=await Promise.allSettled([as(users[0],sql,args),as(users[0],sql,args)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.find(r=>r.status==='rejected').reason.code,'40001');
  assert.equal((await db.query('select count(*)::int n from public.expense_revisions where expense_id=$1',[cid])).rows[0].n,2);
 });
 await t.test('ended members lose financial access without deleting history',async()=>{
  await db.query("update public.household_members set status='left',left_at=now() where user_id=$1 and household_id=$2",[users[1],house]);
  assert.equal((await as(users[1],'select * from public.expense_revisions')).rows.length,0);
  await assert.rejects(create(users[1]),denied);
  await assert.rejects(db.query('delete from public.household_members where id=$1',[members.find(m=>m.user_id===users[1]).id]),e=>['23503','23001'].includes(e.code));
 });
 } finally {await db.close();}
});

test('SQL Editor fallback applies the exact migration and history atomically',async()=>{
 const db=new PGlite();
 try {
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql as $$select null::uuid;$$;
 create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);`);
 for(const file of ['20261008000100_profiles','20261009000100_households']) await db.exec(await readFile(new URL('../supabase/migrations/'+file+'.sql',import.meta.url),'utf8'));
 const source=await readFile(new URL('../supabase/migrations/20261012000100_expenses.sql',import.meta.url),'utf8');
 const fallback=await readFile(new URL('../docs/supabase-dashboard-expenses.sql',import.meta.url),'utf8');
 await db.exec(fallback);
 const row=(await db.query("select * from supabase_migrations.schema_migrations where version='20261012000100'")).rows[0];
 assert.equal(row.name,'expenses');assert.equal(row.statements[0],source);
 assert.equal((await db.query("select to_regclass('public.expenses') is not null present")).rows[0].present,true);
 }finally{await db.close();}
});
