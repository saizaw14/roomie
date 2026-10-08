import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const alex = '00000000-0000-0000-0000-000000000001';
const blair = '00000000-0000-0000-0000-000000000002';
const casey = '00000000-0000-0000-0000-000000000003';

test('profile migration and authorization in isolated PostgreSQL', async t => {
  const db = new PGlite();
  try {
    // Minimal Supabase Auth fixture, not a hosted Auth emulator.
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create schema auth;
      create table auth.users (id uuid primary key, raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
      grant usage on schema public, auth to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;
    `);
    await db.query('insert into auth.users values ($1, $2)', [alex, { display_name: 'Alex' }]);
    await db.exec(await readFile(new URL('../supabase/migrations/20261008000100_profiles.sql', import.meta.url), 'utf8'));
    await db.query('insert into auth.users values ($1, $2), ($3, $4)',
      [blair, { display_name: ' Blair ' }, casey, { display_name: ' '.repeat(10) }]);
    async function asUser(id, action, role = 'authenticated') {
      return db.transaction(async tx => {
        await tx.exec(`set local role ${role}`);
        await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [id]);
        return action(tx);
      });
    }
    const denied = error => error.code === '42501';
    await t.test('existing accounts are backfilled and new accounts create valid profiles', async () => {
      const { rows } = await db.query('select id, display_name from public.profiles order by id');
      assert.deepEqual(rows, [{ id: alex, display_name: 'Alex' }, { id: blair, display_name: 'Blair' }, { id: casey, display_name: 'Roomie member' }]);
    });
    await t.test('anonymous access is denied', async () => {
      await assert.rejects(asUser('', tx => tx.query('select * from public.profiles'), 'anon'), denied);
    });
    await t.test('each member can read only their own profile', async () => {
      const { rows } = await asUser(alex, tx => tx.query('select * from public.profiles'));
      assert.equal(rows.length, 1);
      assert.equal(rows[0].id, alex);
      const other = await asUser(blair, tx => tx.query('select * from public.profiles where id = $1', [alex]));
      assert.equal(other.rows.length, 0);
    });
    await t.test('self updates work and preserve server-controlled metadata', async () => {
      const before = (await db.query('select * from public.profiles where id=$1', [alex])).rows[0];
      const { rows } = await asUser(alex, tx => tx.query('update public.profiles set display_name=$1 where id=$2 returning *', [' Alex Tan ', alex]));
      assert.equal(rows[0].display_name, 'Alex Tan');
      assert.deepEqual(rows[0].created_at, before.created_at);
      assert.ok(rows[0].updated_at >= before.updated_at);
      await assert.rejects(asUser(alex, tx => tx.query('update public.profiles set created_at=now() where id=$1', [alex])), denied);
      await assert.rejects(asUser(alex, tx => tx.query('update public.profiles set id=$1 where id=$2', [casey, alex])), denied);
    });
    await t.test('cross-user edits and inserts are denied', async () => {
      const { rows } = await asUser(alex, tx => tx.query('update public.profiles set display_name=$1 where id=$2 returning id', ['Hacked', blair]));
      assert.equal(rows.length, 0);
      await db.query('delete from public.profiles where id=$1', [casey]);
      await assert.rejects(asUser(alex, tx => tx.query('insert into public.profiles (id, display_name) values ($1,$2)', [casey, 'Casey'])), denied);
      await asUser(casey, tx => tx.query('insert into public.profiles (id, display_name) values ($1,$2)', [casey, 'Casey']));
    });
    await t.test('blank and oversized names are rejected by the database', async () => {
      for (const name of ['', '   ', 'a'.repeat(81)]) {
        await assert.rejects(asUser(alex, tx => tx.query('update public.profiles set display_name=$1 where id=$2', [name, alex])), error => error.code === '23514');
      }
    });
    await t.test('profile deletion and direct trigger-function invocation are denied', async () => {
      await assert.rejects(asUser(alex, tx => tx.query('delete from public.profiles where id=$1', [alex])), denied);
      await assert.rejects(asUser(alex, tx => tx.query('select public.roomie_create_profile()')), denied);
    });
    await t.test('profile references prevent silent identity deletion', async () => {
      await assert.rejects(db.query('delete from auth.users where id=$1', [alex]), error => error.code === '23001');
    });
  } finally { await db.close(); }
});
