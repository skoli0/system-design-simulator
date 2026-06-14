import type { Edge, Node } from "@xyflow/react";
import type { ComponentNodeData } from "@/store/canvasStore";

export interface CanvasClipboard {
  nodes: Node[];
  edges: Edge[];
  copiedAt: number;
}

let clipboard: CanvasClipboard | null = null;

export function getCanvasClipboard(): CanvasClipboard | null {
  return clipboard;
}

export function setCanvasClipboard(payload: CanvasClipboard | null): void {
  clipboard = payload;
}

export function hasCanvasClipboard(): boolean {
  return clipboard != null && clipboard.nodes.length > 0;
}

/** Selected nodes plus edges that connect only within the selection. */
export function buildClipboardFromSelection(
  nodes: Node[],
  edges: Edge[],
  selectedNodeIds: string[],
): CanvasClipboard | null {
  if (selectedNodeIds.length === 0) return null;

  const selected = new Set(selectedNodeIds);
  const copiedNodes = nodes.filter((n) => selected.has(n.id));
  if (copiedNodes.length === 0) return null;

  const copiedEdges = edges.filter(
    (e) => selected.has(e.source) && selected.has(e.target),
  );

  return {
    nodes: JSON.parse(JSON.stringify(copiedNodes)) as Node[],
    edges: JSON.parse(JSON.stringify(copiedEdges)) as Edge[],
    copiedAt: Date.now(),
  };
}

function newNodeId(node: Node): string {
  if (node.type === "text") {
    return `text-${crypto.randomUUID().slice(0, 8)}`;
  }
  const compId = (node.data as ComponentNodeData).componentId ?? "node";
  return `${compId}-${crypto.randomUUID().slice(0, 8)}`;
}

/** Clone clipboard nodes/edges with fresh ids and a positional offset. */
export function pasteClipboardPayload(
  payload: CanvasClipboard,
  offset = { x: 48, y: 48 },
): { nodes: Node[]; edges: Edge[] } {
  const idMap = new Map<string, string>();

  const nodes = payload.nodes.map((n) => {
    const newId = newNodeId(n);
    idMap.set(n.id, newId);
    return {
      ...n,
      id: newId,
      position: {
        x: n.position.x + offset.x,
        y: n.position.y + offset.y,
      },
      selected: false,
    };
  });

  const edges = payload.edges.map((e) => {
    const source = idMap.get(e.source);
    const target = idMap.get(e.target);
    if (!source || !target) return null;
    return {
      ...e,
      id: `e-${source}-${target}-${crypto.randomUUID().slice(0, 6)}`,
      source,
      target,
    };
  }).filter((e): e is Edge => e != null);

  return { nodes, edges };
}
