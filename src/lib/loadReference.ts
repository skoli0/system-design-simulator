import type { Node, Edge } from "@xyflow/react";
import { Position } from "@xyflow/react";
import type { Problem } from "@/types/problem";
import { getComponentById } from "@/data/components";
import { getProblemById } from "@/data/problems";
import { useCanvasStore, type ComponentNodeData } from "@/store/canvasStore";
import { useAppStore } from "@/store/appStore";
import { useSimulationStore } from "@/store/simulationStore";
import { assignHandlesToEdges } from "@/lib/edgeHandles";
import { edgeDataForComponents } from "@/lib/edgeDefaults";
import { loadFromProblemRequirements } from "@/lib/loadScale";

/** Fixed node footprint so handles and edges align consistently. */
export const REF_NODE_WIDTH = 148;
/** Matches ComponentNode rendered height (incl. reserved utilization row). */
export const REF_NODE_HEIGHT = 104;
const COL_GAP = 160;
const ROW_GAP = 96;

/** Entry-side components pinned in column 0 (top → bottom). */
const ENTRY_STACK_ORDER = ["dns", "client", "cdn"] as const;

function getComponentId(node: Node<ComponentNodeData>): string {
  return node.data.componentId;
}

function isEntryStackComponent(componentId: string): boolean {
  return (ENTRY_STACK_ORDER as readonly string[]).includes(componentId);
}

function nodeStyle(
  n: Node<ComponentNodeData>,
  x: number,
  y: number
): Node<ComponentNodeData> {
  return {
    ...n,
    position: { x, y },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    width: REF_NODE_WIDTH,
    height: REF_NODE_HEIGHT,
  };
}

function computeRestNodeLayers(
  restNodes: Node<ComponentNodeData>[],
  edges: Edge[],
  stackIds: Set<string>,
  restIds: Set<string>
): Map<string, number> {
  const layer = new Map<string, number>();
  const maxLayer = restNodes.length + 1;

  const relax = (targetId: string, nextLayer: number): boolean => {
    if (nextLayer > maxLayer) return false;
    const cur = layer.get(targetId) ?? 0;
    if (nextLayer <= cur) return false;
    layer.set(targetId, nextLayer);
    return true;
  };

  // BFS longest-path layering from entry stack — always terminates
  const queue: string[] = [];
  for (const e of edges) {
    if (stackIds.has(e.source) && restIds.has(e.target) && relax(e.target, 1)) {
      queue.push(e.target);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const id = queue[head++];
    const l = layer.get(id)!;
    for (const e of edges) {
      if (e.source !== id || !restIds.has(e.target)) continue;
      if (relax(e.target, l + 1)) queue.push(e.target);
    }
  }

  let maxAssigned = 1;
  for (const n of restNodes) {
    if (!layer.has(n.id)) layer.set(n.id, 1);
    maxAssigned = Math.max(maxAssigned, layer.get(n.id)!);
  }

  for (const n of restNodes) {
    const hasInbound = edges.some((e) => e.target === n.id);
    if (!hasInbound) layer.set(n.id, maxAssigned + 1);
  }

  return layer;
}

/** Original column layout when no DNS/client/CDN entry stack is present. */
function layoutTopologicalColumns(
  nodes: Node<ComponentNodeData>[],
  edges: Edge[]
): Node<ComponentNodeData>[] {
  const ids = new Set(nodes.map((n) => n.id));
  const inDeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) {
    inDeg.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) continue;
    adj.get(e.source)!.push(e.target);
    inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1);
  }

  const layer = new Map<string, number>();
  const remaining = new Map(inDeg);
  const queue: string[] = nodes
    .filter((n) => (inDeg.get(n.id) ?? 0) === 0)
    .map((n) => n.id);

  for (const id of queue) layer.set(id, 0);

  let head = 0;
  while (head < queue.length) {
    const id = queue[head++];
    const l = layer.get(id) ?? 0;
    for (const child of adj.get(id) ?? []) {
      layer.set(child, Math.max(layer.get(child) ?? 0, l + 1));
      const deg = (remaining.get(child) ?? 1) - 1;
      remaining.set(child, deg);
      if (deg === 0) queue.push(child);
    }
  }

  const maxAssigned = Math.max(0, ...layer.values());
  for (const n of nodes) {
    if (!layer.has(n.id)) layer.set(n.id, maxAssigned + 1);
  }

  const byLayer = new Map<number, string[]>();
  for (const n of nodes) {
    const l = layer.get(n.id) ?? 0;
    const group = byLayer.get(l) ?? [];
    group.push(n.id);
    byLayer.set(l, group);
  }

  const idToNode = new Map(nodes.map((n) => [n.id, n]));

  for (const group of byLayer.values()) {
    group.sort((a, b) => a.localeCompare(b));
  }

  const positioned: Node<ComponentNodeData>[] = [];
  const maxLayer = Math.max(...byLayer.keys());
  const colWidth = REF_NODE_WIDTH + COL_GAP;

  for (let col = 0; col <= maxLayer; col++) {
    const group = byLayer.get(col) ?? [];
    const totalHeight =
      group.length * REF_NODE_HEIGHT + Math.max(0, group.length - 1) * ROW_GAP;
    const startY = -totalHeight / 2 + REF_NODE_HEIGHT / 2;

    group.forEach((id, row) => {
      const n = idToNode.get(id)!;
      positioned.push(
        nodeStyle(n, col * colWidth, startY + row * (REF_NODE_HEIGHT + ROW_GAP))
      );
    });
  }

  return positioned;
}

/**
 * Layer nodes left-to-right following the request path so edges run
 * horizontally between aligned handles.
 *
 * DNS, Users/Client, and CDN share column 0 with DNS above client and CDN
 * below; all downstream columns align vertically to the client row.
 */
export function layoutNodesLeftToRight(
  nodes: Node<ComponentNodeData>[],
  edges: Edge[]
): Node<ComponentNodeData>[] {
  if (nodes.length === 0) return nodes;

  const idToNode = new Map(nodes.map((n) => [n.id, n]));
  const stackNodes: Node<ComponentNodeData>[] = [];
  const restNodes: Node<ComponentNodeData>[] = [];

  for (const n of nodes) {
    if (isEntryStackComponent(getComponentId(n))) stackNodes.push(n);
    else restNodes.push(n);
  }

  if (stackNodes.length === 0) {
    return layoutTopologicalColumns(nodes, edges);
  }

  const stackIds = new Set(stackNodes.map((n) => n.id));
  const restIds = new Set(restNodes.map((n) => n.id));

  const stackByComponent = new Map<string, Node<ComponentNodeData>>();
  for (const n of stackNodes) {
    const cid = getComponentId(n);
    if (!stackByComponent.has(cid)) stackByComponent.set(cid, n);
  }

  const orderedStack = ENTRY_STACK_ORDER.map((id) => stackByComponent.get(id)).filter(
    (n): n is Node<ComponentNodeData> => n != null
  );

  const stackCount = orderedStack.length;
  const stackTotalHeight =
    stackCount * REF_NODE_HEIGHT + Math.max(0, stackCount - 1) * ROW_GAP;
  const stackStartY = -stackTotalHeight / 2 + REF_NODE_HEIGHT / 2;

  const positioned: Node<ComponentNodeData>[] = [];
  let clientCenterY = 0;

  orderedStack.forEach((n, i) => {
    const y = stackStartY + i * (REF_NODE_HEIGHT + ROW_GAP);
    if (getComponentId(n) === "client") clientCenterY = y;
    positioned.push(nodeStyle(n, 0, y));
  });

  if (!stackByComponent.has("client")) {
    clientCenterY =
      stackStartY + ((stackCount - 1) * (REF_NODE_HEIGHT + ROW_GAP)) / 2;
  }

  if (restNodes.length === 0) return positioned;

  const layer = computeRestNodeLayers(restNodes, edges, stackIds, restIds);

  const byLayer = new Map<number, string[]>();
  for (const n of restNodes) {
    const l = layer.get(n.id) ?? 1;
    const group = byLayer.get(l) ?? [];
    group.push(n.id);
    byLayer.set(l, group);
  }

  for (const group of byLayer.values()) {
    group.sort((a, b) => a.localeCompare(b));
  }

  const colWidth = REF_NODE_WIDTH + COL_GAP;
  const maxLayer = Math.max(...byLayer.keys());

  for (let col = 1; col <= maxLayer; col++) {
    const group = byLayer.get(col) ?? [];
    const totalHeight =
      group.length * REF_NODE_HEIGHT + Math.max(0, group.length - 1) * ROW_GAP;
    const startY = clientCenterY - totalHeight / 2 + REF_NODE_HEIGHT / 2;

    group.forEach((id, row) => {
      const n = idToNode.get(id)!;
      positioned.push(
        nodeStyle(n, col * colWidth, startY + row * (REF_NODE_HEIGHT + ROW_GAP))
      );
    });
  }

  return positioned;
}

/**
 * Build canvas nodes + edges for a problem's reference solution.
 *
 * Instance matching is EXACT on componentId (never prefix-based):
 * - Each reference node becomes a unique instance, tracked per componentId in order.
 * - Edge endpoints referencing a componentId with N instances are connected
 *   round-robin by occurrence order (independent counters for source/target
 *   roles so chains like A -> B -> C stay connected through the same instance).
 */
export function buildReferenceGraph(problem: Problem): {
  nodes: Node<ComponentNodeData>[];
  edges: Edge[];
} {
  const instancesByComponent = new Map<string, string[]>();
  const refNodes: Node<ComponentNodeData>[] = [];

  problem.referenceSolution.nodes.forEach((ref, index) => {
    const comp = getComponentById(ref.componentId);
    if (!comp) return;

    const nodeId = `${comp.id}-ref-${index}`;
    const list = instancesByComponent.get(ref.componentId) ?? [];
    list.push(nodeId);
    instancesByComponent.set(ref.componentId, list);

    refNodes.push({
      id: nodeId,
      type: "component",
      position: { x: 0, y: 0 },
      data: {
        componentId: comp.id,
        label: comp.label,
        icon: comp.icon,
        category: comp.category,
        replicas: 1,
        shards: 1,
        maxQPS: comp.maxQPS,
        latencyMs: comp.latencyMs,
        scalable: comp.scalable,
      },
    });
  });

  const rrCounters = new Map<string, number>();
  const nextInstance = (
    componentId: string,
    role: "source" | "target"
  ): string | undefined => {
    const instances = instancesByComponent.get(componentId);
    if (!instances || instances.length === 0) return undefined;
    const key = `${componentId}#${role}`;
    const count = rrCounters.get(key) ?? 0;
    rrCounters.set(key, count + 1);
    return instances[count % instances.length];
  };

  const refEdges: Edge[] = [];
  for (const ref of problem.referenceSolution.edges) {
    const sourceId = nextInstance(ref.source, "source");
    const targetId = nextInstance(ref.target, "target");
    if (sourceId && targetId) {
      refEdges.push({
        id: `e-${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        type: "animated",
        data: edgeDataForComponents(ref.source, ref.target, "elbow"),
      });
    }
  }

  const nodes = layoutNodesLeftToRight(refNodes, refEdges);
  const edges = assignHandlesToEdges(nodes, refEdges);
  return { nodes, edges };
}

/**
 * Open a problem's reference solution in a read-only canvas tab.
 * The user's current design stays untouched in its own tab.
 */
export function loadReferenceIntoTab(
  problem: Problem,
  options?: { silent?: boolean; activate?: boolean }
): void {
  if (!problem.referenceSolution.nodes.length) return;

  const { nodes, edges } = buildReferenceGraph(problem);

  useCanvasStore.getState().addTab(
    {
      id: `ref-${problem.id}`,
      label: `${problem.title} (Reference)`,
      nodes,
      edges,
      readOnly: true,
    },
    { activate: options?.activate ?? true }
  );

  if (!options?.silent) {
    useAppStore
      .getState()
      .showToast("Reference opened in new tab — your design is safe", "success");
  }
}

/** Align simulation load with a problem's read throughput target. */
export function syncSimulationLoadForProblem(problem: Problem): void {
  const rps = loadFromProblemRequirements(problem.requirements.readsPerSec);
  useSimulationStore.getState().setConfig({ requestsPerSec: rps });
}

/** Select a problem and open its reference architecture on the canvas. */
export function selectProblemWithReference(problemId: string): void {
  useAppStore.getState().setSelectedProblem(problemId);

  const problem = getProblemById(problemId);
  if (problem) {
    syncSimulationLoadForProblem(problem);
  }

  if (!problem?.referenceSolution.nodes.length) {
    if (problemId.startsWith("custom-")) {
      useAppStore
        .getState()
        .showToast("Custom problems have no reference architecture", "info");
    }
    return;
  }

  // Build off the click handler so the UI stays responsive
  requestAnimationFrame(() => {
    loadReferenceIntoTab(problem, { silent: true });
  });
}
