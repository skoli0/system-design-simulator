import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeLocalStorage } from "./safeStorage";

export type ToastType = "success" | "error" | "info";

interface ToastData {
  message: string;
  type: ToastType;
}

interface AppState {
  selectedProblemId: string;
  leftSidebarOpen: boolean;
  rightPanelOpen: boolean;
  activeLeftTab: "components" | "problems" | "learn";
  activeRightTab: "properties" | "simulation" | "score" | "capacity" | "tradeoffs";
  toast: ToastData | null;

  setSelectedProblem: (id: string) => void;
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
      leftSidebarOpen: true,
      rightPanelOpen: true,
      activeLeftTab: "components",
      activeRightTab: "properties",
      toast: null,

      setSelectedProblem: (id) => set({ selectedProblemId: id }),
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
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => safeLocalStorage),
      // The app is dark-only; older persisted state may still contain a
      // `theme` key — strip it so it never leaks back into the store.
      migrate: (persisted) => {
        if (persisted && typeof persisted === "object" && "theme" in persisted) {
          const { theme: _theme, ...rest } = persisted as Record<string, unknown>;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return rest as any;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return persisted as any;
      },
      partialize: (state) => ({
        selectedProblemId: state.selectedProblemId,
      }),
    }
  )
);
