import type { Edge, Node } from "@xyflow/react";
import type { CanvasTab } from "@/store/canvasStore";
import { DEFAULT_CAPACITY_SETTINGS } from "@/lib/designDefaults";

const LEGACY_MY_DESIGN_ID = "my-design";

export function isLegacyMyDesignTab(tab: CanvasTab): boolean {
  return tab.id === LEGACY_MY_DESIGN_ID;
}

/** Strip legacy My Design tab; migrate its content into Design 1 when non-empty. */
export function migrateLegacyTabs(
  tabs: CanvasTab[],
  activeTabId: string | null,
  nodes: Node[],
  edges: Edge[],
): { tabs: CanvasTab[]; activeTabId: string | null; nodes: Node[]; edges: Edge[] } {
  const legacy = tabs.find((t) => t.id === LEGACY_MY_DESIGN_ID);
  let migrated = tabs.filter((t) => t.id !== LEGACY_MY_DESIGN_ID);

  let designFromLegacy: CanvasTab | null = null;
  if (legacy) {
    const legacyNodes =
      activeTabId === LEGACY_MY_DESIGN_ID ? nodes : (legacy.nodes ?? []);
    const legacyEdges =
      activeTabId === LEGACY_MY_DESIGN_ID ? edges : (legacy.edges ?? []);
    const hasContent =
      legacyNodes.filter((n) => n.type !== "text").length > 0 ||
      legacyEdges.length > 0;

    if (hasContent) {
      designFromLegacy = {
        ...legacy,
        id: `design-${crypto.randomUUID().slice(0, 8)}`,
        label: "Design 1",
        nodes: legacyNodes,
        edges: legacyEdges,
        capacity: legacy.capacity ?? { ...DEFAULT_CAPACITY_SETTINGS },
        tradeoffEntries: legacy.tradeoffEntries ?? [],
        scoreResult: legacy.scoreResult ?? null,
      };
      migrated = [designFromLegacy, ...migrated];
    }
  }

  let nextActive =
    activeTabId === LEGACY_MY_DESIGN_ID || activeTabId === ""
      ? null
      : activeTabId;

  if (activeTabId === LEGACY_MY_DESIGN_ID && designFromLegacy) {
    nextActive = designFromLegacy.id;
  }

  if (nextActive != null && !migrated.some((t) => t.id === nextActive)) {
    nextActive = migrated.find((t) => !t.readOnly)?.id ?? migrated[0]?.id ?? null;
  }

  if (migrated.length === 0) {
    return { tabs: [], activeTabId: null, nodes: [], edges: [] };
  }

  if (nextActive == null) {
    return { tabs: migrated, activeTabId: null, nodes: [], edges: [] };
  }

  const active = migrated.find((t) => t.id === nextActive)!;
  const liveNodes =
    activeTabId === nextActive ? nodes : (active.nodes ?? []);
  const liveEdges =
    activeTabId === nextActive ? edges : (active.edges ?? []);

  return {
    tabs: migrated,
    activeTabId: nextActive,
    nodes: liveNodes,
    edges: liveEdges,
  };
}
