import type { Node } from "@xyflow/react";
import { useCanvasStore, type ComponentNodeData } from "@/store/canvasStore";
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
  nodes: SerializedNode[];
  edges: SerializedEdge[];
  strokes: Stroke[];
}

/** Read the editable "My Design" tab content (not the active reference tab). */
export function captureMyDesignSnapshot(): DesignSnapshot {
  const canvas = useCanvasStore.getState();
  let nodes = canvas.nodes;
  let edges = canvas.edges;

  if (canvas.activeTabId !== "my-design") {
    const tab = canvas.tabs.find((t) => t.id === "my-design");
    nodes = tab?.nodes ?? [];
    edges = tab?.edges ?? [];
  }

  return {
    problemId: useAppStore.getState().selectedProblemId,
    nodes: serializeNodes(nodes),
    edges: serializeEdges(edges),
    strokes: usePenStore.getState().strokes,
  };
}

export function snapshotFingerprint(snapshot: DesignSnapshot): string {
  return JSON.stringify({
    problemId: snapshot.problemId,
    nodes: snapshot.nodes,
    edges: snapshot.edges,
    strokes: snapshot.strokes,
  });
}

export function myDesignHasContent(): boolean {
  const { nodes, edges, activeTabId, tabs } = useCanvasStore.getState();
  if (activeTabId === "my-design") {
    return nodes.length > 0 || edges.length > 0;
  }
  const tab = tabs.find((t) => t.id === "my-design");
  return (tab?.nodes.length ?? 0) > 0 || (tab?.edges.length ?? 0) > 0;
}

export function restoreSnapshotToCanvas(snapshot: DesignSnapshot): void {
  const restoredNodes: Node[] = snapshot.nodes.map((n) => {
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

  const restoredEdges = snapshot.edges.map((e) => ({
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

  useCanvasStore.getState().loadMyDesignContent(restoredNodes, restoredEdges);
  usePenStore.getState().setStrokes(snapshot.strokes ?? []);
  if (snapshot.problemId) {
    useAppStore.getState().setSelectedProblem(snapshot.problemId);
  }
  useSimulationStore.getState().reset();
}
