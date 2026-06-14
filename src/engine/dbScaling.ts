import type { ComponentNodeData } from "@/store/canvasStore";
import { isStorageComponent } from "@/engine/cacheTraffic";
import { TARGET_UTILIZATION } from "@/engine/constants";

export const MAX_AUTO_SHARDS = 32;

const EXTRA_SHARDABLE_IDS = new Set([
  "graph-db",
  "timeseries-db",
  "vector-db",
  "file-store",
  "geospatial-index",
  "data-warehouse",
]);

/** Databases and durable stores that scale via shards and/or read replicas. */
export function supportsDbScaling(componentId: string): boolean {
  return isStorageComponent(componentId) || EXTRA_SHARDABLE_IDS.has(componentId);
}

export function sanitizeShards(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : 1;
  return Math.max(1, n);
}

function sanitizeReplicas(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : 1;
  return Math.max(1, n);
}

/** Total horizontal capacity units (replicas × shards for databases, replicas otherwise). */
export function getCapacityUnits(
  data: Pick<ComponentNodeData, "componentId" | "replicas" | "shards">,
): number {
  const replicas = sanitizeReplicas(data.replicas);
  if (supportsDbScaling(data.componentId)) {
    return replicas * sanitizeShards(data.shards);
  }
  return replicas;
}

export function getEffectiveCapacity(
  data: Pick<ComponentNodeData, "componentId" | "maxQPS" | "replicas" | "shards">,
): number {
  const maxQPS =
    typeof data.maxQPS === "number" && Number.isFinite(data.maxQPS) && data.maxQPS > 0
      ? data.maxQPS
      : 0;
  return maxQPS * getCapacityUnits(data);
}

export function computeRequiredCapacityUnits(
  incomingQPS: number,
  maxQPS: number,
  targetUtil = TARGET_UTILIZATION,
): number {
  if (!Number.isFinite(maxQPS) || maxQPS <= 0 || incomingQPS <= 0) return 1;
  return Math.ceil(incomingQPS / (maxQPS * targetUtil));
}

export interface CapacitySuggestion {
  replicas: number;
  shards: number;
  suggestedReplicas: number;
  suggestedShards: number;
  scaleReplicas: boolean;
  scaleShards: boolean;
}

/** Suggest replica/shard counts to reach target utilization for a bottleneck. */
export function suggestCapacityScale(
  data: Pick<ComponentNodeData, "componentId" | "maxQPS" | "replicas" | "shards" | "scalable">,
  incomingQPS: number,
  maxReplicas: number,
): CapacitySuggestion {
  const replicas = sanitizeReplicas(data.replicas);
  const shards = sanitizeShards(data.shards);
  const required = computeRequiredCapacityUnits(incomingQPS, data.maxQPS);

  const base: CapacitySuggestion = {
    replicas,
    shards,
    suggestedReplicas: replicas,
    suggestedShards: shards,
    scaleReplicas: false,
    scaleShards: false,
  };

  if (required <= getCapacityUnits({ ...data, replicas, shards })) {
    return base;
  }

  if (supportsDbScaling(data.componentId)) {
    if (!data.scalable) {
      const suggestedShards = Math.min(MAX_AUTO_SHARDS, Math.ceil(required / replicas));
      if (suggestedShards > shards) {
        return {
          ...base,
          suggestedShards,
          scaleShards: true,
        };
      }
      return base;
    }

    const byReplicas = Math.min(maxReplicas, Math.ceil(required / shards));
    if (byReplicas > replicas) {
      return {
        ...base,
        suggestedReplicas: byReplicas,
        scaleReplicas: true,
      };
    }

    const byShards = Math.min(MAX_AUTO_SHARDS, Math.ceil(required / replicas));
    if (byShards > shards) {
      return {
        ...base,
        suggestedShards: byShards,
        scaleShards: true,
      };
    }

    return base;
  }

  if (data.scalable) {
    const suggestedReplicas = Math.min(maxReplicas, required);
    if (suggestedReplicas > replicas) {
      return {
        ...base,
        suggestedReplicas,
        scaleReplicas: true,
      };
    }
  }

  return base;
}

/** Scale down capacity units when load is manageable (prefers reducing shards first on DBs). */
export function suggestCapacityScaleDown(
  data: Pick<ComponentNodeData, "componentId" | "maxQPS" | "replicas" | "shards" | "scalable">,
  incomingQPS: number,
): CapacitySuggestion {
  const replicas = sanitizeReplicas(data.replicas);
  const shards = sanitizeShards(data.shards);
  const optimal = computeRequiredCapacityUnits(incomingQPS, data.maxQPS);

  const base: CapacitySuggestion = {
    replicas,
    shards,
    suggestedReplicas: replicas,
    suggestedShards: shards,
    scaleReplicas: false,
    scaleShards: false,
  };

  const current = getCapacityUnits({ ...data, replicas, shards });
  if (optimal >= current) return base;

  if (supportsDbScaling(data.componentId)) {
    let nextReplicas = replicas;
    let nextShards = shards;

    while (nextReplicas * nextShards > optimal && nextShards > 1) {
      nextShards -= 1;
    }
    while (nextReplicas * nextShards > optimal && nextReplicas > 1) {
      nextReplicas -= 1;
    }

    if (nextShards !== shards || nextReplicas !== replicas) {
      return {
        replicas,
        shards,
        suggestedReplicas: nextReplicas,
        suggestedShards: nextShards,
        scaleReplicas: nextReplicas !== replicas,
        scaleShards: nextShards !== shards,
      };
    }
    return base;
  }

  if (data.scalable && replicas > optimal) {
    return {
      ...base,
      suggestedReplicas: Math.max(1, optimal),
      scaleReplicas: true,
    };
  }

  return base;
}
