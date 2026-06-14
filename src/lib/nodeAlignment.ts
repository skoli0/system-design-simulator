import type { Node } from "@xyflow/react";
import { REF_NODE_HEIGHT, REF_NODE_WIDTH } from "@/lib/loadReference";

export const GRID_SIZE = 8;
export const SNAP_THRESHOLD = 12;
/** Wider snap when placing or finishing a drag — compensates for imprecise mouse drops. */
export const PLACE_SNAP_THRESHOLD = 20;

export interface AlignmentGuide {
  type: "horizontal" | "vertical";
  /** Flow-space x (vertical guide) or y (horizontal guide). */
  value: number;
}

function nodeSize(node: Node): { w: number; h: number } {
  const w = typeof node.width === "number" ? node.width : REF_NODE_WIDTH;
  const h = typeof node.height === "number" ? node.height : REF_NODE_HEIGHT;
  return { w, h };
}

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

/** Snap a dragged node to aligned edges/centers of peer component nodes. */
export function snapNodeAlignment(
  dragged: Node,
  allNodes: Node[],
  threshold = SNAP_THRESHOLD,
): { position: { x: number; y: number }; guides: AlignmentGuide[] } {
  const peers = allNodes.filter((n) => n.id !== dragged.id && n.type === "component");
  if (peers.length === 0) {
    return {
      position: {
        x: snapToGrid(dragged.position.x),
        y: snapToGrid(dragged.position.y),
      },
      guides: [],
    };
  }

  const { w, h } = nodeSize(dragged);
  let { x, y } = dragged.position;

  let bestXDelta = threshold + 1;
  let bestYDelta = threshold + 1;
  const verticalGuides = new Set<number>();
  const horizontalGuides = new Set<number>();

  const xRefs = (px: number) => [px, px + w / 2, px + w];
  const yRefs = (py: number) => [py, py + h / 2, py + h];

  for (const peer of peers) {
    const { w: pw, h: ph } = nodeSize(peer);
    const ox = peer.position.x;
    const oy = peer.position.y;
    const peerXPoints = [ox, ox + pw / 2, ox + pw];
    const peerYPoints = [oy, oy + ph / 2, oy + ph];

    for (const dx of xRefs(x)) {
      for (const px of peerXPoints) {
        const delta = px - dx;
        if (Math.abs(delta) <= threshold) {
          verticalGuides.add(px);
          if (Math.abs(delta) < Math.abs(bestXDelta)) bestXDelta = delta;
        }
      }
    }

    for (const dy of yRefs(y)) {
      for (const py of peerYPoints) {
        const delta = py - dy;
        if (Math.abs(delta) <= threshold) {
          horizontalGuides.add(py);
          if (Math.abs(delta) < Math.abs(bestYDelta)) bestYDelta = delta;
        }
      }
    }
  }

  if (Math.abs(bestXDelta) <= threshold) x += bestXDelta;
  if (Math.abs(bestYDelta) <= threshold) y += bestYDelta;

  x = snapToGrid(x);
  y = snapToGrid(y);

  if (horizontalGuides.size > 0) {
    for (const ref of yRefs(y)) {
      for (const py of horizontalGuides) {
        if (Math.abs(ref - py) <= threshold) {
          horizontalGuides.add(ref);
        }
      }
    }
  }

  const guides: AlignmentGuide[] = [
    ...verticalGuides.values().map((value) => ({ type: "vertical" as const, value })),
    ...horizontalGuides.values().map((value) => ({ type: "horizontal" as const, value })),
  ];

  return { position: { x, y }, guides };
}

/** Final position after drop/add/drag-end: grid + peer alignment. */
export function resolveNodePosition(
  node: Node,
  allNodes: Node[],
  threshold = PLACE_SNAP_THRESHOLD,
): { x: number; y: number } {
  const gridSnapped = {
    ...node,
    position: {
      x: snapToGrid(node.position.x),
      y: snapToGrid(node.position.y),
    },
  };
  return snapNodeAlignment(gridSnapped, allNodes, threshold).position;
}

/**
 * When an edge is drawn, align the target node to the source row or column
 * so straight edges stay horizontal/vertical and handles line up cleanly.
 */
export function alignNodesForConnection(
  sourceId: string,
  targetId: string,
  nodes: Node[],
): Node[] {
  const source = nodes.find((n) => n.id === sourceId);
  const target = nodes.find((n) => n.id === targetId);
  if (!source || !target || source.type !== "component" || target.type !== "component") {
    return nodes;
  }

  const { w: sw, h: sh } = nodeSize(source);
  const { w: tw, h: th } = nodeSize(target);
  const sourceCenterX = source.position.x + sw / 2;
  const sourceCenterY = source.position.y + sh / 2;
  const targetCenterX = target.position.x + tw / 2;
  const targetCenterY = target.position.y + th / 2;
  const dx = targetCenterX - sourceCenterX;
  const dy = targetCenterY - sourceCenterY;

  if (Math.abs(dx) >= Math.abs(dy)) {
    const alignedY = snapToGrid(sourceCenterY - th / 2);
    return nodes.map((n) =>
      n.id === targetId ? { ...n, position: { x: snapToGrid(n.position.x), y: alignedY } } : n,
    );
  }

  const alignedX = snapToGrid(sourceCenterX - tw / 2);
  return nodes.map((n) =>
    n.id === targetId ? { ...n, position: { x: alignedX, y: snapToGrid(n.position.y) } } : n,
  );
}
