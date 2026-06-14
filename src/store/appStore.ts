import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeLocalStorage } from "./safeStorage";

export type ToastType = "success" | "error" | "info";
export type Theme = "light" | "dark";

interface ToastData {
  message: string;
  type: ToastType;
}

interface AppState {
  selectedProblemId: string;
  theme: Theme;
  leftSidebarOpen: boolean;
  rightPanelOpen: boolean;
  activeLeftTab: "components" | "problems" | "learn";
  activeRightTab: "properties" | "simulation" | "score" | "capacity" | "tradeoffs";
  toast: ToastData | null;

  setSelectedProblem: (id: string) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleLeftSidebar: () => void;
  toggleRightPanel: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setActiveLeftTab: (tab: AppState["activeLeftTab"]) => void;
  setActiveRightTab: (tab: AppState["activeRightTab"]) => void;
  showToast: (message: string, type: ToastType) => void;
  clearToast: () => void;
}

// Single owner of the toast auto-dismiss timer (4s). showToast resets it,
// clearToast cancels it — no other code should schedule toast dismissal.
let toastTimeoutId: ReturnType<typeof setTimeout> | null = null;

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedProblemId: "url-shortener",
      theme: "light",
      leftSidebarOpen: true,
      rightPanelOpen: true,
      activeLeftTab: "components",
      activeRightTab: "properties",
      toast: null,

      setSelectedProblem: (id) => set({ selectedProblemId: id }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      toggleLeftSidebar: () =>
        set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),
      toggleRightPanel: () =>
        set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
      setLeftSidebarOpen: (open) => set({ leftSidebarOpen: open }),
      setActiveLeftTab: (tab) => set({ activeLeftTab: tab }),
      setActiveRightTab: (tab) => set({ activeRightTab: tab }),
      showToast: (message, type) => {
        if (toastTimeoutId !== null) {
          clearTimeout(toastTimeoutId);
        }
        set({ toast: { message, type } });
        toastTimeoutId = setTimeout(() => {
          set({ toast: null });
          toastTimeoutId = null;
        }, 4000);
      },
      clearToast: () => {
        if (toastTimeoutId !== null) {
          clearTimeout(toastTimeoutId);
          toastTimeoutId = null;
        }
        set({ toast: null });
      },
    }),
    {
      name: "systemsim-app",
      version: 3,
      skipHydration: true,
      storage: createJSONStorage(() => safeLocalStorage),
      migrate: (persisted, version) => {
        const state = persisted as Record<string, unknown> | undefined;
        if (!state) return persisted;
        // v3: default theme is light for fresh installs only (keep saved preference)
        if (version < 3 && state.theme === undefined) {
          return { ...state, theme: "light" };
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return persisted as any;
      },
      partialize: (state) => ({
        selectedProblemId: state.selectedProblemId,
        theme: state.theme,
      }),
    }
  )
);
