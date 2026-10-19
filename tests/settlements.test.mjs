import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { settlementSuggestions } from '../src/features/settlements/domain.ts';

test('deterministic settlement routes preserve each balance and ignore input order',()=>{
 const balances=[{member_id:'c',net:-700},{member_id:'a',net:1000},{member_id:'b',net:-300}].map(b=>({...b,user_id:b.member_id,status:'active'}));
 const before=structuredClone(balances);const routes=settlementSuggestions(balances);
 assert.deepEqual(routes,settlementSuggestions([...balances].reverse()));assert.deepEqual(balances,before);
 const nets=new Map(balances.map(b=>[b.member_id,b.net]));for(const route of routes){assert.ok(route.amount>0);nets.set(route.sender,nets.get(route.sender)+route.amount);nets.set(route.recipient,nets.get(route.recipient)-route.amount);}assert.ok([...nets.values()].every(n=>n===0));
 assert.deepEqual(settlementSuggestions([]),[]);
 assert.throws(()=>settlementSuggestions([{...balances[0],net:1}]));
 assert.throws(()=>settlementSuggestions([{...balances[0],net:NaN}]));
 assert.throws(()=>settlementSuggestions([balances[0],balances[0]]));
});
test('settlement RPC authorization, exactly-once decisions, and derived balances',async t=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$;
 grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
 const migrations=['20261008000100_profiles','20261009000100_households','20261012000100_expenses','20261015000100_household_currencies','20261019000100_settlements'];
 await db.exec('create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);');
 for(const file of migrations)await db.exec(await readFile(new URL(file==='20261019000100_settlements'?'../docs/supabase-dashboard-settlements.sql':'../supabase/migrations/'+file+'.sql',import.meta.url),'utf8'));
 assert.equal((await db.query("select name from supabase_migrations.schema_migrations where version='20261019000100'")).rows[0].name,'settlements');
 const users=Array.from({length:4},(_,i)=>`00000000-0000-4000-8000-00000000000${i+1}`);
 for(const id of users)await db.query('insert into auth.users values($1,$2)',[id,{display_name:id.slice(-1)}]);
 const as=(user,sql,args=[],role='authenticated')=>db.transaction(async tx=>{await tx.exec(`set local role ${role}`);await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);return tx.query(sql,args);});
 const house=(await as(users[0],"select public.roomie_create_household('Home','USD') id")).rows[0].id;
 const code=(await as(users[0],'select * from public.roomie_create_invite($1)',[house])).rows[0].code;
 for(const user of users.slice(1,3))await as(user,'select public.roomie_join_household($1)',[code]);
 const members=(await db.query('select * from public.household_members where household_id=$1',[house])).rows;
 const member=user=>members.find(m=>m.user_id===user).id;
 await as(users[0],'select public.roomie_create_expense($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[house,'Rent','Rent',9000,'2000-01-01','','equal',[{member_id:member(users[1]),value:9000}],members.map(m=>({member_id:m.id})),'expense']);
 const snapshot=async user=>(await as(user,'select public.roomie_settlement_dashboard($1) data',[house])).rows[0].data;
 const net=(data,user)=>Number(data.balances.find(b=>b.user_id===user).net);
 const record=(user=users[2],recipient=member(users[1]),amount=3000,key='payment')=>as(user,'select public.roomie_record_settlement($1,$2,$3,$4,$5) id',[house,recipient,amount,'2000-01-01',key]);
 const id=(await record()).rows[0].id;
 await t.test('pending has no balance effect and retries return the same record',async()=>{
  const data=await snapshot(users[2]);assert.equal(net(data,users[1]),6000);assert.equal(net(data,users[2]),-3000);assert.equal(data.settlements[0].status,'pending');assert.equal(data.settlements[0].currency,'USD');
  assert.equal((await record()).rows[0].id,id);await assert.rejects(record(users[2],member(users[1]),3001));
 });
 await t.test('only recipient can decide; owner, sender, outsider and anon cannot',async()=>{
  for(const user of [users[0],users[2],users[3]])await assert.rejects(as(user,'select public.roomie_decide_settlement($1,true)',[id]));
  await assert.rejects(as('','select public.roomie_decide_settlement($1,true)',[id],'anon'));
  await assert.rejects(snapshot(users[3]));assert.equal((await as(users[3],'select * from public.settlements')).rows.length,0);
  await assert.rejects(as(users[1],"update public.settlements set status='confirmed' where id=$1",[id]));
  await assert.rejects(as(users[1],'delete from public.settlements where id=$1',[id]));
 });
 await t.test('confirmation changes both balances once and is terminal',async()=>{
  await as(users[1],'select public.roomie_decide_settlement($1,true)',[id]);await as(users[1],'select public.roomie_decide_settlement($1,true)',[id]);
  const data=await snapshot(users[2]);assert.equal(net(data,users[2]),0);assert.equal(net(data,users[1]),3000);assert.equal(data.balances.reduce((sum,b)=>sum+Number(b.net),0),0);
  await assert.rejects(as(users[1],'select public.roomie_decide_settlement($1,false)',[id]));
  assert.equal((await db.query("select count(*)::int n from public.activity_events where entity_id=$1 and event_type='settlement_confirmed'",[id])).rows[0].n,1);
 });
 await t.test('rejection has no financial effect and cannot later be confirmed',async()=>{
  const rejected=(await record(users[0],member(users[1]),1000,'reject')).rows[0].id;
  await as(users[1],'select public.roomie_decide_settlement($1,false)',[rejected]);await as(users[1],'select public.roomie_decide_settlement($1,false)',[rejected]);
  assert.equal(net(await snapshot(users[0]),users[0]),-3000);await assert.rejects(as(users[1],'select public.roomie_decide_settlement($1,true)',[rejected]));
 });
 await t.test('identity, amount, date, cross-household and membership checks are enforced',async()=>{
  await assert.rejects(record(users[2],member(users[2]),100,'self'));await assert.rejects(record(users[3],member(users[1]),100,'outsider'));
  for(const amount of [0,-1,1000000001])await assert.rejects(record(users[2],member(users[1]),amount,'invalid'+amount));
  await assert.rejects(as(users[2],'select public.roomie_record_settlement($1,$2,10,$3,$4)',[house,member(users[1]),'2100-12-31','future']));
  const other=(await as(users[3],"select public.roomie_create_household('Other','JPY') id")).rows[0].id;
  const foreign=(await db.query('select id from public.household_members where household_id=$1',[other])).rows[0].id;await assert.rejects(record(users[2],foreign,100,'foreign'));
  await db.query("update public.household_members set status='left',left_at=now() where id=$1",[member(users[2])]);await assert.rejects(record());await assert.rejects(snapshot(users[2]));
  const retained=await snapshot(users[1]);assert.equal(retained.balances.find(b=>b.user_id===users[2]).status,'left');assert.equal(retained.settlements.some(s=>s.id===id),true);
 });
 }finally{await db.close();}
});
test('dashboard fallback applies exact migration and records its history',async()=>{
 const source=await readFile(new URL('../supabase/migrations/20261019000100_settlements.sql',import.meta.url),'utf8');const fallback=await readFile(new URL('../docs/supabase-dashboard-settlements.sql',import.meta.url),'utf8');
 assert.equal(fallback.split('$roomie_settlements$')[1].trim(),source.slice('begin;\n'.length,source.lastIndexOf('commit;')).trim());
});
