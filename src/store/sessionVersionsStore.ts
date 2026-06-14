import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeLocalStorage } from "./safeStorage";
import {
  captureMyDesignSnapshot,
  restoreSnapshotToCanvas,
  snapshotFingerprint,
  type DesignSnapshot,
} from "@/lib/designSnapshot";

export interface SessionVersion extends DesignSnapshot {
  version: number;
  savedAt: string;
  label: string;
}

const MAX_VERSIONS = 25;

interface SessionVersionsState {
  currentVersion: number;
  versions: SessionVersion[];
  lastFingerprint: string | null;
  pushVersion: (label?: string) => boolean;
  restoreVersion: (version: number) => void;
  clearSession: () => void;
}

function nextVersionNumber(versions: SessionVersion[]): number {
  if (versions.length === 0) return 1;
  return Math.max(...versions.map((v) => v.version)) + 1;
}

export const useSessionVersionsStore = create<SessionVersionsState>()(
  persist(
    (set, get) => ({
      currentVersion: 0,
      versions: [],
      lastFingerprint: null,

      pushVersion: (label?: string) => {
        const snapshot = captureMyDesignSnapshot();
        if (snapshot.nodes.length === 0 && snapshot.edges.length === 0) {
          return false;
        }

        const fingerprint = snapshotFingerprint(snapshot);
        if (fingerprint === get().lastFingerprint) {
          return false;
        }

        const version = nextVersionNumber(get().versions);
        const savedAt = new Date().toISOString();
        const entry: SessionVersion = {
          version,
          savedAt,
          label: label ?? `Auto-save v${version}`,
          ...snapshot,
        };

        set((s) => ({
          currentVersion: version,
          lastFingerprint: fingerprint,
          versions: [entry, ...s.versions].slice(0, MAX_VERSIONS),
        }));
        return true;
      },

      restoreVersion: (version: number) => {
        const entry = get().versions.find((v) => v.version === version);
        if (!entry) return;
        restoreSnapshotToCanvas(entry);
        set({
          currentVersion: version,
          lastFingerprint: snapshotFingerprint(entry),
        });
      },

      clearSession: () =>
        set({ currentVersion: 0, versions: [], lastFingerprint: null }),
    }),
    {
      name: "systemsim-session-versions",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => safeLocalStorage),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      migrate: (state) => state as any,
    }
  )
);
