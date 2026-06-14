import { useSyncExternalStore } from "react";
import { useAppStore } from "./appStore";
import { useCanvasStore } from "./canvasStore";
import { usePenStore } from "./penStore";
import { useSavedDesignsStore } from "./savedDesignsStore";
import { useCustomProblemsStore } from "./customProblemsStore";
import { useCustomComponentsStore } from "./customComponentsStore";
import { useTradeoffStore } from "./tradeoffStore";
import { useInterviewStore } from "./interviewStore";
import { useSessionVersionsStore } from "./sessionVersionsStore";
import {
  indexedDbStorage,
  migrateLocalStorageKeyToIndexedDb,
} from "@/lib/indexedDbStorage";

const PERSISTED_DB_KEYS = [
  "systemsim-canvas",
  "systemsim-saved-designs",
  "systemsim-session-versions",
] as const;

/**
 * All persisted stores use `skipHydration: true` so that the server render
 * and the first client render agree (no hydration mismatch). Call
 * `rehydrateAllStores()` once after mount (e.g. in AppShell's useEffect)
 * to load persisted state from IndexedDB (migrates legacy localStorage once).
 */

let hasHydrated = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function rehydrateAllStores(): Promise<void> {
  const migrate = Promise.all(
    PERSISTED_DB_KEYS.map((key) =>
      migrateLocalStorageKeyToIndexedDb(key, indexedDbStorage),
    ),
  );

  return migrate.then(() => {
    const results: (void | Promise<void>)[] = [
      useAppStore.persist.rehydrate(),
      useCanvasStore.persist.rehydrate(),
      usePenStore.persist.rehydrate(),
      useSavedDesignsStore.persist.rehydrate(),
      useCustomProblemsStore.persist.rehydrate(),
      useCustomComponentsStore.persist.rehydrate(),
      useTradeoffStore.persist.rehydrate(),
      useInterviewStore.persist.rehydrate(),
      useSessionVersionsStore.persist.rehydrate(),
    ];
    return Promise.all(results.map((r) => Promise.resolve(r))).then(() => {
      hasHydrated = true;
      emit();
    });
  });
}

/**
 * Returns false on the server and until `rehydrateAllStores()` has
 * completed on the client; true afterwards. Use it to gate UI that must
 * only render persisted state.
 */
export function useHasHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => hasHydrated,
    () => false
  );
}
