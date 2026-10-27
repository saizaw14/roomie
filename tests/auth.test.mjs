import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { readPublicConfig } from '../src/lib/public-config.ts';
import { createChunkedStorage } from '../src/lib/chunked-storage.ts';
import { signupSchema, loginSchema, passwordUpdateSchema, passwordChangeSchema, profileSchema } from '../src/features/auth/schemas.ts';
import { createAuthApi } from '../src/features/auth/auth-api.ts';
import { completeAuthCallback } from '../src/features/auth/callback.ts';

const validSignup = { name: ' Alex Tan ', email: ' Alex@Example.com ', password: ' pass word ', confirmPassword: ' pass word ' };
test('validation normalizes names and emails, preserves passwords, and rejects mismatches', () => {
  const values = signupSchema.parse(validSignup);
  assert.equal(values.name, 'Alex Tan');
  assert.equal(values.email, 'alex@example.com');
  assert.equal(values.password, ' pass word ');
  assert.equal(signupSchema.safeParse({ ...validSignup, confirmPassword: 'pass word' }).success, false);
  assert.equal(signupSchema.safeParse({ ...validSignup, password: 'short', confirmPassword: 'short' }).success, false);
  assert.equal(loginSchema.safeParse({ email: 'not-an-email', password: 'secret' }).success, false);
  assert.equal(loginSchema.parse({ email: 'alex@example.com', password: 'legacy' }).password, 'legacy');
  assert.equal(passwordUpdateSchema.safeParse({ password: '12345678', confirmPassword: '12345679' }).success, false);
  assert.equal(profileSchema.safeParse({ name: ' '.repeat(10) }).success, false);
  assert.equal(profileSchema.safeParse({ name: 'a'.repeat(81) }).success, false);
});

test('public configuration fails closed for missing, privileged, and unsafe values', () => {
  for (const [url, key] of [[], ['https://test.supabase.co', 'sb_secret_test'],
    ['https://test.supabase.co', 'service_role'], ['http://example.com', 'sb_publishable_test'],
    ['https://user:pass@example.com', 'sb_publishable_test'], ['https://example.com/path', 'sb_publishable_test']]) {
    assert.equal(readPublicConfig(url, key).config, null);
  }
  assert.equal(readPublicConfig('https://test.supabase.co/', 'sb_publishable_test').config.url, 'https://test.supabase.co');
  assert.ok(readPublicConfig('http://127.0.0.1:54321', 'sb_publishable_test').config);
});

function mockClient(handler, authOverrides = {}) {
  const calls = [];
  const client = createClient('https://roomie-test.supabase.co', 'sb_publishable_test', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'pkce', ...authOverrides },
    global: { fetch: async (url, options = {}) => {
      const call = { url: String(url), method: options.method, body: options.body ? JSON.parse(options.body) : null };
      calls.push(call);
      return handler(call);
    } },
  });
  return { client, api: createAuthApi(client, () => 'roomie://auth/callback'), calls };
}
function json(body, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'X-Supabase-Api-Version': '2024-01-01' } }); }
const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated',
  email: 'alex@example.com', app_metadata: {}, user_metadata: { display_name: 'Alex' }, created_at: new Date().toISOString() };
const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`;
const sessionResponse = { access_token: token, refresh_token: 'refresh-test', token_type: 'bearer', expires_in: 3600, user };

test('a rejected Supabase password does not create a local session', async () => {
  const { client, api, calls } = mockClient(() => json({ code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400));
  await assert.rejects(api.signIn({ email: 'alex@example.com', password: 'incorrect' }), error => error.code === 'invalid_credentials');
  assert.equal((await client.auth.getSession()).data.session, null);
  assert.equal(calls.length, 1);
});

test('real SDK login sends the unchanged password and logout clears the session', async () => {
  const { client, api, calls } = mockClient(call => call.url.includes('/logout') ? new Response(null, { status: 204 }) : json(sessionResponse));
  await api.signIn({ email: ' Alex@Example.com ', password: ' pass word ' });
  assert.deepEqual(calls[0].body, { email: 'alex@example.com', password: ' pass word ', gotrue_meta_security: {} });
  assert.equal((await client.auth.getSession()).data.session.user.id, user.id);
  await api.signOut();
  assert.equal((await client.auth.getSession()).data.session, null);
  assert.ok(calls.at(-1).url.includes('scope=local'));
});

test('signup requiring email confirmation stays signed out and passes profile metadata', async () => {
  const { api, client, calls } = mockClient(() => json({ user, session: null }));
  const result = await api.signUp(validSignup);
  assert.equal(result.needsConfirmation, true);
  assert.equal(result.session, null);
  assert.equal((await client.auth.getSession()).data.session, null);
  assert.equal(calls[0].body.data.display_name, 'Alex Tan');
  assert.equal(calls[0].body.password, ' pass word ');
  assert.ok(calls[0].url.includes('redirect_to='));
});

test('recovery request sends a PKCE callback and does not fabricate a session', async () => {
  const { api, client, calls } = mockClient(() => json({}));
  await api.requestRecovery({ email: ' Alex@Example.com ' });
  assert.equal(calls[0].body.email, 'alex@example.com');
  assert.ok(decodeURIComponent(calls[0].url).includes('roomie://auth/callback?mode=recovery'));
  assert.equal((await client.auth.getSession()).data.session, null);
});

test('password update requires a Supabase session', async () => {
  const { api, calls } = mockClient(() => { throw new Error('Unexpected HTTP call'); });
  await assert.rejects(api.updatePassword({ password: 'new pass word', confirmPassword: 'new pass word' }));
  assert.equal(calls.length, 0);
});

test('missing and failed callback codes never grant access', async () => {
  const { client, calls } = mockClient(() => json({ code: 'flow_state_expired', msg: 'Expired' }, 400));
  await assert.rejects(completeAuthCallback(client, {}));
  await assert.rejects(completeAuthCallback(client, { code: ['one', 'two'] }));
  await assert.rejects(completeAuthCallback(client, { code: 'test', mode: 'admin' }));
  assert.equal(calls.length, 0);
  await assert.rejects(completeAuthCallback(client, { code: 'expired', mode: 'recovery' }));
  assert.equal((await client.auth.getSession()).data.session, null);
});

test('verified recovery callback returns a real session and recovery intent', async () => {
  const { client, api } = mockClient(call => call.url.includes('/recover') ? json({}) : json(sessionResponse));
  await api.requestRecovery({ email: 'alex@example.com' });
  const result = await completeAuthCallback(client, { code: 'verified-code', mode: 'recovery' });
  assert.equal(result.session.user.id, user.id);
  assert.equal(result.recovering, true);
});

function memoryStore() {
  const map = new Map();
  return { map, getItem: async key => map.get(key) ?? null,
    setItem: async (key, value) => { assert.ok(Buffer.byteLength(value) < 2048); map.set(key, value); },
    removeItem: async key => { map.delete(key); } };
}
test('large Unicode sessions survive adapter recreation and logout removes all reachable chunks', async () => {
  const store = memoryStore();
  const payload = JSON.stringify({ access_token: 'a'.repeat(10000), name: '室友🏠'.repeat(500) });
  await createChunkedStorage(store).setItem('session', payload);
  const restored = createChunkedStorage(store);
  assert.equal(await restored.getItem('session'), payload);
  await restored.removeItem('session');
  assert.equal(await restored.getItem('session'), null);
  assert.equal(store.map.size, 0);
});
test('failed token write preserves the last valid session and discards new chunks', async () => {
  const store = memoryStore();
  const adapter = createChunkedStorage(store);
  await adapter.setItem('session', 'old-session');
  const before = new Map(store.map);
  const write = store.setItem;
  store.setItem = async (key, value) => { if (key.endsWith('.1')) throw new Error('Native storage full'); await write(key, value); };
  await assert.rejects(adapter.setItem('session', 'a'.repeat(2000)));
  assert.equal(await adapter.getItem('session'), 'old-session');
  assert.deepEqual(store.map, before);
});
test('concurrent storage refreshes serialize and corrupt sessions cannot hydrate', async () => {
  const store = memoryStore();
  const adapter = createChunkedStorage(store);
  await Promise.all([adapter.setItem('session', 'one'), adapter.setItem('session', 'two')]);
  assert.equal(await adapter.getItem('session'), 'two');
  const manifest = JSON.parse(store.map.get('session'));
  store.map.delete(`session.${manifest.generation}.0`);
  await assert.rejects(adapter.getItem('session'), /incomplete/);
  store.map.set('session', '{invalid json');
  await assert.rejects(adapter.getItem('session'));
  await adapter.setItem('session', 'new-login');
  assert.equal(await adapter.getItem('session'), 'new-login');
  store.map.set('session', '{invalid again');
  await adapter.removeItem('session');
  assert.equal(await adapter.getItem('session'), null);
});


test('persisted sessions restore across SDK clients only after server user verification', async () => {
  const storage = createChunkedStorage(memoryStore());
  const options = { persistSession: true, storage, storageKey: 'restoration-test' };
  const first = mockClient(call => call.url.includes('/user') ? json(user) : json(sessionResponse), options);
  await first.api.signIn({ email: 'alex@example.com', password: ' pass word ' });
  const restored = mockClient(call => call.url.includes('/user') ? json(user) : new Response(null, { status: 204 }), options);
  assert.equal((await restored.api.restoreSession()).user.id, user.id);
  assert.ok(restored.calls.some(call => call.url.includes('/user')));
  await restored.api.signOut();
  const signedOut = mockClient(() => { throw new Error('Unexpected request'); }, options);
  assert.equal(await signedOut.api.restoreSession(), null);
});

test('a saved session rejected by the Auth server cannot restore protected access', async () => {
  const { client, api } = mockClient(call => call.url.includes('/user')
    ? json({ code: 'bad_jwt', msg: 'Invalid JWT' }, 401) : json(sessionResponse));
  await api.signIn({ email: 'alex@example.com', password: 'valid-password' });
  assert.ok((await client.auth.getSession()).data.session);
  await assert.rejects(api.restoreSession());
});


test('native storage read errors are surfaced instead of pretending persistence worked', async () => {
  const store = memoryStore();
  store.getItem = async () => { throw new Error('Keychain unavailable'); };
  const adapter = createChunkedStorage(store);
  await assert.rejects(adapter.getItem('session'), /Keychain unavailable/);
  await assert.rejects(adapter.setItem('session', 'new-session'), /Keychain unavailable/);
  await assert.rejects(adapter.removeItem('session'), /Keychain unavailable/);
  assert.equal(store.map.size, 0);
});

test('password changes send current password only to Auth and preserve password characters', async()=>{
 const {api,calls}=mockClient(call=>call.url.endsWith('/user')?json({user}):json(sessionResponse));
 await api.signIn({email:'alex@example.com',password:' old password '});
 await api.updatePassword({currentPassword:' old password ',password:' new password ',confirmPassword:' new password '});
 const update=calls.find(call=>call.method==='PUT'&&call.url.endsWith('/user'));
 assert.equal(update.body.password,' new password ');
 assert.equal(update.body.current_password,' old password ');
 assert.equal(update.body.data,undefined);
 assert.equal(update.body.confirmPassword,undefined);
 assert.equal(update.body.currentPassword,undefined);
});

test('profile password changes require current credentials and propagate Auth rejection',async()=>{
 assert.equal(passwordChangeSchema.safeParse({password:'new pass word',confirmPassword:'new pass word'}).success,false);
 const {api}=mockClient(call=>call.method==='PUT'?json({code:'invalid_credentials',msg:'Invalid credentials'},400):json(sessionResponse));
 await api.signIn({email:'alex@example.com',password:'old password'});
 await assert.rejects(api.updatePassword({currentPassword:'wrong password',password:'new pass word',confirmPassword:'new pass word'}),error=>error.code==='invalid_credentials');
});
