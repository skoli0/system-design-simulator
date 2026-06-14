import type { Node, Edge } from "@xyflow/react";
import { Position } from "@xyflow/react";
import type { Problem } from "@/types/problem";
import { getComponentById } from "@/data/components";
import { getProblemById } from "@/data/problems";
import { useCanvasStore, type ComponentNodeData } from "@/store/canvasStore";
import { useAppStore } from "@/store/appStore";
import { useSimulationStore } from "@/store/simulationStore";
import { loadFromProblemRequirements } from "@/lib/loadScale";

/** Fixed node footprint so handles and edges align consistently. */
export const REF_NODE_WIDTH = 148;
/** Matches ComponentNode rendered height (incl. reserved utilization row). */
export const REF_NODE_HEIGHT = 104;
const COL_GAP = 160;
const ROW_GAP = 96;

/**
 * Layer nodes left-to-right following the request path so edges run
 * horizontally between aligned handles.
 */
export function layoutNodesLeftToRight(
  nodes: Node<ComponentNodeData>[],
  edges: Edge[]
): Node<ComponentNodeData>[] {
  if (nodes.length === 0) return nodes;

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

  // Stable vertical ordering within a column
  for (const group of byLayer.values()) {
    group.sort((a, b) => a.localeCompare(b));
  }

  const positioned: Node<ComponentNodeData>[] = [];
  const maxLayer = Math.max(...byLayer.keys());

  for (let col = 0; col <= maxLayer; col++) {
    const group = byLayer.get(col) ?? [];
    const totalHeight =
      group.length * REF_NODE_HEIGHT + Math.max(0, group.length - 1) * ROW_GAP;
    const startY = -totalHeight / 2 + REF_NODE_HEIGHT / 2;

    group.forEach((id, row) => {
      const n = idToNode.get(id)!;
      positioned.push({
        ...n,
        position: {
          x: col * (REF_NODE_WIDTH + COL_GAP),
          y: startY + row * (REF_NODE_HEIGHT + ROW_GAP),
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        width: REF_NODE_WIDTH,
        height: REF_NODE_HEIGHT,
      });
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
        data: { label: "", protocol: "http", async: false },
      });
    }
  }

  const nodes = layoutNodesLeftToRight(refNodes, refEdges);
  return { nodes, edges: refEdges };
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

  loadReferenceIntoTab(problem, { silent: true });
}
