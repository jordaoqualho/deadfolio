import "server-only";
import { blobStoreConfigured } from "./blob-project-repository";
import {
  BlobKeyValueStore,
  LayeredKeyValueStore,
  LocalKeyValueStore,
  MemoryKeyValueStore,
  type KeyValueStore,
} from "./kv-store";

let store: KeyValueStore;
/** Cache/quota store. Follows the same local-vs-Blob selection as the project archive. */
export function getStore() {
  if (store) return store;
  const mode =
    process.env.PROJECT_REPOSITORY || (process.env.VERCEL ? "blob" : "local");
  const durable =
    mode === "blob"
      ? blobStoreConfigured()
        ? new BlobKeyValueStore()
        : null
      : process.env.VERCEL
        ? null
        : new LocalKeyValueStore();
  if (!durable) {
    console.error(
      "No durable cache store is configured; autopsy caching is process-local only.",
    );
    store = new MemoryKeyValueStore();
    return store;
  }
  store = new LayeredKeyValueStore(new MemoryKeyValueStore(), durable);
  return store;
}
