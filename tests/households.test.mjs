import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { invitationCode } from '../src/features/households/validation.ts';
const users = ['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004'];
test('invitation codes and links normalize without navigating to pasted URLs', () => {
 const code='A'.repeat(32);
 assert.equal(invitationCode(' '+code.toLowerCase()+' '),code);
 assert.equal(invitationCode('roomie://join?code='+code),code);
 assert.equal(invitationCode('https://roomie.example/join?code='+code),code);
 for (const input of ['', 'short', 'javascript:alert(1)', 'roomie://profile?code='+code, 'https://example.com/login?code='+code, 'roomie://join?code=bad']) assert.throws(() => invitationCode(input));
});
test('household migration: RPC authorization, privacy, and redemption invariants', async t => {
 const db = new PGlite();
 try {
  await db.exec(`create role anon nologin; create role authenticated nologin; create schema auth;
   create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
   grant usage on schema public,auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261008000100_profiles.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/20261009000100_households.sql',import.meta.url),'utf8'));
  for (const [i,id] of users.entries()) await db.query('insert into auth.users values ($1,$2)',[id,{display_name:'Member '+i}]);
  const as = (user,sql,params=[],role='authenticated') => db.transaction(async tx => {
   await tx.exec(`set local role ${role}`);
   await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);
   return tx.query(sql,params);
  });
  const create = async user => (await as(user,'select public.roomie_create_household($1) as id',['  Apartment  '])).rows[0].id;
  const invite = async (owner,house,uses=5) => (await as(owner,'select * from public.roomie_create_invite($1,$2,7)',[house,uses])).rows[0];
  const join = (user,code) => as(user,'select public.roomie_join_household($1) as id',[code]);
  const house = await create(users[0]); const other = await create(users[2]);
  const denied=e => e.code==='42501'; const invalid=e => e.code==='22023';
  await t.test('creation atomically inserts the owner and trims the name', async () => {
   const row=(await db.query('select * from public.households where id=$1',[house])).rows[0];
   assert.equal(row.name,'Apartment'); assert.equal(row.currency,'MYR');
   const members=(await db.query('select * from public.household_members where household_id=$1',[house])).rows;
   assert.equal(members.length,1); assert.equal(members[0].role,'owner');
   await assert.rejects(as(users[0],'select public.roomie_create_household($1)',[' ']),invalid);
   await assert.rejects(as('','select public.roomie_create_household($1)',['Bad'],'anon'),denied);
  });
  await t.test('outsiders cannot read a household, its members, or invite tokens',async () => {
   for (const table of ['households','household_members','household_invites']) {
    const rows=(await as(users[3],`select * from public.${table}`)).rows; assert.equal(rows.length,0);
    await assert.rejects(as('',`select * from public.${table}`,[],'anon'),denied);
   }
   await assert.rejects(as(users[3],'select public.roomie_create_invite($1,5,7)',[house]),denied);
   await assert.rejects(as(users[0],'select public.roomie_rename_household($1,$2)',[other,'Hacked']),denied);
  });
  const invitation = await invite(users[0],house,1);
  await t.test('redemption joins once and repeated redemption never consumes another use',async () => {
   assert.equal((await join(users[1],invitation.code.toLowerCase())).rows[0].id,house);
   assert.equal((await join(users[1],invitation.code)).rows[0].id,house);
   const usage=(await db.query('select use_count from public.household_invites where id=$1',[invitation.id])).rows[0].use_count;
   assert.equal(usage,1);
   await assert.rejects(join(users[3],invitation.code),invalid);
   assert.equal((await db.query('select count(*)::int as n from public.household_members where household_id=$1 and user_id=$2',[house,users[1]])).rows[0].n,1);
  });
  await t.test('members can read peers but cannot edit them or manage invitations',async () => {
   assert.equal((await as(users[1],'select * from public.household_members where household_id=$1',[house])).rows.length,2);
   const profiles=(await as(users[1],'select id from public.profiles')).rows.map(p=>p.id).sort();
   assert.deepEqual(profiles,[users[0],users[1]]);
   assert.equal((await as(users[1],'update public.profiles set display_name=$1 where id=$2 returning id',['Hacked',users[0]])).rows.length,0);
   assert.equal((await as(users[1],'select * from public.household_invites')).rows.length,0);
   await assert.rejects(as(users[1],'select public.roomie_revoke_invite($1)',[invitation.id]),denied);
   await assert.rejects(as(users[1],'select public.roomie_rename_household($1,$2)',[house,'Hacked']),denied);
  });
  await t.test('all direct household writes are denied, including role escalation',async () => {
   await assert.rejects(as(users[1],"update public.household_members set role='owner' where user_id=$1",[users[1]]),denied);
   await assert.rejects(as(users[0],"update public.household_invites set use_count=0"),denied);
   await assert.rejects(as(users[0],"delete from public.households"),denied);
   await assert.rejects(as(users[0],"insert into public.households(name,created_by) values ('Bypass',$1)",[users[0]]),denied);
  });
  await t.test('invalid, expired, and revoked invitations have no membership effects',async () => {
   await assert.rejects(join(users[3],'UNKNOWN'),invalid);
   const expired=await invite(users[0],house);
   await db.query("update public.household_invites set created_at=now()-interval '2 days',expires_at=now()-interval '1 day' where id=$1",[expired.id]);
   await assert.rejects(join(users[3],expired.code),invalid);
   const revoked=await invite(users[0],house);
   await as(users[0],'select public.roomie_revoke_invite($1)',[revoked.id]);
   await assert.rejects(join(users[3],revoked.code),invalid);
   assert.equal((await db.query('select count(*)::int as n from public.household_members where household_id=$1 and user_id=$2',[house,users[3]])).rows[0].n,0);
   await assert.rejects(as(users[0],'select public.roomie_create_invite($1,0,7)',[house]),invalid);
  });
  await t.test('simultaneously requested last-use redemptions yield only one successful join',async () => {
   const limit=await invite(users[2],other,1);
   // PGlite serializes transactions on one connection; hosted multi-connection contention still needs verification.
   const results=await Promise.allSettled([join(users[0],limit.code),join(users[3],limit.code)]);
   assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
   assert.equal((await db.query('select use_count from public.household_invites where id=$1',[limit.id])).rows[0].use_count,1);
  });
  await t.test('ended memberships lose access, retain identity, and cannot silently rejoin',async () => {
   await db.query("update public.household_members set status='left',left_at=now() where household_id=$1 and user_id=$2",[house,users[1]]);
   assert.equal((await as(users[1],'select * from public.households where id=$1',[house])).rows.length,0);
   assert.equal((await as(users[1],'select * from public.profiles where id=$1',[users[0]])).rows.length,0);
   const fresh=await invite(users[0],house);
   await assert.rejects(join(users[1],fresh.code),invalid);
   await assert.rejects(db.query('delete from public.profiles where id=$1',[users[1]]),e=>e.code==='23001');
  });
  await t.test('owner can rename a household but not change its currency',async () => {
   await as(users[0],'select public.roomie_rename_household($1,$2)',[house,'Our home']);
   assert.equal((await db.query('select name from public.households where id=$1',[house])).rows[0].name,'Our home');
   await assert.rejects(db.query("update public.households set currency='USD' where id=$1",[house]),e=>e.code==='23514');
  });
 } finally {await db.close();}
});
