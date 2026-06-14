import type { Node, Edge } from "@xyflow/react";
import { getComponentById } from "@/data/components";
import { getProblemById } from "@/data/problems";
import { buildReferenceGraph, layoutNodesLeftToRight } from "@/lib/loadReference";
import { wireComponentIntoPath } from "@/lib/wireComponent";
import { useAppStore } from "@/store/appStore";
import { useCanvasStore, type ComponentNodeData } from "@/store/canvasStore";

export const MY_DESIGN_TAB_ID = "my-design";

export function getMyDesignState(): { nodes: Node[]; edges: Edge[] } {
  const { tabs, activeTabId, nodes, edges } = useCanvasStore.getState();
  if (activeTabId === MY_DESIGN_TAB_ID) {
    return { nodes, edges };
  }
  const tab = tabs.find((t) => t.id === MY_DESIGN_TAB_ID);
  return { nodes: tab?.nodes ?? [], edges: tab?.edges ?? [] };
}

/** Switch to the editable My Design tab (saving the current tab first). */
export function ensureMyDesignTabActive(): void {
  const { activeTabId } = useCanvasStore.getState();
  if (activeTabId !== MY_DESIGN_TAB_ID) {
    useCanvasStore.getState().switchTab(MY_DESIGN_TAB_ID);
  }
}

function isMyDesignEmpty(): boolean {
  const { tabs, activeTabId, nodes } = useCanvasStore.getState();
  const liveNodes = activeTabId === MY_DESIGN_TAB_ID ? nodes : (tabs.find((t) => t.id === MY_DESIGN_TAB_ID)?.nodes ?? []);
  return liveNodes.filter((n) => n.type !== "text").length === 0;
}

/** Notify the canvas to re-fit the viewport after programmatic edits. */
export function focusMyDesignOnCanvas(): void {
  ensureMyDesignTabActive();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("canvas:fitview"));
  }
}

/**
 * Copy the current problem's reference architecture into My Design as an
 * editable canvas. No-op when My Design already has components.
 */
export function ensureMyDesignSeededFromReference(): boolean {
  if (!isMyDesignEmpty()) return false;

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

  useCanvasStore.getState().loadMyDesignContent(newNodes, newEdges);
  focusMyDesignOnCanvas();
  return true;
}

/** Re-layout component nodes left-to-right and apply aligned positions. */
export function relayoutMyDesign(): void {
  ensureMyDesignTabActive();
  const { nodes, edges, loadMyDesignContent } = useCanvasStore.getState();
  const textNodes = nodes.filter((n) => n.type === "text");
  const componentNodes = nodes.filter(
    (n) => n.type !== "text"
  ) as Node<ComponentNodeData>[];
  if (componentNodes.length === 0) return;

  const laidOut = layoutNodesLeftToRight(componentNodes, edges);
  loadMyDesignContent([...laidOut, ...textNodes], edges);
  focusMyDesignOnCanvas();
}

/** Add a component to My Design with aligned layout. Returns the node id. */
export function addComponentToCanvas(componentId: string): string | null {
  const component = getComponentById(componentId);
  if (!component) return null;

  const wasEmpty = isMyDesignEmpty();
  ensureMyDesignSeededFromReference();
  ensureMyDesignTabActive();

  const { nodes, addNode } = useCanvasStore.getState();

  if (wasEmpty) {
    const seeded = nodes.find(
      (n) => n.type !== "text" && n.data.componentId === componentId
    );
    if (seeded) {
      wireComponentIntoPath(componentId);
      relayoutMyDesign();
      useCanvasStore.getState().setSelectedNode(seeded.id);
      focusMyDesignOnCanvas();
      return seeded.id;
    }
  }

  const existing = nodes.find(
    (n) => n.type !== "text" && n.data.componentId === componentId
  );
  if (existing) {
    wireComponentIntoPath(componentId);
    relayoutMyDesign();
    useCanvasStore.getState().setSelectedNode(existing.id);
    focusMyDesignOnCanvas();
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
      maxQPS: component.maxQPS,
      latencyMs: component.latencyMs,
      scalable: component.scalable,
    },
  };

  addNode(newNode);
  wireComponentIntoPath(componentId);
  relayoutMyDesign();
  useCanvasStore.getState().setSelectedNode(id);
  focusMyDesignOnCanvas();
  return id;
}
