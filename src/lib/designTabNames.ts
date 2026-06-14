import type { CanvasTab } from "@/store/canvasStore";

const DESIGN_LABEL = /^Design (\d+)$/;

/** Next available "Design N" label (1-based, fills gaps). */
export function nextDesignTabLabel(tabs: CanvasTab[]): string {
  const used = new Set<number>();
  for (const tab of tabs) {
    if (tab.readOnly) continue;
    const match = DESIGN_LABEL.exec(tab.label.trim());
    if (match) used.add(Number(match[1]));
  }
  let n = 1;
  while (used.has(n)) n += 1;
  return `Design ${n}`;
}

export function isExtraDesignTab(tab: CanvasTab): boolean {
  return !tab.readOnly;
}
