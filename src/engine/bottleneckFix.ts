import type { Node } from "@xyflow/react";
import type { ComponentNodeData } from "@/store/canvasStore";
import type { SimulationResult } from "@/types/simulation";
import { useCanvasStore } from "@/store/canvasStore";

/** Target utilization after scaling (headroom below the 80% critical threshold). */
export const TARGET_UTILIZATION = 0.65;
export const MAX_AUTO_REPLICAS = 50;

export interface BottleneckFix {
  nodeId: string;
  label: string;
  scalable: boolean;
  currentReplicas: number;
  suggestedReplicas: number;
  incomingQPS: number;
  perReplicaQPS: number;
  action: "scale" | "manual";
  hint?: string;
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

export function getBottleneckFixes(
  nodes: Node<ComponentNodeData>[],
  result: SimulationResult
): BottleneckFix[] {
  const fixes: BottleneckFix[] = [];

  for (const nodeId of result.bottleneckNodes) {
    const node = nodes.find((n) => n.id === nodeId);
    const metrics = result.nodeMetrics.get(nodeId);
    if (!node || !metrics) continue;

    const data = node.data;
    const maxQPS = data.maxQPS;
    const current = data.replicas ?? 1;

    if (data.scalable && Number.isFinite(maxQPS) && maxQPS > 0) {
      const suggested = Math.max(
        current,
        computeRequiredReplicas(metrics.incomingQPS, maxQPS)
      );
      if (suggested > current) {
        fixes.push({
          nodeId,
          label: data.label,
          scalable: true,
          currentReplicas: current,
          suggestedReplicas: suggested,
          incomingQPS: metrics.incomingQPS,
          perReplicaQPS: maxQPS,
          action: "scale",
        });
      } else {
        fixes.push({
          nodeId,
          label: data.label,
          scalable: true,
          currentReplicas: current,
          suggestedReplicas: current,
          incomingQPS: metrics.incomingQPS,
          perReplicaQPS: maxQPS,
          action: "manual",
          hint: "Already at max auto-scale (50 replicas) — reduce load or add caching",
        });
      }
    } else {
      fixes.push({
        nodeId,
        label: data.label,
        scalable: false,
        currentReplicas: current,
        suggestedReplicas: current,
        incomingQPS: metrics.incomingQPS,
        perReplicaQPS: maxQPS,
        action: "manual",
        hint:
          maxQPS === Infinity
            ? "Unlimited per-node capacity — check routing or upstream fan-in"
            : "Not horizontally scalable — add cache, shard data, or upgrade tier",
      });
    }
  }

  return fixes.sort((a, b) => b.incomingQPS - a.incomingQPS);
}

/** Apply replica scaling for all auto-fixable bottlenecks. Returns count applied. */
export function applyBottleneckFixes(fixes: BottleneckFix[]): number {
  const { updateNodeData } = useCanvasStore.getState();
  let applied = 0;

  for (const fix of fixes) {
    if (fix.action === "scale" && fix.suggestedReplicas > fix.currentReplicas) {
      updateNodeData(fix.nodeId, { replicas: fix.suggestedReplicas });
      applied += 1;
    }
  }

  return applied;
}

/** Scale a single bottleneck node to the suggested replica count. */
export function applySingleBottleneckFix(fix: BottleneckFix): boolean {
  if (fix.action !== "scale" || fix.suggestedReplicas <= fix.currentReplicas) {
    return false;
  }
  useCanvasStore.getState().updateNodeData(fix.nodeId, {
    replicas: fix.suggestedReplicas,
  });
  return true;
}
