import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionPersistence } from '../src/lib/session-persistence.ts';
function fixture() {
  const saved = new Map();
  const persistent = { getItem: async key => saved.get(key) ?? null, setItem: async (key, value) => { saved.set(key, value); }, removeItem: async key => { saved.delete(key); } };
  return { saved, persistent };
}
test('remembered sessions persist across app runtimes', async () => {
  const { persistent } = fixture();
  const first = createSessionPersistence(persistent);
  await first.storage.setItem('auth', 'session');
  assert.equal(await createSessionPersistence(persistent).storage.getItem('auth'), 'session');
});
test('non-remembered sessions remove old credentials and stay in memory through refresh', async () => {
  const { saved, persistent } = fixture();
  saved.set('auth', 'old');
  const first = createSessionPersistence(persistent);
  await first.storage.getItem('auth');
  await first.setRememberSession(false);
  await first.storage.setItem('auth', 'new');
  await first.storage.setItem('auth', 'refreshed');
  assert.equal(saved.size, 0);
  assert.equal(await first.storage.getItem('auth'), 'refreshed');
  assert.equal(await createSessionPersistence(persistent).storage.getItem('auth'), null);
  await first.storage.removeItem('auth');
  assert.equal(await first.storage.getItem('auth'), null);
});
test('switching back to remembered mode clears transient credentials', async () => {
  const { persistent } = fixture();
  const first = createSessionPersistence(persistent);
  await first.setRememberSession(false);
  await first.storage.setItem('auth', 'temporary');
  await first.setRememberSession(true);
  assert.equal(await first.storage.getItem('auth'), null);
  await first.storage.setItem('auth', 'saved');
  assert.equal(await createSessionPersistence(persistent).storage.getItem('auth'), 'saved');
});
test('storage failures prevent a persistence change from pretending to succeed', async () => {
  const first = createSessionPersistence({ getItem: async () => 'old', setItem: async () => {}, removeItem: async () => { throw new Error('storage unavailable'); } });
  await first.storage.getItem('auth');
  await assert.rejects(first.setRememberSession(false), /storage unavailable/);
  assert.equal(await first.storage.getItem('auth'), 'old');
});
