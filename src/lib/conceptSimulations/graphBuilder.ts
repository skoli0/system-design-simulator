import type { Node, Edge } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { getComponentById } from "@/data/components";
import type { ComponentNodeData, CustomEdgeData } from "@/store/canvasStore";
import { assignHandlesToEdges } from "@/lib/edgeHandles";
import { REF_NODE_WIDTH, REF_NODE_HEIGHT } from "@/lib/loadReference";

export function componentNode(
  id: string,
  componentId: string,
  x: number,
  y: number,
  labelOverride?: string,
): Node<ComponentNodeData> {
  const comp = getComponentById(componentId);
  if (!comp) throw new Error(`Unknown component: ${componentId}`);

  return {
    id,
    type: "component",
    position: { x, y },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    width: REF_NODE_WIDTH,
    height: REF_NODE_HEIGHT,
    data: {
      componentId: comp.id,
      label: labelOverride ?? comp.label,
      icon: comp.icon,
      category: comp.category,
      replicas: 1,
      shards: 1,
      maxQPS: comp.maxQPS,
      latencyMs: comp.latencyMs,
      scalable: comp.scalable,
    },
  };
}

export function textLabel(
  id: string,
  text: string,
  x: number,
  y: number,
  fontSize: "sm" | "base" | "lg" = "sm",
): Node {
  return {
    id,
    type: "text",
    position: { x, y },
    data: { text, fontSize },
    style: { width: 160 },
  };
}

export function conceptEdge(
  id: string,
  source: string,
  target: string,
  data: Partial<CustomEdgeData> = {},
): Edge {
  return {
    id,
    source,
    target,
    type: "animated",
    data: {
      label: "",
      protocol: "http",
      async: false,
      pathStyle: "elbow",
      ...data,
    },
  };
}

export function finalizeGraph(
  nodes: Node[],
  edges: Edge[],
): { nodes: Node[]; edges: Edge[] } {
  const normalized = normalizeGraphPositions(nodes);
  const componentNodes = normalized.filter((n) => n.type === "component") as Node<ComponentNodeData>[];
  const routed = assignHandlesToEdges(componentNodes, edges);
  return { nodes: normalized, edges: routed };
}

/** Shift nodes so nothing sits off the left/top edge — keeps fitView reliable. */
function normalizeGraphPositions(nodes: Node[], padding = 48): Node[] {
  if (nodes.length === 0) return nodes;
  let minX = Infinity;
  let minY = Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
  }
  const dx = minX < padding ? padding - minX : 0;
  const dy = minY < padding ? padding - minY : 0;
  if (dx === 0 && dy === 0) return nodes;
  return nodes.map((n) => ({
    ...n,
    position: { x: n.position.x + dx, y: n.position.y + dy },
  }));
}
