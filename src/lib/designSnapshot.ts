import type { Node } from "@xyflow/react";
import {
  useCanvasStore,
  type ComponentNodeData,
  isEditableDesignTab,
  isHomeView,
} from "@/store/canvasStore";
import { useAppStore } from "@/store/appStore";
import { usePenStore, type Stroke } from "@/store/penStore";
import { useSimulationStore } from "@/store/simulationStore";
import {
  serializeNodes,
  serializeEdges,
  type SerializedNode,
  type SerializedEdge,
} from "@/store/savedDesignsStore";

export interface DesignSnapshot {
  problemId: string | null;
  tabId?: string;
  tabLabel?: string;
  nodes: SerializedNode[];
  edges: SerializedEdge[];
  strokes: Stroke[];
}

/** Snapshot the active editable design tab. Returns empty snapshot on home view. */
export function captureActiveDesignSnapshot(): DesignSnapshot {
  const canvas = useCanvasStore.getState();
  if (isHomeView(canvas.activeTabId)) {
    return {
      problemId: useAppStore.getState().selectedProblemId,
      nodes: [],
      edges: [],
      strokes: usePenStore.getState().strokes,
    };
  }

  const tab = canvas.tabs.find((t) => t.id === canvas.activeTabId);
  const editable = isEditableDesignTab(tab);

  let nodes = canvas.nodes;
  let edges = canvas.edges;
  let tabId = canvas.activeTabId ?? undefined;
  let tabLabel = tab?.label;

  if (!editable && tab) {
    nodes = tab.nodes ?? [];
    edges = tab.edges ?? [];
  }

  return {
    problemId: useAppStore.getState().selectedProblemId,
    tabId,
    tabLabel,
    nodes: serializeNodes(nodes),
    edges: serializeEdges(edges),
    strokes: usePenStore.getState().strokes,
  };
}

/** @deprecated Use captureActiveDesignSnapshot. */
export function captureMyDesignSnapshot(): DesignSnapshot {
  return captureActiveDesignSnapshot();
}

export function snapshotFingerprint(snapshot: DesignSnapshot): string {
  return JSON.stringify({
    problemId: snapshot.problemId,
    tabId: snapshot.tabId,
    nodes: snapshot.nodes,
    edges: snapshot.edges,
    strokes: snapshot.strokes,
  });
}

export function activeDesignHasContent(): boolean {
  const { nodes, edges, activeTabId, tabs } = useCanvasStore.getState();
  if (isHomeView(activeTabId)) return false;
  const tab = tabs.find((t) => t.id === activeTabId);
  if (!isEditableDesignTab(tab)) return false;
  if (activeTabId === tab?.id) {
    return nodes.length > 0 || edges.length > 0;
  }
  return (tab?.nodes.length ?? 0) > 0 || (tab?.edges.length ?? 0) > 0;
}

export function myDesignHasContent(): boolean {
  return activeDesignHasContent();
}

function deserializeSnapshotNodes(snapshot: DesignSnapshot): Node[] {
  return snapshot.nodes.map((n) => {
    if (n.type === "text") {
      return {
        id: n.id,
        type: n.type,
        position: n.position,
        connectable: false,
        data: {
          text: (n.data as { text?: string }).text ?? "",
          fontSize: (n.data as { fontSize?: "sm" | "base" | "lg" }).fontSize,
        },
      };
    }
    return {
      id: n.id,
      type: n.type,
      position: n.position,
      data: { ...n.data } as ComponentNodeData,
    };
  });
}

function deserializeSnapshotEdges(snapshot: DesignSnapshot) {
  return snapshot.edges.map((e) => ({
    id: e.id,
    type: e.type,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
    data: {
      label: e.data?.label ?? "",
      protocol: e.data?.protocol ?? "http",
      async: e.data?.async ?? false,
    },
  }));
}

export function restoreSnapshotToCanvas(snapshot: DesignSnapshot): void {
  const restoredNodes = deserializeSnapshotNodes(snapshot);
  const restoredEdges = deserializeSnapshotEdges(snapshot);

  useCanvasStore.getState().ensureActiveDesignTab();
  useCanvasStore.getState().loadActiveTabContent(restoredNodes, restoredEdges);

  usePenStore.getState().setStrokes(snapshot.strokes ?? []);
  if (snapshot.problemId) {
    useAppStore.getState().setSelectedProblem(snapshot.problemId);
  }
  useSimulationStore.getState().reset();
}
