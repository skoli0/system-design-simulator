import type { Connection, Edge, Node } from "@xyflow/react";
import { REF_NODE_HEIGHT, REF_NODE_WIDTH } from "@/lib/loadReference";

/** Handle ids exposed on ComponentNode (each side supports source and/or target). */
export const HANDLE_IDS = {
  left: "left",
  right: "right",
  top: "top",
  topSource: "top-source",
  bottom: "bottom",
  bottomTarget: "bottom-target",
  leftSource: "left-source",
  rightTarget: "right-target",
} as const;

/** Pick source/target handle ids from relative node positions. */
export function pickEdgeHandles(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number },
  sourceSize: { w: number; h: number } = { w: REF_NODE_WIDTH, h: REF_NODE_HEIGHT },
  targetSize: { w: number; h: number } = { w: REF_NODE_WIDTH, h: REF_NODE_HEIGHT },
): { sourceHandle: string; targetHandle: string } {
  const sx = sourcePos.x + sourceSize.w / 2;
  const sy = sourcePos.y + sourceSize.h / 2;
  const tx = targetPos.x + targetSize.w / 2;
  const ty = targetPos.y + targetSize.h / 2;
  const dx = tx - sx;
  const dy = ty - sy;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDy > absDx * 0.55) {
    if (dy > 0) {
      return { sourceHandle: HANDLE_IDS.bottom, targetHandle: HANDLE_IDS.top };
    }
    return {
      sourceHandle: HANDLE_IDS.topSource,
      targetHandle: HANDLE_IDS.bottomTarget,
    };
  }

  if (dx >= 0) {
    return { sourceHandle: HANDLE_IDS.right, targetHandle: HANDLE_IDS.left };
  }
  return {
    sourceHandle: HANDLE_IDS.leftSource,
    targetHandle: HANDLE_IDS.rightTarget,
  };
}

/**
 * Ensure manual connections follow layout flow (left→right, top→bottom)
 * and attach handles that match node geometry.
 */
export function normalizeConnection(connection: Connection, nodes: Node[]): Connection {
  let { source, target } = connection;
  if (!source || !target) return connection;

  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);
  if (!sourceNode || !targetNode) return connection;

  const sw = typeof sourceNode.width === "number" ? sourceNode.width : REF_NODE_WIDTH;
  const sh = typeof sourceNode.height === "number" ? sourceNode.height : REF_NODE_HEIGHT;
  const tw = typeof targetNode.width === "number" ? targetNode.width : REF_NODE_WIDTH;
  const th = typeof targetNode.height === "number" ? targetNode.height : REF_NODE_HEIGHT;

  const scx = sourceNode.position.x + sw / 2;
  const scy = sourceNode.position.y + sh / 2;
  const tcx = targetNode.position.x + tw / 2;
  const tcy = targetNode.position.y + th / 2;
  const dx = tcx - scx;
  const dy = tcy - scy;

  // Swap when the drag created an edge that flows against the dominant axis
  // (e.g. bottom node → top node when stacked, or right → left in a row).
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx < 0) [source, target] = [target, source];
  } else if (dy < 0) {
    [source, target] = [target, source];
  }

  const src = nodes.find((n) => n.id === source)!;
  const tgt = nodes.find((n) => n.id === target)!;
  const handles = pickEdgeHandles(src.position, tgt.position);

  return {
    ...connection,
    source,
    target,
    sourceHandle: handles.sourceHandle,
    targetHandle: handles.targetHandle,
  };
}

/** Assign handle ids to edges based on laid-out node positions. */
export function assignHandlesToEdges(nodes: Node[], edges: Edge[]): Edge[] {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  return edges.map((e) => {
    const sourceNode = nodeById.get(e.source);
    const targetNode = nodeById.get(e.target);
    if (!sourceNode || !targetNode) return e;
    const handles = pickEdgeHandles(sourceNode.position, targetNode.position);
    return {
      ...e,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
    };
  });
}
