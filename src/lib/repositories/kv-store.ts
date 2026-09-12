import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { put, get, del } from "@vercel/blob";

/**
 * Small JSON document store for caches and quotas, separate from the project
 * archive. Keys are hashed so arbitrary user-controlled strings (GitHub names,
 * SHAs, client keys) can never form storage paths.
 */
export interface KeyValueStore {
  get<T>(namespace: string, key: string): Promise<T | null>;
  set<T>(namespace: string, key: string, value: T): Promise<void>;
  delete(namespace: string, key: string): Promise<void>;
}

type Entry<T> = { key: string; value: T; storedAt: string; expiresAt?: string };

export function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex").slice(0, 48);
}
function namespaceSegment(namespace: string) {
  if (!/^[a-z0-9-]{1,40}$/.test(namespace))
    throw new Error("Invalid cache namespace.");
  return namespace;
}

export class LocalKeyValueStore implements KeyValueStore {
  constructor(
    private root = path.join(
      path.resolve(
        /* turbopackIgnore: true */ process.env.LOCAL_DATA_DIR || ".data",
      ),
      "cache",
    ),
  ) {}
  private file(namespace: string, key: string) {
    return path.join(
      this.root,
      namespaceSegment(namespace),
      `${hashKey(key)}.json`,
    );
  }
  async get<T>(namespace: string, key: string) {
    try {
      const entry = JSON.parse(
        await readFile(this.file(namespace, key), "utf8"),
      ) as Entry<T>;
      return entry.key === key ? entry.value : null;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }
  async set<T>(namespace: string, key: string, value: T) {
    const target = this.file(namespace, key);
    await mkdir(path.dirname(target), { recursive: true });
    const temp = `${target}.${randomUUID()}.tmp`;
    const entry: Entry<T> = { key, value, storedAt: new Date().toISOString() };
    await writeFile(temp, JSON.stringify(entry), { mode: 0o600 });
    await rename(temp, target);
  }
  async delete(namespace: string, key: string) {
    await rm(this.file(namespace, key), { force: true });
  }
}

export class BlobKeyValueStore implements KeyValueStore {
  private path(namespace: string, key: string) {
    return `deadfolio/cache/${namespaceSegment(namespace)}/${hashKey(key)}.json`;
  }
  async get<T>(namespace: string, key: string) {
    const result = await get(this.path(namespace, key), {
      access: "private",
      useCache: false,
    });
    if (!result || result.statusCode !== 200) return null;
    const entry = JSON.parse(
      await new Response(result.stream).text(),
    ) as Entry<T>;
    return entry.key === key ? entry.value : null;
  }
  async set<T>(namespace: string, key: string, value: T) {
    const entry: Entry<T> = { key, value, storedAt: new Date().toISOString() };
    await put(this.path(namespace, key), JSON.stringify(entry), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
  }
  async delete(namespace: string, key: string) {
    await del(this.path(namespace, key));
  }
}

/** Process-local layer so warm instances skip disk/Blob round trips. */
export class MemoryKeyValueStore implements KeyValueStore {
  private entries = new Map<string, unknown>();
  constructor(private limit = 2000) {}
  async get<T>(namespace: string, key: string) {
    return (this.entries.get(`${namespace}:${key}`) as T | undefined) ?? null;
  }
  async set<T>(namespace: string, key: string, value: T) {
    if (this.entries.size >= this.limit)
      this.entries.delete(this.entries.keys().next().value!);
    this.entries.set(`${namespace}:${key}`, value);
  }
  async delete(namespace: string, key: string) {
    this.entries.delete(`${namespace}:${key}`);
  }
}

export class LayeredKeyValueStore implements KeyValueStore {
  constructor(
    private memory: KeyValueStore,
    private durable: KeyValueStore,
  ) {}
  async get<T>(namespace: string, key: string) {
    const hot = await this.memory.get<T>(namespace, key);
    if (hot !== null) return hot;
    const cold = await this.durable.get<T>(namespace, key);
    if (cold !== null) await this.memory.set(namespace, key, cold);
    return cold;
  }
  async set<T>(namespace: string, key: string, value: T) {
    await this.durable.set(namespace, key, value);
    await this.memory.set(namespace, key, value);
  }
  async delete(namespace: string, key: string) {
    await this.memory.delete(namespace, key);
    await this.durable.delete(namespace, key);
  }
}

type Expiring<T> = { value: T; expiresAt: number };

/** Read-through cache with a TTL. Loader failures are never cached. */
export async function cached<T>(
  store: KeyValueStore,
  namespace: string,
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const hit = await store.get<Expiring<T>>(namespace, key).catch(() => null);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  const value = await load();
  await store
    .set<Expiring<T>>(namespace, key, { value, expiresAt: Date.now() + ttlMs })
    .catch((error) => {
      console.error("Cache write failed:", (error as Error).message);
    });
  return value;
}
