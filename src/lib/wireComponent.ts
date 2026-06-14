import type { Node, Edge } from "@xyflow/react";
import { getProblemById } from "@/data/problems";
import { useAppStore } from "@/store/appStore";
import {
  ensureMyDesignSeededFromReference,
  ensureMyDesignTabActive,
  focusMyDesignOnCanvas,
} from "@/lib/addComponentToCanvas";
import { useCanvasStore, type ComponentNodeData } from "@/store/canvasStore";
import { edgeDataForComponents } from "@/lib/edgeDefaults";

/** Build reachable node ids from entry points (mirrors scorer logic). */
function reachableNodeIds(
  nodes: Node<ComponentNodeData>[],
  edges: Edge[]
): Set<string> {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const n of nodes) {
    adjacency.set(n.id, []);
    inDegree.set(n.id, 0);
  }

  const seen = new Set<string>();
  let edgeCount = 0;
  for (const e of edges) {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target) || e.source === e.target)
      continue;
    const key = `${e.source}->${e.target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edgeCount++;
    adjacency.get(e.source)!.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }

  const reachable = new Set<string>();
  if (edgeCount === 0) {
    if (nodes.length === 1) reachable.add(nodes[0].id);
    return reachable;
  }

  const queue: string[] = [];
  for (const n of nodes) {
    if ((inDegree.get(n.id) ?? 0) === 0 && (adjacency.get(n.id)?.length ?? 0) > 0) {
      queue.push(n.id);
      reachable.add(n.id);
    }
  }
  let head = 0;
  while (head < queue.length) {
    const id = queue[head++];
    for (const child of adjacency.get(id) ?? []) {
      if (!reachable.has(child)) {
        reachable.add(child);
        queue.push(child);
      }
    }
  }
  return reachable;
}

export function isComponentOnRequestPath(
  nodes: Node<ComponentNodeData>[],
  edges: Edge[],
  componentId: string
): boolean {
  const node = nodes.find((n) => n.data.componentId === componentId);
  if (!node) return false;
  return reachableNodeIds(nodes, edges).has(node.id);
}

/** True when a specific load-balancer node has a path to compute. */
function isLoadBalancerNodeConnectedToCompute(
  lbNodeId: string,
  nodes: Node<ComponentNodeData>[],
  edges: Edge[]
): boolean {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const lb = nodeMap.get(lbNodeId);
  if (!lb || lb.data.componentId !== "load-balancer") return false;

  const adjacency = new Map<string, string[]>();
  for (const n of nodes) adjacency.set(n.id, []);
  const seen = new Set<string>();
  for (const e of edges) {
    if (!nodeMap.has(e.source) || !nodeMap.has(e.target) || e.source === e.target)
      continue;
    const key = `${e.source}->${e.target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    adjacency.get(e.source)!.push(e.target);
  }

  const reachesCompute = (startId: string): boolean => {
    const visited = new Set<string>();
    const queue = [startId];
    visited.add(startId);
    let head = 0;
    while (head < queue.length) {
      const id = queue[head++];
      for (const child of adjacency.get(id) ?? []) {
        if (visited.has(child)) continue;
        visited.add(child);
        if (nodeMap.get(child)?.data.category === "compute") return true;
        queue.push(child);
      }
    }
    return false;
  };

  for (const childId of adjacency.get(lbNodeId) ?? []) {
    const target = nodeMap.get(childId);
    if (!target) continue;
    if (target.data.category === "compute") return true;
    if (
      (target.data.componentId === "api-gateway" ||
        target.data.componentId === "rate-limiter") &&
      reachesCompute(childId)
    ) {
      return true;
    }
  }
  return false;
}

/** True when the load balancer has a path to scalable compute (direct or via gateway). */
export function isLoadBalancerConnectedToCompute(
  nodes: Node<ComponentNodeData>[],
  edges: Edge[]
): boolean {
  const lbNodes = nodes.filter((n) => n.data.componentId === "load-balancer");
  if (lbNodes.length === 0) return false;
  if (!nodes.some((n) => n.data.category === "compute")) return false;
  return lbNodes.some((lb) =>
    isLoadBalancerNodeConnectedToCompute(lb.id, nodes, edges)
  );
}

function findFirstNode(
  nodes: Node<ComponentNodeData>[],
  componentId: string
): Node<ComponentNodeData> | undefined {
  return nodes.find((n) => n.data.componentId === componentId);
}

function edgeExists(edges: Edge[], source: string, target: string): boolean {
  return edges.some((e) => e.source === source && e.target === target);
}

function isAsyncEdge(sourceId: string, targetId: string, nodes: Node<ComponentNodeData>[]): boolean {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const source = byId.get(sourceId);
  const target = byId.get(targetId);
  return (
    source?.data.componentId === "message-queue" ||
    target?.data.componentId === "message-queue" ||
    source?.data.componentId === "stream-processor"
  );
}

function getReferenceWiring(componentId: string): {
  incoming: string[];
  outgoing: string[];
} {
  const problem = getProblemById(useAppStore.getState().selectedProblemId);
  if (!problem) return { incoming: [], outgoing: [] };

  const incoming: string[] = [];
  const outgoing: string[] = [];
  for (const e of problem.referenceSolution.edges) {
    if (e.target === componentId) incoming.push(e.source);
    if (e.source === componentId) outgoing.push(e.target);
  }
  return { incoming, outgoing };
}

/** Fallback wiring when reference edges are missing or partners aren't on canvas. */
function fallbackWiring(
  componentId: string,
  nodes: Node<ComponentNodeData>[]
): Array<{ source: string; target: string }> {
  const pairs: Array<{ source: string; target: string }> = [];
  const has = (id: string) => nodes.some((n) => n.data.componentId === id);

  const pick = (...ids: string[]) => ids.find(has);

  switch (componentId) {
    case "message-queue": {
      const producer = pick("app-server", "api-gateway", "load-balancer");
      if (producer) pairs.push({ source: producer, target: "message-queue" });
      const consumer = pick(
        "stream-processor",
        "nosql-db",
        "sql-db",
        "app-server"
      );
      if (consumer && consumer !== producer) {
        pairs.push({ source: "message-queue", target: consumer });
      }
      break;
    }
    case "cache": {
      const app = pick("app-server", "api-gateway", "stream-processor");
      const db = pick("nosql-db", "sql-db", "search");
      if (app) pairs.push({ source: app, target: "cache" });
      if (db) pairs.push({ source: "cache", target: db });
      break;
    }
    case "load-balancer": {
      const entry = pick("client", "dns", "cdn", "api-gateway");
      const compute = pick("app-server");
      if (entry) pairs.push({ source: entry, target: "load-balancer" });
      if (compute) pairs.push({ source: "load-balancer", target: compute });
      break;
    }
    case "cdn": {
      const entry = pick("client", "dns");
      const origin = pick("load-balancer", "app-server", "api-gateway");
      if (entry) pairs.push({ source: entry, target: "cdn" });
      if (origin) pairs.push({ source: "cdn", target: origin });
      break;
    }
    case "dns": {
      const client = pick("client");
      const cdn = pick("cdn");
      if (client) pairs.push({ source: "client", target: "dns" });
      if (cdn) pairs.push({ source: "dns", target: "cdn" });
      break;
    }
    case "client": {
      if (has("dns")) pairs.push({ source: "client", target: "dns" });
      if (has("load-balancer")) pairs.push({ source: "client", target: "load-balancer" });
      if (has("cdn")) pairs.push({ source: "client", target: "cdn" });
      const fallback = pick("api-gateway", "app-server");
      if (fallback && !has("dns") && !has("load-balancer") && !has("cdn")) {
        pairs.push({ source: "client", target: fallback });
      }
      break;
    }
    case "app-server": {
      const upstream = pick("load-balancer", "api-gateway", "cdn", "dns");
      const downstream = pick("cache", "nosql-db", "sql-db", "message-queue");
      if (upstream) pairs.push({ source: upstream, target: "app-server" });
      if (downstream) pairs.push({ source: "app-server", target: downstream });
      break;
    }
    case "nosql-db":
    case "sql-db":
    case "object-storage": {
      const app = pick("app-server", "stream-processor", "message-queue");
      if (app) pairs.push({ source: app, target: componentId });
      break;
    }
    case "monitoring": {
      const target = pick("app-server", "load-balancer", "nosql-db");
      if (target) pairs.push({ source: target, target: "monitoring" });
      break;
    }
    case "api-gateway":
    case "rate-limiter": {
      const entry = pick("client", "dns", "cdn", "load-balancer");
      const compute = pick("app-server");
      if (entry) pairs.push({ source: entry, target: componentId });
      if (compute) pairs.push({ source: componentId, target: compute });
      break;
    }
    case "auth-service": {
      const app = pick("app-server", "api-gateway");
      if (app) pairs.push({ source: app, target: "auth-service" });
      break;
    }
    default:
      break;
  }
  return pairs;
}

function applyWirePairsForNode(
  nodeId: string,
  componentId: string,
  pairs: Array<{ sourceComp: string; targetComp: string }>,
  componentNodes: Node<ComponentNodeData>[]
): number {
  let created = 0;
  for (const { sourceComp, targetComp } of pairs) {
    const { edges: currentEdges, addEdgeDirect } = useCanvasStore.getState();
    const liveNodes = useCanvasStore
      .getState()
      .nodes.filter((n) => n.type !== "text") as Node<ComponentNodeData>[];
    const srcNode =
      sourceComp === componentId
        ? liveNodes.find((n) => n.id === nodeId)
        : findFirstNode(liveNodes, sourceComp);
    const tgtNode =
      targetComp === componentId
        ? liveNodes.find((n) => n.id === nodeId)
        : findFirstNode(liveNodes, targetComp);
    if (!srcNode || !tgtNode) continue;
    if (edgeExists(currentEdges, srcNode.id, tgtNode.id)) continue;

    const asyncEdge = isAsyncEdge(srcNode.id, tgtNode.id, componentNodes);
    const base = edgeDataForComponents(
      srcNode.data.componentId,
      tgtNode.data.componentId,
    );
    addEdgeDirect(
      srcNode.id,
      tgtNode.id,
      asyncEdge
        ? { ...base, label: "", protocol: "pubsub", async: true }
        : base,
    );
    created += 1;
  }
  return created;
}

function wiringPairsForComponent(
  componentId: string,
  componentNodes: Node<ComponentNodeData>[]
): Array<{ sourceComp: string; targetComp: string }> {
  const ref = getReferenceWiring(componentId);
  const pairs: Array<{ sourceComp: string; targetComp: string }> = [];

  for (const src of ref.incoming) {
    pairs.push({ sourceComp: src, targetComp: componentId });
  }
  for (const tgt of ref.outgoing) {
    pairs.push({ sourceComp: componentId, targetComp: tgt });
  }
  for (const p of fallbackWiring(componentId, componentNodes)) {
    pairs.push({ sourceComp: p.source, targetComp: p.target });
  }

  const seen = new Set<string>();
  return pairs.filter((p) => {
    const key = `${p.sourceComp}->${p.targetComp}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Wire a specific node instance into the request path. */
export function wireNodeIntoPath(nodeId: string): number {
  ensureMyDesignTabActive();

  const { nodes } = useCanvasStore.getState();
  const componentNodes = nodes.filter(
    (n) => n.type !== "text"
  ) as Node<ComponentNodeData>[];
  const targetNode = componentNodes.find((n) => n.id === nodeId);
  if (!targetNode) return 0;

  const componentId = targetNode.data.componentId;
  const uniquePairs = wiringPairsForComponent(componentId, componentNodes);
  let created = applyWirePairsForNode(
    nodeId,
    componentId,
    uniquePairs,
    componentNodes
  );

  if (
    componentId === "load-balancer" &&
    !isLoadBalancerNodeConnectedToCompute(
      nodeId,
      componentNodes,
      useCanvasStore.getState().edges
    )
  ) {
    for (const p of fallbackWiring("load-balancer", componentNodes)) {
      if (p.source !== "load-balancer") continue;
      created += applyWirePairsForNode(
        nodeId,
        componentId,
        [{ sourceComp: p.source, targetComp: p.target }],
        componentNodes
      );
    }
  }

  return created;
}

/**
 * Wire a component into the request path using reference architecture edges
 * first, then sensible fallbacks. Returns the number of new edges created.
 */
export function wireComponentIntoPath(componentId: string): number {
  ensureMyDesignSeededFromReference();
  ensureMyDesignTabActive();

  const { nodes } = useCanvasStore.getState();
  const componentNodes = nodes.filter(
    (n) => n.type !== "text"
  ) as Node<ComponentNodeData>[];
  const instances = componentNodes.filter((n) => n.data.componentId === componentId);
  if (instances.length === 0) return 0;

  let created = 0;
  for (const inst of instances) {
    created += wireNodeIntoPath(inst.id);
  }

  if (created > 0) {
    focusMyDesignOnCanvas();
  }
  return created;
}
