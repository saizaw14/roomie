export type AsyncStorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};
type Manifest = { generation: string; count: number };
function parseManifest(raw: string | null): Manifest | null {
  if (!raw) return null;
  const value: unknown = JSON.parse(raw);
  if (typeof value !== 'object' || value === null || !('generation' in value) ||
    !('count' in value) || typeof value.generation !== 'string' ||
    !/^[a-z0-9-]+$/.test(value.generation) || !Number.isInteger(value.count) ||
    typeof value.count !== 'number' || value.count < 1 || value.count > 1000) {
    throw new Error('Stored session could not be read.');
  }
  return { generation: value.generation, count: value.count };
}
/** Commit the manifest last so a failed token refresh cannot destroy the prior session.
 * 500 UTF-16 units stay below historical native per-value byte limits, including Unicode.
 */
export function createChunkedStorage(store: AsyncStorageAdapter): AsyncStorageAdapter {
  let queue: Promise<unknown> = Promise.resolve();
  function serialized<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation);
    queue = result.catch(() => {});
    return result;
  }
  const chunkKey = (key: string, manifest: Manifest, index: number) =>
    `${key}.${manifest.generation}.${index}`;
  async function clean(key: string, manifest: Manifest | null) {
    if (manifest) await Promise.allSettled(Array.from({ length: manifest.count }, (_, i) =>
      store.removeItem(chunkKey(key, manifest, i))));
  }
  return {
    getItem: key => serialized(async () => {
      const manifest = parseManifest(await store.getItem(key));
      if (!manifest) return null;
      const chunks = await Promise.all(Array.from({ length: manifest.count }, (_, i) =>
        store.getItem(chunkKey(key, manifest, i))));
      if (chunks.some(value => value === null)) throw new Error('Stored session is incomplete.');
      return chunks.join('');
    }),
    setItem: (key, value) => serialized(async () => {
      if (value.length > 500000) throw new Error('Session is too large to store.');
      const raw = await store.getItem(key);
      let previous: Manifest | null = null;
      try { previous = parseManifest(raw); } catch { /* A new login replaces a malformed manifest. */ }
      const next = { generation: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
        count: Math.max(1, Math.ceil(value.length / 500)) };
      try {
        for (let i = 0; i < next.count; i++) {
          await store.setItem(chunkKey(key, next, i), value.slice(i * 500, (i + 1) * 500));
        }
        await store.setItem(key, JSON.stringify(next));
      } catch (error) {
        await clean(key, next);
        throw error;
      }
      await clean(key, previous);
    }),
    removeItem: key => serialized(async () => {
      const raw = await store.getItem(key);
      let manifest: Manifest | null = null;
      try { manifest = parseManifest(raw); } catch { /* Remove the corrupt pointer too. */ }
      // Removing the pointer first makes old chunks inaccessible to a restored session.
      await store.removeItem(key);
      await clean(key, manifest);
    }),
  };
}
