import type { Node, Edge } from "@xyflow/react";
import type { ComponentNodeData } from "@/store/canvasStore";
import type { ScoreSuggestion } from "@/types/scoring";
import {
  addComponentToCanvas,
  ensureMyDesignSeededFromReference,
  ensureMyDesignTabActive,
  focusMyDesignOnCanvas,
  getMyDesignState,
} from "@/lib/addComponentToCanvas";
import { wireComponentIntoPath, isComponentOnRequestPath, isLoadBalancerConnectedToCompute } from "@/lib/wireComponent";
import { useCanvasStore } from "@/store/canvasStore";
import { useAppStore } from "@/store/appStore";
import { getProblemById } from "@/data/problems";

const DURABLE_STORES = new Set([
  "sql-db",
  "nosql-db",
  "object-storage",
  "timeseries-db",
  "graph-db",
  "file-store",
]);

type FeedbackMatcher = {
  test: (feedback: string) => boolean;
  suggestions: (ctx: ActionContext) => ScoreSuggestion[];
};

interface ActionContext {
  nodes: Node<ComponentNodeData>[];
  edges: Edge[];
  placedIds: Set<string>;
}

/** Suggestion context is always based on My Design — not the reference tab. */
function ctxFromMyDesign(): ActionContext {
  const { nodes, edges } = getMyDesignState();
  const componentNodes = nodes.filter(
    (n) => n.type !== "text"
  ) as Node<ComponentNodeData>[];
  return {
    nodes: componentNodes,
    edges,
    placedIds: new Set(componentNodes.map((n) => n.data.componentId)),
  };
}

function addIfMissing(
  ctx: ActionContext,
  componentId: string,
  label: string
): ScoreSuggestion | null {
  if (ctx.placedIds.has(componentId)) return null;
  return {
    id: `add-${componentId}`,
    label: `Add ${label}`,
    kind: "add-component",
    componentId,
  };
}

function connectIfDisconnected(
  ctx: ActionContext,
  componentId: string,
  label: string
): ScoreSuggestion | null {
  if (!ctx.placedIds.has(componentId)) return null;
  if (isComponentOnRequestPath(ctx.nodes, ctx.edges, componentId)) return null;
  return {
    id: `wire-${componentId}`,
    label: `Connect ${label}`,
    kind: "wire-component",
    componentId,
  };
}

function suggestWireLbToCompute(ctx: ActionContext): ScoreSuggestion | null {
  if (!ctx.placedIds.has("load-balancer")) return null;
  if (!ctx.nodes.some((n) => n.data.category === "compute")) return null;
  if (isLoadBalancerConnectedToCompute(ctx.nodes, ctx.edges)) return null;
  return {
    id: "wire-lb-compute",
    label: "Connect Load Balancer to App Servers",
    kind: "wire-component",
    componentId: "load-balancer",
  };
}

function suggestConnectOrAdd(
  ctx: ActionContext,
  componentId: string,
  label: string
): ScoreSuggestion[] {
  const connect = connectIfDisconnected(ctx, componentId, label);
  if (connect) return [connect];
  const add = addIfMissing(ctx, componentId, label);
  return add ? [add] : [];
}

const FEEDBACK_MATCHERS: FeedbackMatcher[] = [
  {
    test: (f) => f.includes("Load Balancer") && f.startsWith("Add"),
    suggestions: (ctx) => {
      const s = addIfMissing(ctx, "load-balancer", "Load Balancer");
      return s ? [s] : [];
    },
  },
  {
    test: (f) =>
      f.includes("Load Balancer") &&
      (f.includes("Connect") || f.includes("isn't connected")),
    suggestions: (ctx) => suggestConnectOrAdd(ctx, "load-balancer", "Load Balancer"),
  },
  {
    test: (f) => f.includes("App Server") && (f.startsWith("Add") || f.includes("Connect")),
    suggestions: (ctx) => suggestConnectOrAdd(ctx, "app-server", "App Server"),
  },
  {
    test: (f) =>
      f.toLowerCase().includes("cache") &&
      (f.startsWith("Add") || f.includes("Connect") || f.includes("isn't connected")),
    suggestions: (ctx) => suggestConnectOrAdd(ctx, "cache", "Cache"),
  },
  {
    test: (f) =>
      f.includes("Message Queue") &&
      (f.startsWith("Add") || f.includes("Connect") || f.includes("isn't connected")),
    suggestions: (ctx) => suggestConnectOrAdd(ctx, "message-queue", "Message Queue"),
  },
  {
    test: (f) =>
      f.includes("CDN") &&
      (f.startsWith("Add") || f.includes("Connect") || f.includes("isn't connected")),
    suggestions: (ctx) => suggestConnectOrAdd(ctx, "cdn", "CDN"),
  },
  {
    test: (f) =>
      f.includes("DNS") &&
      (f.startsWith("Add") || f.includes("Connect") || f.includes("isn't connected")),
    suggestions: (ctx) => suggestConnectOrAdd(ctx, "dns", "DNS"),
  },
  {
    test: (f) =>
      f.includes("Monitoring") &&
      (f.startsWith("Add") || f.includes("Connect") || f.includes("isn't connected")),
    suggestions: (ctx) => suggestConnectOrAdd(ctx, "monitoring", "Monitoring"),
  },
  {
    test: (f) =>
      (f.includes("Rate Limiter") || f.includes("API Gateway")) &&
      (f.startsWith("Add") || f.includes("Connect") || f.includes("isn't connected")),
    suggestions: (ctx) => {
      const actions: ScoreSuggestion[] = [];
      const gwConnect = connectIfDisconnected(ctx, "api-gateway", "API Gateway");
      const rlConnect = connectIfDisconnected(ctx, "rate-limiter", "Rate Limiter");
      if (gwConnect) actions.push(gwConnect);
      else if (rlConnect) actions.push(rlConnect);
      else {
        const gw = addIfMissing(ctx, "api-gateway", "API Gateway");
        const rl = addIfMissing(ctx, "rate-limiter", "Rate Limiter");
        if (gw) actions.push(gw);
        else if (rl) actions.push(rl);
      }
      return actions;
    },
  },
  {
    test: (f) =>
      f.includes("Auth Service") &&
      (f.startsWith("Add") || f.includes("Connect") || f.includes("isn't connected")),
    suggestions: (ctx) => suggestConnectOrAdd(ctx, "auth-service", "Auth Service"),
  },
  {
    test: (f) =>
      f.includes("scalable database") && f.includes("isn't connected"),
    suggestions: (ctx) => {
      const nosql = connectIfDisconnected(ctx, "nosql-db", "NoSQL DB");
      if (nosql) return [nosql];
      const sql = connectIfDisconnected(ctx, "sql-db", "SQL DB");
      return sql ? [sql] : [];
    },
  },
  {
    test: (f) =>
      f.includes("Connect your Load Balancer") && f.includes("App Servers"),
    suggestions: (ctx) => {
      const wire = suggestWireLbToCompute(ctx);
      if (wire) return [wire];
      return suggestConnectOrAdd(ctx, "load-balancer", "Load Balancer");
    },
  },
  {
    test: (f) =>
      f.includes("database replication") ||
      f.includes("replicated database") ||
      (f.includes("replicas") && f.includes("durable")),
    suggestions: (ctx) => {
      const hasDb = ctx.nodes.some((n) => DURABLE_STORES.has(n.data.componentId));
      if (!hasDb) {
        const s = addIfMissing(ctx, "nosql-db", "NoSQL DB");
        if (s) return [s];
      }
      return [
        { id: "set-db-replicas", label: "Set DB replicas to 2", kind: "set-db-replicas" },
      ];
    },
  },
  {
    test: (f) => f.includes("single points of failure"),
    suggestions: () => [
      {
        id: "scale-redundancy",
        label: "Add redundancy (replicas)",
        kind: "scale-redundancy",
      },
    ],
  },
  {
    test: (f) =>
      f.includes("NoSQL") ||
      f.includes("read replicas") ||
      (f.includes("database layer") && f.startsWith("Scale")),
    suggestions: (ctx) => {
      const hasSql = ctx.placedIds.has("sql-db");
      const hasNoSql = ctx.placedIds.has("nosql-db");
      if (!hasNoSql) {
        const s = addIfMissing(ctx, "nosql-db", "NoSQL DB");
        if (s) return [s];
      }
      if (hasSql && !hasNoSql) {
        return [
          {
            id: "set-db-replicas",
            label: "Scale SQL read replicas",
            kind: "set-db-replicas",
          },
        ];
      }
      return [];
    },
  },
  {
    test: (f) => f.includes("No storage components"),
    suggestions: (ctx) => {
      const s = addIfMissing(ctx, "nosql-db", "NoSQL DB");
      return s ? [s] : [];
    },
  },
  {
    test: (f) => f.includes("polyglot persistence"),
    suggestions: (ctx) => {
      if (ctx.placedIds.has("sql-db") && !ctx.placedIds.has("nosql-db")) {
        const s = addIfMissing(ctx, "nosql-db", "NoSQL DB");
        return s ? [s] : [];
      }
      if (ctx.placedIds.has("nosql-db") && !ctx.placedIds.has("sql-db")) {
        const s = addIfMissing(ctx, "sql-db", "SQL DB");
        return s ? [s] : [];
      }
      const s = addIfMissing(ctx, "object-storage", "Object Storage");
      return s ? [s] : [];
    },
  },
  {
    test: (f) => f.includes("disconnected component"),
    suggestions: () => [
      {
        id: "select-disconnected",
        label: "Find disconnected nodes",
        kind: "select-disconnected",
      },
    ],
  },
  {
    test: (f) => f.includes("under-provisioned"),
    suggestions: () => [
      { id: "load-reference", label: "Load reference design", kind: "load-reference" },
    ],
  },
  {
    test: (f) => f.includes("redundant data paths"),
    suggestions: (ctx) => {
      const actions: ScoreSuggestion[] = [];
      const app = addIfMissing(ctx, "app-server", "App Server");
      if (app) actions.push(app);
      actions.push({
        id: "scale-redundancy",
        label: "Duplicate scalable nodes",
        kind: "scale-redundancy",
      });
      return actions;
    },
  },
  {
    test: (f) => f.includes("architectural layers") || f.includes("category/categories"),
    suggestions: () => [
      { id: "open-components", label: "Browse components", kind: "open-components" },
      { id: "load-reference", label: "Load reference design", kind: "load-reference" },
    ],
  },
  {
    test: (f) => f.includes("cycle"),
    suggestions: () => [
      {
        id: "open-components",
        label: "Review queue/async edges",
        kind: "open-components",
      },
    ],
  },
  {
    test: (f) => f.includes("over-engineered") || f.includes("getting complex"),
    suggestions: () => [
      {
        id: "select-disconnected",
        label: "Review unused nodes",
        kind: "select-disconnected",
      },
    ],
  },
];

export function getSuggestionsForFeedback(
  feedback: string,
  ctx?: ActionContext
): ScoreSuggestion[] {
  const context = ctx ?? ctxFromMyDesign();
  for (const matcher of FEEDBACK_MATCHERS) {
    if (matcher.test(feedback)) {
      return matcher.suggestions(context);
    }
  }
  return [];
}

export function getSuggestionsForCategory(
  category: string,
  feedback: string[],
  ctx?: ActionContext
): ScoreSuggestion[] {
  const context = ctx ?? ctxFromMyDesign();
  const seen = new Set<string>();
  const out: ScoreSuggestion[] = [];

  for (const item of feedback) {
    for (const s of getSuggestionsForFeedback(item, context)) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        out.push(s);
      }
    }
  }

  if (out.length === 0 && feedback.length > 0) {
    out.push({
      id: `open-components-${category}`,
      label: "Browse components",
      kind: "open-components",
    });
  }

  return out;
}

function findDisconnectedNodeIds(
  nodes: Node<ComponentNodeData>[],
  edges: Edge[]
): string[] {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const attached = new Set<string>();
  for (const edge of edges) {
    if (edge.source === edge.target) continue;
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    attached.add(edge.source);
    attached.add(edge.target);
  }
  return nodes.filter((n) => !attached.has(n.id)).map((n) => n.id);
}

function myDesignComponentNodes(): Node<ComponentNodeData>[] {
  ensureMyDesignTabActive();
  const { nodes } = useCanvasStore.getState();
  return nodes.filter((n) => n.type !== "text") as Node<ComponentNodeData>[];
}

export function executeScoreSuggestion(
  suggestion: ScoreSuggestion,
  onRescore?: () => void
): boolean {
  const { updateNodeData } = useCanvasStore.getState();

  switch (suggestion.kind) {
    case "add-component": {
      if (!suggestion.componentId) return false;
      const wasEmpty =
        getMyDesignState().nodes.filter((n) => n.type !== "text").length === 0;
      const id = addComponentToCanvas(suggestion.componentId);
      if (!id) return false;
      const label = suggestion.label.replace(/^Add /, "");
      useAppStore.getState().showToast(
        wasEmpty
          ? `Loaded reference into My Design${label ? ` — ${label} wired in` : ""}`
          : `Added and connected ${label}`,
        "success"
      );
      onRescore?.();
      focusMyDesignOnCanvas();
      return true;
    }
    case "wire-component": {
      if (!suggestion.componentId) return false;
      ensureMyDesignSeededFromReference();
      ensureMyDesignTabActive();
      let created = wireComponentIntoPath(suggestion.componentId);
      if (created === 0) {
        const id = addComponentToCanvas(suggestion.componentId);
        if (id) created = wireComponentIntoPath(suggestion.componentId);
      }
      if (created === 0) {
        useAppStore
          .getState()
          .showToast("Could not connect — add the missing partner components first", "info");
        focusMyDesignOnCanvas();
        return false;
      }
      const label = suggestion.label.replace(/^Connect /, "");
      useAppStore
        .getState()
        .showToast(`Connected ${label} to request path`, "success");
      onRescore?.();
      focusMyDesignOnCanvas();
      return true;
    }
    case "select-component": {
      if (!suggestion.componentId) return false;
      ensureMyDesignSeededFromReference();
      ensureMyDesignTabActive();
      const componentNodes = myDesignComponentNodes();
      const node = componentNodes.find(
        (n) => n.data.componentId === suggestion.componentId
      );
      if (!node) return false;
      useCanvasStore.getState().setSelectedNode(node.id);
      useAppStore.getState().setActiveRightTab("properties");
      useAppStore
        .getState()
        .showToast(`Selected ${node.data.label} — connect it to your request path`, "info");
      return true;
    }
    case "set-db-replicas": {
      ensureMyDesignSeededFromReference();
      ensureMyDesignTabActive();
      const componentNodes = myDesignComponentNodes();
      const db = componentNodes.find(
        (n) =>
          DURABLE_STORES.has(n.data.componentId) && (n.data.replicas ?? 1) < 2
      );
      if (!db) {
        const added = addComponentToCanvas("nosql-db");
        if (added) {
          useCanvasStore.getState().updateNodeData(added, { replicas: 2 });
          useAppStore.getState().showToast("Added NoSQL DB with 2 replicas", "success");
          onRescore?.();
          return true;
        }
        useAppStore.getState().showToast("Add a database to My Design first", "info");
        return false;
      }
      updateNodeData(db.id, { replicas: 2 });
      useAppStore
        .getState()
        .showToast(`${db.data.label}: replicas set to 2`, "success");
      onRescore?.();
      return true;
    }
    case "scale-redundancy": {
      ensureMyDesignSeededFromReference();
      ensureMyDesignTabActive();
      const componentNodes = myDesignComponentNodes();
      let updated = 0;
      for (const n of componentNodes) {
        const replicas = n.data.replicas ?? 1;
        const isDurable = DURABLE_STORES.has(n.data.componentId);
        if (replicas >= 2) continue;
        if (n.data.scalable || isDurable) {
          updateNodeData(n.id, { replicas: 2 });
          updated += 1;
        }
      }
      if (updated === 0) {
        useAppStore.getState().showToast("Components already have redundancy", "info");
        return false;
      }
      useAppStore
        .getState()
        .showToast(`Added redundancy to ${updated} component${updated > 1 ? "s" : ""}`, "success");
      onRescore?.();
      return true;
    }
    case "select-disconnected": {
      ensureMyDesignSeededFromReference();
      ensureMyDesignTabActive();
      const { edges } = useCanvasStore.getState();
      const componentNodes = myDesignComponentNodes();
      const disconnected = findDisconnectedNodeIds(componentNodes, edges);
      if (disconnected.length === 0) {
        useAppStore.getState().showToast("All components are connected", "info");
        return false;
      }
      useCanvasStore.getState().setSelectedNode(disconnected[0]);
      useAppStore.getState().setActiveRightTab("properties");
      useAppStore
        .getState()
        .showToast(
          `${disconnected.length} disconnected node${disconnected.length > 1 ? "s" : ""} — wire or remove`,
          "info"
        );
      return true;
    }
    case "load-reference": {
      const problem = getProblemById(useAppStore.getState().selectedProblemId);
      if (!problem?.referenceSolution.nodes.length) {
        useAppStore.getState().showToast("No reference design for this problem", "info");
        return false;
      }
      const hasComponents =
        getMyDesignState().nodes.filter((n) => n.type !== "text").length > 0;
      if (hasComponents) {
        ensureMyDesignTabActive();
        useAppStore.getState().showToast("My Design already has components", "info");
        return true;
      }
      if (!ensureMyDesignSeededFromReference()) {
        useAppStore.getState().showToast("Could not load reference design", "info");
        return false;
      }
      useAppStore
        .getState()
        .showToast("Reference loaded into My Design — edit and improve", "success");
      onRescore?.();
      return true;
    }
    case "open-components": {
      useAppStore.getState().setActiveLeftTab("components");
      useAppStore.getState().setLeftSidebarOpen(true);
      useAppStore.getState().showToast("Pick components to add to My Design", "info");
      return true;
    }
    case "rescore": {
      onRescore?.();
      return true;
    }
    default:
      return false;
  }
}
