import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('unified inbox targets affected users, keeps read state, deduplicates and expires due-bill actions',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$;
  grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
  create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);`);
  for(const name of ['20261008000100_profiles','20261009000100_households','20261012000100_expenses','20261015000100_household_currencies','20261019000100_settlements','20261023000100_recurring_bills'])await db.exec(await readFile(new URL(`../supabase/migrations/${name}.sql`,import.meta.url),'utf8'));
  // Storage is outside this inbox test; the existing receipt-notification trigger needs its attachment column.
  await db.exec('alter table public.settlements add column receipt_path text;');
  await db.exec(await readFile(new URL('../supabase/migrations/20261022000100_receipt_notifications.sql',import.meta.url),'utf8'));
  const users=Array.from({length:3},(_,i)=>`00000000-0000-4000-8000-00000000000${i+1}`);
  for(const [i,id] of users.entries())await db.query('insert into auth.users values($1,$2)',[id,{display_name:['Owner','Member','Outsider'][i]}]);
  const as=(user,sql,args=[],role='authenticated')=>db.transaction(async tx=>{await tx.exec(`set local role ${role}`);await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);return tx.query(sql,args);});
  const house=(await as(users[0],"select public.roomie_create_household('Home','MYR') id")).rows[0].id;
  const code=(await as(users[0],'select * from public.roomie_create_invite($1)',[house])).rows[0].code;
  await as(users[1],'select public.roomie_join_household($1)',[code]);
  const members=(await db.query('select * from public.household_members where household_id=$1 order by user_id',[house])).rows;
  const owner=members[0].id,member=members[1].id;
  const payment=(await as(users[1],"select public.roomie_record_settlement($1,$2,100,'2024-01-01','before') id",[house,owner])).rows[0].id;
  await db.query("update public.settlements set receipt_path='before.png' where id=$1",[payment]);
  // The table is deliberately private; mark the legacy row using its RPC with a privileged lookup only in the test.
  const legacy=(await db.query('select id from public.receipt_notifications')).rows[0].id;
  await as(users[0],'select public.roomie_read_receipt_notification($1)',[legacy]);
  const waiting=(await as(users[1],"select public.roomie_record_settlement($1,$2,50,'2024-01-01','waiting') id",[house,owner])).rows[0].id;
  const fallback=await readFile(new URL('../docs/supabase-dashboard-action-notifications.sql',import.meta.url),'utf8');await db.exec(fallback);
  const source=await readFile(new URL('../supabase/migrations/20261110000100_action_notifications.sql',import.meta.url),'utf8');assert.equal(fallback.split('$roomie_action_notifications$')[1].trim(),source.slice(6,source.lastIndexOf('commit;')).trim());
  const inbox=async user=>(await as(user,'select public.roomie_notifications() data')).rows[0].data;
  assert.ok((await inbox(users[0])).find(n=>n.id===legacy).read_at);
  await db.query("update public.settlements set receipt_path='late.png' where id=$1",[waiting]);assert.equal((await inbox(users[0])).filter(n=>n.entity_id===waiting).length,1);
  assert.deepEqual(await inbox(users[2]),[]);await assert.rejects(as('','select public.roomie_notifications()',[],'anon'));
  await assert.rejects(as(users[1],'select * from public.app_notifications'));
  await as(users[0],'select public.roomie_decide_settlement($1,true)',[payment]);
  assert.equal((await inbox(users[1])).filter(n=>n.kind==='payment_confirmed').length,1);
  assert.equal((await inbox(users[0])).find(n=>n.id===legacy).requires_action,false);
  await as(users[0],'select public.roomie_decide_settlement($1,true)',[payment]);
  assert.equal((await inbox(users[1])).filter(n=>n.kind==='payment_confirmed').length,1);
  const second=(await as(users[1],"select public.roomie_record_settlement($1,$2,90,'2024-01-01','after') id",[house,owner])).rows[0].id;
  await db.query("update public.settlements set receipt_path='after.png' where id=$1",[second]);
  assert.equal((await inbox(users[0])).filter(n=>n.entity_id===second).length,1);
  await as(users[0],'select public.roomie_decide_settlement($1,false)',[second]);
  assert.ok((await inbox(users[1])).find(n=>n.kind==='payment_rejected').requires_action);
  const expense=(await as(users[0],"select public.roomie_create_expense($1,'Food','Groceries',101,'2024-01-01','','equal',$2,$3,'food') id",[house,[{member_id:owner,value:101}],[{member_id:owner},{member_id:member}]] )).rows[0].id;
  assert.equal((await inbox(users[1])).filter(n=>n.entity_id===expense).length,1);
  assert.equal((await inbox(users[0])).filter(n=>n.entity_id===expense).length,0);
  await as(users[0],"select public.roomie_update_expense($1,$2,'Food updated','Groceries',101,'2024-01-01','','equal',$3,$4,1)",[expense,house,[{member_id:owner,value:101}],[{member_id:owner}]]);
  assert.ok((await inbox(users[1])).find(n=>n.entity_id===expense&&n.kind==='expense_edited'),'removed participant is notified');
  await as(users[0],"select public.roomie_rename_household($1,'New home')",[house]);
  assert.ok((await inbox(users[1])).find(n=>n.kind==='household_renamed'));
  const bill=(await as(users[0],"select public.roomie_create_bill($1,'Electricity','Utilities',100,'weekly','2024-01-01',$2,$3,'bill') id",[house,owner,[owner,member]])).rows[0].id;
  const due=(await inbox(users[0])).find(n=>n.kind==='bill_due');assert.ok(due.requires_action);
  assert.equal((await inbox(users[0])).filter(n=>n.kind==='bill_due').length,1);
  assert.equal((await inbox(users[1])).find(n=>n.kind==='bill_due').requires_action,false);
  await as(users[1],'select public.roomie_read_notification($1)',[due.id]);assert.equal((await inbox(users[0])).find(n=>n.id===due.id).read_at,null);
  await as(users[0],'select public.roomie_read_notification($1)',[due.id]);assert.ok((await inbox(users[0])).find(n=>n.id===due.id).read_at);
  await as(users[0],'select public.roomie_set_bill_active($1,false,1)',[bill]);
  assert.equal((await inbox(users[0])).filter(n=>n.kind==='bill_due').length,0);
  const thirdCode=(await as(users[0],'select * from public.roomie_create_invite($1)',[house])).rows[0].code;
  await as(users[2],'select public.roomie_join_household($1)',[thirdCode]);
  assert.ok((await inbox(users[0])).find(n=>n.kind==='member_joined'));
  await db.query("update public.household_members set status='left',left_at=now() where id=$1",[member]);
  assert.deepEqual(await inbox(users[1]),[]);assert.ok((await inbox(users[0])).find(n=>n.kind==='member_left'));
 }finally{await db.close();}
});
