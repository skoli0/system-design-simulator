import type { Edge, Node } from "@xyflow/react";
import type { ComponentNodeData } from "@/store/canvasStore";
import type { SimulationResult } from "@/types/simulation";
import { useCanvasStore } from "@/store/canvasStore";
import { runSimulation } from "@/engine/simulator";
import {
  cacheExistsButNotConnectedTo,
  hasCacheUpstreamOf,
  isStorageComponent,
} from "@/engine/cacheTraffic";
import {
  sanitizeShards,
  suggestCapacityScale,
  suggestCapacityScaleDown,
  supportsDbScaling,
} from "@/engine/dbScaling";
import { TARGET_UTILIZATION, UTILIZATION_WARNING } from "@/engine/constants";

export { TARGET_UTILIZATION };
export const MAX_AUTO_REPLICAS = 50;

export interface BottleneckFix {
  nodeId: string;
  label: string;
  scalable: boolean;
  currentReplicas: number;
  suggestedReplicas: number;
  currentShards: number;
  suggestedShards: number;
  incomingQPS: number;
  perReplicaQPS: number;
  action: "scale" | "manual";
  scaleReplicas: boolean;
  scaleShards: boolean;
  hint?: string;
}

export interface ReplicaAdjustment {
  nodeId: string;
  label: string;
  currentReplicas: number;
  suggestedReplicas: number;
  currentShards: number;
  suggestedShards: number;
  direction: "up" | "down";
}

export function computeRequiredReplicas(
  incomingQPS: number,
  maxQPS: number,
  targetUtil = TARGET_UTILIZATION
): number {
  if (!Number.isFinite(maxQPS) || maxQPS <= 0 || incomingQPS <= 0) return 1;
  return Math.min(
    MAX_AUTO_REPLICAS,
    Math.ceil(incomingQPS / (maxQPS * targetUtil))
  );
}

function storageBottleneckHint(
  nodeId: string,
  nodes: Node<ComponentNodeData>[],
  edges: { source: string; target: string }[],
): string | undefined {
  if (cacheExistsButNotConnectedTo(nodeId, nodes, edges)) {
    return "Cache is on the canvas but not connected to this database — wire cache → database so reads hit cache first";
  }
  if (!hasCacheUpstreamOf(nodeId, nodes, edges)) {
    return "Add a cache layer (Redis) between app servers and the database to absorb read traffic";
  }
  return undefined;
}

function formatScaleLabel(fix: BottleneckFix): string {
  const parts: string[] = [];
  if (fix.scaleReplicas && fix.suggestedReplicas !== fix.currentReplicas) {
    parts.push(`${fix.currentReplicas}→${fix.suggestedReplicas} replicas`);
  }
  if (fix.scaleShards && fix.suggestedShards !== fix.currentShards) {
    parts.push(`${fix.currentShards}→${fix.suggestedShards} shards`);
  }
  return parts.join(", ");
}

/** Scale-down adjustments when load is manageable (auto). Scale-up is manual via Scale bottlenecks. */
export function getReplicaAdjustments(
  nodes: Node<ComponentNodeData>[],
  result: SimulationResult,
): ReplicaAdjustment[] {
  const adjustments: ReplicaAdjustment[] = [];

  for (const node of nodes) {
    if (node.type === "text") continue;
    const data = node.data;
    const metrics = result.nodeMetrics.get(node.id);
    if (!metrics) continue;

    const canScale =
      data.scalable ||
      supportsDbScaling(data.componentId);
    if (!canScale || !Number.isFinite(data.maxQPS) || data.maxQPS <= 0) {
      continue;
    }

    const manageable =
      metrics.incomingQPS <= 0 || metrics.utilization <= UTILIZATION_WARNING;
    if (!manageable) continue;

    const suggestion = suggestCapacityScaleDown(data, metrics.incomingQPS);
    if (!suggestion.scaleReplicas && !suggestion.scaleShards) continue;

    adjustments.push({
      nodeId: node.id,
      label: data.label,
      currentReplicas: suggestion.replicas,
      suggestedReplicas: suggestion.suggestedReplicas,
      currentShards: suggestion.shards,
      suggestedShards: suggestion.suggestedShards,
      direction: "down",
    });
  }

  return adjustments.sort((a, b) => {
    const freedA =
      a.currentReplicas * a.currentShards - a.suggestedReplicas * a.suggestedShards;
    const freedB =
      b.currentReplicas * b.currentShards - b.suggestedReplicas * b.suggestedShards;
    return freedB - freedA;
  });
}

export function getBottleneckFixes(
  nodes: Node<ComponentNodeData>[],
  result: SimulationResult,
  edges: { source: string; target: string }[] = useCanvasStore.getState().edges,
): BottleneckFix[] {
  const fixes: BottleneckFix[] = [];

  for (const nodeId of result.bottleneckNodes) {
    const node = nodes.find((n) => n.id === nodeId);
    const metrics = result.nodeMetrics.get(nodeId);
    if (!node || !metrics) continue;

    const data = node.data;
    const maxQPS = data.maxQPS;
    const current = data.replicas ?? 1;
    const currentShards = sanitizeShards(data.shards);
    const isStorage = isStorageComponent(data.componentId);
    const dbScaling = supportsDbScaling(data.componentId);

    const suggestion = suggestCapacityScale(data, metrics.incomingQPS, MAX_AUTO_REPLICAS);
    const canAutoScale = suggestion.scaleReplicas || suggestion.scaleShards;

    if ((data.scalable || dbScaling) && Number.isFinite(maxQPS) && maxQPS > 0 && canAutoScale) {
      fixes.push({
        nodeId,
        label: data.label,
        scalable: true,
        currentReplicas: current,
        suggestedReplicas: suggestion.suggestedReplicas,
        currentShards,
        suggestedShards: suggestion.suggestedShards,
        incomingQPS: metrics.incomingQPS,
        perReplicaQPS: maxQPS,
        action: "scale",
        scaleReplicas: suggestion.scaleReplicas,
        scaleShards: suggestion.scaleShards,
      });
    } else if (data.scalable && Number.isFinite(maxQPS) && maxQPS > 0) {
      fixes.push({
        nodeId,
        label: data.label,
        scalable: true,
        currentReplicas: current,
        suggestedReplicas: current,
        currentShards,
        suggestedShards: currentShards,
        incomingQPS: metrics.incomingQPS,
        perReplicaQPS: maxQPS,
        action: "manual",
        scaleReplicas: false,
        scaleShards: false,
        hint: isStorage
          ? storageBottleneckHint(nodeId, nodes, edges) ??
            "Already at max capacity — add caching or more shards"
          : "Already at max auto-scale (50 replicas) — reduce load or add caching",
      });
    } else if (dbScaling) {
      fixes.push({
        nodeId,
        label: data.label,
        scalable: false,
        currentReplicas: current,
        suggestedReplicas: current,
        currentShards,
        suggestedShards: currentShards,
        incomingQPS: metrics.incomingQPS,
        perReplicaQPS: maxQPS,
        action: "manual",
        scaleReplicas: false,
        scaleShards: false,
        hint:
          storageBottleneckHint(nodeId, nodes, edges) ??
          "Already at max shards (32) — add cache, read replicas, or reduce load",
      });
    } else {
      fixes.push({
        nodeId,
        label: data.label,
        scalable: false,
        currentReplicas: current,
        suggestedReplicas: current,
        currentShards,
        suggestedShards: currentShards,
        incomingQPS: metrics.incomingQPS,
        perReplicaQPS: maxQPS,
        action: "manual",
        scaleReplicas: false,
        scaleShards: false,
        hint:
          isStorage
            ? storageBottleneckHint(nodeId, nodes, edges) ??
              "Not horizontally scalable — add cache, shard data, or upgrade tier"
            : maxQPS === Infinity
              ? "Unlimited per-node capacity — check routing or upstream fan-in"
              : "Not horizontally scalable — add cache, shard data, or upgrade tier",
      });
    }
  }

  return fixes.sort((a, b) => b.incomingQPS - a.incomingQPS);
}

function applyCapacityUpdate(
  nodeId: string,
  replicas: number,
  shards: number,
  scaleReplicas: boolean,
  scaleShards: boolean,
): boolean {
  const patch: Partial<ComponentNodeData> = {};
  if (scaleReplicas) patch.replicas = replicas;
  if (scaleShards) patch.shards = shards;
  if (Object.keys(patch).length === 0) return false;
  useCanvasStore.getState().updateNodeData(nodeId, patch);
  return true;
}

/** Apply replica/shard scaling (up or down). Returns count applied. */
export function applyReplicaAdjustments(adjustments: ReplicaAdjustment[]): number {
  let applied = 0;

  for (const adj of adjustments) {
    const changed =
      adj.suggestedReplicas !== adj.currentReplicas ||
      adj.suggestedShards !== adj.currentShards;
    if (!changed) continue;

    applyCapacityUpdate(
      adj.nodeId,
      adj.suggestedReplicas,
      adj.suggestedShards,
      adj.suggestedReplicas !== adj.currentReplicas,
      adj.suggestedShards !== adj.currentShards,
    );
    applied += 1;
  }

  return applied;
}

/** Apply scaling for all auto-fixable bottlenecks. Returns count applied. */
export function applyBottleneckFixes(fixes: BottleneckFix[]): number {
  let applied = 0;

  for (const fix of fixes) {
    if (fix.action !== "scale") continue;
    if (
      applyCapacityUpdate(
        fix.nodeId,
        fix.suggestedReplicas,
        fix.suggestedShards,
        fix.scaleReplicas,
        fix.scaleShards,
      )
    ) {
      applied += 1;
    }
  }

  return applied;
}

/** Scale a single bottleneck (replicas and/or shards). */
export function applySingleBottleneckFix(fix: BottleneckFix): boolean {
  if (fix.action !== "scale") return false;
  return applyCapacityUpdate(
    fix.nodeId,
    fix.suggestedReplicas,
    fix.suggestedShards,
    fix.scaleReplicas,
    fix.scaleShards,
  );
}

export function describeBottleneckScale(fix: BottleneckFix): string {
  return formatScaleLabel(fix);
}

/** Auto scale-down when load is manageable; re-runs simulation if capacity changed. */
export function autoScaleToLoad(
  nodes: Node<ComponentNodeData>[],
  edges: Edge[],
  requestsPerSec: number,
  result: SimulationResult,
): { result: SimulationResult; scaledDown: number } {
  const adjustments = getReplicaAdjustments(nodes, result);
  if (adjustments.length === 0) {
    return { result, scaledDown: 0 };
  }

  applyReplicaAdjustments(adjustments);

  const { nodes: updatedNodes } = useCanvasStore.getState();
  const componentNodes = updatedNodes.filter(
    (n) => n.type !== "text"
  ) as Node<ComponentNodeData>[];

  const nextResult = runSimulation(componentNodes, edges, requestsPerSec);

  return {
    result: nextResult,
    scaledDown: adjustments.length,
  };
}
