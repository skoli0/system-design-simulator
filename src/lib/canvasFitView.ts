export const CANVAS_FIT_VIEW_OPTIONS = {
  padding: 0.25,
  duration: 350,
  maxZoom: 1.2,
} as const;

/** Sidebar and right panel use `duration-200` transitions. */
export const CANVAS_LAYOUT_SETTLE_MS = 220;

export function requestCanvasFitView(delayMs = 0): void {
  const dispatch = () => window.dispatchEvent(new CustomEvent("canvas:fitview"));
  if (delayMs > 0) window.setTimeout(dispatch, delayMs);
  else dispatch();
}
