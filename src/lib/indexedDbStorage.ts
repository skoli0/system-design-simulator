import type { StateStorage } from "zustand/middleware";

const DB_NAME = "system-design-simulator";
const STORE = "persist";
const DB_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const request = fn(store);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
    request.onsuccess = () => resolve(request.result as T);
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
  });
}

/** Shared IndexedDB-backed storage for Zustand persist. */
export const indexedDbStorage: StateStorage = createIndexedDbStorageImpl();

/** Async key-value storage backed by IndexedDB (NoSQL document store). */
export function createIndexedDbStorage(): StateStorage {
  return createIndexedDbStorageImpl();
}

function createIndexedDbStorageImpl(): StateStorage {
  return {
    getItem: (name) => withStore("readonly", (store) => store.get(name)),
    setItem: (name, value) =>
      withStore("readwrite", (store) => store.put(value, name)).then(() => undefined),
    removeItem: (name) =>
      withStore("readwrite", (store) => store.delete(name)).then(() => undefined),
  };
}

/** One-time migration from localStorage into IndexedDB for a persist key. */
export async function migrateLocalStorageKeyToIndexedDb(
  key: string,
  storage: StateStorage,
): Promise<void> {
  if (typeof localStorage === "undefined") return;
  const existing = await storage.getItem(key);
  if (existing != null) return;

  const legacy = localStorage.getItem(key);
  if (legacy != null) {
    await storage.setItem(key, legacy);
  }
}
