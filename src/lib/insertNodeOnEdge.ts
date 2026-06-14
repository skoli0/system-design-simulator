import type { Edge, Node } from "@xyflow/react";
import { REF_NODE_HEIGHT, REF_NODE_WIDTH } from "@/lib/loadReference";
import { PLACE_SNAP_THRESHOLD } from "@/lib/nodeAlignment";
import { useCanvasStore } from "@/store/canvasStore";
import { wireNodeIntoPath } from "@/lib/wireComponent";

function nodeCenter(node: Node): { x: number; y: number } {
  const w = typeof node.width === "number" ? node.width : REF_NODE_WIDTH;
  const h = typeof node.height === "number" ? node.height : REF_NODE_HEIGHT;
  return { x: node.position.x + w / 2, y: node.position.y + h / 2 };
}

function yAligned(a: { y: number }, b: { y: number }, threshold: number): boolean {
  return Math.abs(a.y - b.y) <= threshold;
}

/** Point-to-segment distance; returns Infinity when projection falls outside the segment. */
function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  endpointMargin = 0.12,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);

  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  if (t < endpointMargin || t > 1 - endpointMargin) return Infinity;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

const SEGMENT_DISTANCE_THRESHOLD = REF_NODE_HEIGHT * 0.85 + PLACE_SNAP_THRESHOLD;
const COL_GAP_SLACK = 80;

/** Find an existing edge the new node was dropped on (between source and target). */
export function findEdgeToSplit(
  newNode: Node,
  nodes: Node[],
  edges: Edge[],
): Edge | null {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const center = nodeCenter(newNode);

  let best: { edge: Edge; dist: number } | null = null;

  for (const edge of edges) {
    if (edge.source === newNode.id || edge.target === newNode.id) continue;
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    if (!source || !target || source.type !== "component" || target.type !== "component") {
      continue;
    }

    const sc = nodeCenter(source);
    const tc = nodeCenter(target);
    const dist = distanceToSegment(center.x, center.y, sc.x, sc.y, tc.x, tc.y);
    if (dist > SEGMENT_DISTANCE_THRESHOLD) continue;

    if (!best || dist < best.dist) {
      best = { edge, dist };
    }
  }

  return best?.edge ?? null;
}

interface SpatialNeighbors {
  upstream: Node;
  downstream: Node;
}

/** Closest aligned neighbors on the left/right (or top/bottom) of the new node. */
export function findSpatialNeighbors(
  newNode: Node,
  nodes: Node[],
): SpatialNeighbors | null {
  const center = nodeCenter(newNode);
  const yThreshold = REF_NODE_HEIGHT * 0.75 + PLACE_SNAP_THRESHOLD;

  let upstream: Node | null = null;
  let downstream: Node | null = null;
  let bestLeftGap = Infinity;
  let bestRightGap = Infinity;

  for (const node of nodes) {
    if (node.id === newNode.id || node.type !== "component") continue;
    const nc = nodeCenter(node);
    if (!yAligned(center, nc, yThreshold)) continue;

    const dx = nc.x - center.x;
    if (dx < 0) {
      const gap = center.x - nc.x;
      if (gap < bestLeftGap) {
        bestLeftGap = gap;
        upstream = node;
      }
    } else if (dx > 0) {
      const gap = nc.x - center.x;
      if (gap < bestRightGap) {
        bestRightGap = gap;
        downstream = node;
      }
    }
  }

  if (!upstream || !downstream) return null;
  const maxGap = REF_NODE_WIDTH * 2.5 + COL_GAP_SLACK;
  if (bestLeftGap > maxGap || bestRightGap > maxGap) return null;

  return { upstream, downstream };
}

function edgeExists(edges: Edge[], source: string, target: string): boolean {
  return edges.some((e) => e.source === source && e.target === target);
}

/**
 * Insert a newly added node into the graph: split an existing edge (A→B → A→new→B)
 * or bridge spatial neighbors (A … new … B → A→new→B).
 * Falls back to reference/fallback wiring when neither applies.
 */
export function wireDroppedNode(newNodeId: string): number {
  const { nodes, edges, spliceNodeIntoEdge, addEdgeDirect } = useCanvasStore.getState();
  const newNode = nodes.find((n) => n.id === newNodeId);
  if (!newNode || newNode.type !== "component") return 0;

  const componentNodes = nodes.filter((n) => n.type === "component");

  const edgeToSplit = findEdgeToSplit(newNode, componentNodes, edges);
  if (edgeToSplit) {
    spliceNodeIntoEdge(newNodeId, edgeToSplit.id);
    return 2;
  }

  const neighbors = findSpatialNeighbors(newNode, componentNodes);
  if (neighbors) {
    const { upstream, downstream } = neighbors;
    const directEdge = edges.find(
      (e) => e.source === upstream.id && e.target === downstream.id,
    );
    if (directEdge) {
      spliceNodeIntoEdge(newNodeId, directEdge.id);
      return 2;
    }

    const liveEdges = useCanvasStore.getState().edges;
    let created = 0;

    if (!edgeExists(liveEdges, upstream.id, newNodeId)) {
      addEdgeDirect(upstream.id, newNodeId);
      created += 1;
    }
    if (!edgeExists(useCanvasStore.getState().edges, newNodeId, downstream.id)) {
      addEdgeDirect(newNodeId, downstream.id);
      created += 1;
    }
    if (created > 0) return created;
  }

  return wireNodeIntoPath(newNodeId);
}
