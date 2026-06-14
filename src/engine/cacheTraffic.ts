import type { Node } from "@xyflow/react";
import type { ComponentNodeData } from "@/store/canvasStore";

export const CACHE_COMPONENT_IDS = new Set(["cache", "cdn"]);
export const STORAGE_COMPONENT_IDS = new Set([
  "sql-db",
  "nosql-db",
  "object-storage",
  "search",
]);

export function isCacheComponent(componentId: string): boolean {
  return CACHE_COMPONENT_IDS.has(componentId);
}

export function isStorageComponent(componentId: string): boolean {
  return STORAGE_COMPONENT_IDS.has(componentId);
}

/** Typical hit rate used in simulation (miss traffic reaches durable storage). */
export function cacheHitRate(componentId: string): number {
  if (componentId === "cdn") return 0.9;
  if (componentId === "cache") return 0.85;
  return 0;
}

/**
 * Skip app→db when app→cache→db exists so reads aren't double-counted.
 */
export function shouldBypassDirectStorageEdge(
  sourceId: string,
  targetId: string,
  nodeMap: Map<string, Node<ComponentNodeData>>,
  adjacency: Map<string, string[]>,
): boolean {
  const target = nodeMap.get(targetId);
  if (!target || !isStorageComponent(target.data.componentId)) return false;

  for (const cacheId of adjacency.get(sourceId) ?? []) {
    const cacheNode = nodeMap.get(cacheId);
    if (!cacheNode || !isCacheComponent(cacheNode.data.componentId)) continue;
    if ((adjacency.get(cacheId) ?? []).includes(targetId)) return true;
  }
  return false;
}

/** QPS forwarded on an edge after cache hit-rate and routing rules. */
export function transferQps(
  sourceId: string,
  childId: string,
  deliveredOutput: number,
  defaultQps: number,
  nodeMap: Map<string, Node<ComponentNodeData>>,
  adjacency: Map<string, string[]>,
): number {
  if (shouldBypassDirectStorageEdge(sourceId, childId, nodeMap, adjacency)) {
    return 0;
  }

  const source = nodeMap.get(sourceId);
  const child = nodeMap.get(childId);
  if (
    source &&
    child &&
    isCacheComponent(source.data.componentId) &&
    isStorageComponent(child.data.componentId)
  ) {
    return deliveredOutput * (1 - cacheHitRate(source.data.componentId));
  }

  return defaultQps;
}

/** True when a cache sits upstream of `targetId` on the sync request path. */
export function hasCacheUpstreamOf(
  targetId: string,
  nodes: Node<ComponentNodeData>[],
  edges: { source: string; target: string }[],
): boolean {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const rev = new Map<string, string[]>();
  for (const n of nodes) rev.set(n.id, []);
  for (const e of edges) {
    if (nodeMap.has(e.source) && nodeMap.has(e.target)) {
      rev.get(e.target)!.push(e.source);
    }
  }

  const visited = new Set<string>();
  const queue = [targetId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const pred of rev.get(id) ?? []) {
      if (visited.has(pred)) continue;
      visited.add(pred);
      const node = nodeMap.get(pred);
      if (node && isCacheComponent(node.data.componentId)) return true;
      queue.push(pred);
    }
  }
  return false;
}

/** Cache exists on canvas but is not wired to the bottleneck storage node. */
export function cacheExistsButNotConnectedTo(
  storageNodeId: string,
  nodes: Node<ComponentNodeData>[],
  edges: { source: string; target: string }[],
): boolean {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const storage = nodeMap.get(storageNodeId);
  if (!storage || !isStorageComponent(storage.data.componentId)) return false;

  const cacheNodes = nodes.filter((n) => isCacheComponent(n.data.componentId));
  if (cacheNodes.length === 0) return false;

  const connectedToStorage = new Set(
    edges.filter((e) => e.target === storageNodeId).map((e) => e.source),
  );
  return cacheNodes.some((c) => !connectedToStorage.has(c.id));
}
