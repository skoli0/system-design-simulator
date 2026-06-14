import type { Node, Edge } from "@xyflow/react";
import { getComponentById } from "@/data/components";
import { getProblemById } from "@/data/problems";
import { assignHandlesToEdges } from "@/lib/edgeHandles";
import { buildReferenceGraph, layoutNodesLeftToRight } from "@/lib/loadReference";
import { useAppStore } from "@/store/appStore";
import {
  useCanvasStore,
  type ComponentNodeData,
  isHomeView,
} from "@/store/canvasStore";

export function getActiveDesignState(): { nodes: Node[]; edges: Edge[] } {
  const { tabs, activeTabId, nodes, edges } = useCanvasStore.getState();
  if (isHomeView(activeTabId)) {
    return { nodes: [], edges: [] };
  }
  const tab = tabs.find((t) => t.id === activeTabId);
  if (activeTabId === tab?.id) {
    return { nodes, edges };
  }
  return { nodes: tab?.nodes ?? [], edges: tab?.edges ?? [] };
}

/** Switch to an editable design tab, creating one from home if needed. */
export function ensureActiveDesignTab(): string {
  return useCanvasStore.getState().ensureActiveDesignTab();
}

function isActiveDesignEmpty(): boolean {
  const { tabs, activeTabId, nodes } = useCanvasStore.getState();
  if (isHomeView(activeTabId)) return true;
  const tab = tabs.find((t) => t.id === activeTabId);
  const liveNodes =
    activeTabId === tab?.id ? nodes : (tab?.nodes ?? []);
  return liveNodes.filter((n) => n.type !== "text").length === 0;
}

/** Notify the canvas to re-fit the viewport after programmatic edits. */
export function focusActiveDesignOnCanvas(): void {
  ensureActiveDesignTab();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("canvas:fitview"));
  }
}

/**
 * Copy the current problem's reference architecture into the active design
 * as an editable canvas. No-op when the design already has components.
 */
export function ensureDesignSeededFromReference(): boolean {
  if (!isActiveDesignEmpty()) return false;

  const problem = getProblemById(useAppStore.getState().selectedProblemId);
  if (!problem?.referenceSolution.nodes.length) return false;

  const { nodes: refNodes, edges: refEdges } = buildReferenceGraph(problem);
  const idMap = new Map<string, string>();
  const newNodes = refNodes.map((n) => {
    const newId = `${n.data.componentId}-${crypto.randomUUID().slice(0, 8)}`;
    idMap.set(n.id, newId);
    return { ...n, id: newId };
  });
  const newEdges = refEdges.map((e) => ({
    ...e,
    id: `e-${idMap.get(e.source)!}-${idMap.get(e.target)!}`,
    source: idMap.get(e.source)!,
    target: idMap.get(e.target)!,
  }));

  ensureActiveDesignTab();
  useCanvasStore.getState().loadActiveTabContent(newNodes, newEdges);
  focusActiveDesignOnCanvas();
  return true;
}

/** Re-layout component nodes left-to-right and apply aligned positions. */
export function relayoutActiveDesign(): void {
  ensureActiveDesignTab();
  const { nodes, edges, loadActiveTabContent } = useCanvasStore.getState();
  const textNodes = nodes.filter((n) => n.type === "text");
  const componentNodes = nodes.filter(
    (n) => n.type !== "text",
  ) as Node<ComponentNodeData>[];
  if (componentNodes.length === 0) return;

  const laidOut = layoutNodesLeftToRight(componentNodes, edges);
  const routedEdges = assignHandlesToEdges(laidOut, edges);
  loadActiveTabContent([...laidOut, ...textNodes], routedEdges);
  focusActiveDesignOnCanvas();
}

/** @deprecated Use relayoutActiveDesign. */
export function relayoutMyDesign(): void {
  relayoutActiveDesign();
}

/** Add a component to the active design with aligned layout. Returns the node id. */
export function addComponentToCanvas(componentId: string): string | null {
  const component = getComponentById(componentId);
  if (!component) return null;

  const wasEmpty = isActiveDesignEmpty();
  ensureDesignSeededFromReference();
  ensureActiveDesignTab();

  const { nodes, addNode } = useCanvasStore.getState();

  if (wasEmpty) {
    const seeded = nodes.find(
      (n) => n.type !== "text" && n.data.componentId === componentId,
    );
    if (seeded) {
      useCanvasStore.getState().setSelectedNode(seeded.id);
      focusActiveDesignOnCanvas();
      return seeded.id;
    }
  }

  const existing = nodes.find(
    (n) => n.type !== "text" && n.data.componentId === componentId,
  );
  if (existing) {
    useCanvasStore.getState().setSelectedNode(existing.id);
    focusActiveDesignOnCanvas();
    return existing.id;
  }

  const id = `${componentId}-${crypto.randomUUID().slice(0, 8)}`;
  const newNode: Node<ComponentNodeData> = {
    id,
    type: "component",
    position: { x: 0, y: 0 },
    data: {
      componentId: component.id,
      label: component.label,
      icon: component.icon,
      category: component.category,
      replicas: 1,
      shards: 1,
      maxQPS: component.maxQPS,
      latencyMs: component.latencyMs,
      scalable: component.scalable,
    },
  };

  addNode(newNode);
  useCanvasStore.getState().setSelectedNode(id);
  focusActiveDesignOnCanvas();
  return id;
}

/** @deprecated Use getActiveDesignState. */
export function getMyDesignState(): { nodes: Node[]; edges: Edge[] } {
  return getActiveDesignState();
}

/** @deprecated Use ensureActiveDesignTab. */
export function ensureMyDesignTabActive(): void {
  ensureActiveDesignTab();
}

/** @deprecated Use focusActiveDesignOnCanvas. */
export function focusMyDesignOnCanvas(): void {
  focusActiveDesignOnCanvas();
}

/** @deprecated Use ensureDesignSeededFromReference. */
export function ensureMyDesignSeededFromReference(): boolean {
  return ensureDesignSeededFromReference();
}
