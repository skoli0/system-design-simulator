"use client";

import { useEffect, useRef } from "react";
import { useCanvasStore } from "@/store/canvasStore";
import { usePenStore } from "@/store/penStore";
import { useSessionVersionsStore } from "@/store/sessionVersionsStore";
import { useHasHydrated } from "@/store/hydration";

const AUTO_SAVE_MS = 2000;

/**
 * Debounced auto-save of "My Design" edits into the session version history.
 */
export function useDesignAutoSave(): void {
  const hasHydrated = useHasHydrated();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;

    const scheduleSave = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        useSessionVersionsStore.getState().pushVersion();
      }, AUTO_SAVE_MS);
    };

    const unsubCanvas = useCanvasStore.subscribe((state, prev) => {
      const myDesignChanged =
        (state.activeTabId === "my-design" &&
          (state.nodes !== prev.nodes || state.edges !== prev.edges)) ||
        state.tabs !== prev.tabs;

      if (myDesignChanged) scheduleSave();
    });

    const unsubPen = usePenStore.subscribe((state, prev) => {
      if (state.strokes !== prev.strokes) scheduleSave();
    });

    return () => {
      unsubCanvas();
      unsubPen();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hasHydrated]);
}
