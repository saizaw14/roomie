import type { AsyncStorageAdapter } from './chunked-storage.ts';

/** A non-remembered session exists only for the lifetime of this app runtime. */
export function createSessionPersistence(persistent: AsyncStorageAdapter) {
  let remember = true;
  const memory = new Map<string, string>();
  const keys = new Set<string>();
  const storage: AsyncStorageAdapter = {
    async getItem(key) {
      keys.add(key);
      return remember ? persistent.getItem(key) : memory.get(key) ?? null;
    },
    async setItem(key, value) {
      keys.add(key);
      if (remember) await persistent.setItem(key, value); else memory.set(key, value);
    },
    async removeItem(key) {
      keys.add(key);
      memory.delete(key);
      await persistent.removeItem(key);
    },
  };
  async function setRememberSession(value: boolean) {
    // Called before password sign-in, while signed out. Remove any old saved session.
    if (!value) for (const key of keys) await persistent.removeItem(key);
    memory.clear();
    remember = value;
  }
  return { storage, setRememberSession };
}
