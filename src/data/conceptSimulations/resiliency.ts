import type { ConceptSimulationDefinition } from "@/types/conceptSimulation";
import {
  tutorialTitle,
  cn,
  ce,
  buildTutorial,
  defineSteps,
} from "@/lib/conceptSimulations/tutorialLayout";

const AUTO = 5500;

function buildRetriesTutorial() {
  const nodes = [
    ...tutorialTitle("retry", "Retries & Backoff", "Exponential backoff with jitter prevents retry storms"),
    cn("cl", "client", 0, 0, "Client"),
    cn("gw", "api-gateway", 1, 0, "API Gateway"),
    cn("svc", "app-server", 2, 0, "Downstream Svc"),
    cn("cb", "circuit-breaker", 2, 1, "Retry Policy"),
    cn("log", "monitoring", 3, 0, "Metrics"),
  ];
  const edges = [
    ce("e1", "cl", "gw", "request", { protocol: "http", bidirectional: true }),
    ce("e2", "gw", "cb", "check policy", { protocol: "tcp", bidirectional: true }),
    ce("e3", "gw", "svc", "attempt 1 → 503", { protocol: "http" }),
    ce("e4", "gw", "svc", "attempt 2 after 200ms+jitter", { protocol: "http", async: true }),
    ce("e5", "gw", "log", "retry count metric", { protocol: "http", async: true }),
  ];
  return buildTutorial(nodes, edges);
}

function buildCircuitBreakerTutorial() {
  const nodes = [
    ...tutorialTitle("cb", "Circuit Breaker", "Open → half-open → closed state machine"),
    cn("cl", "client", 0, 0, "Caller"),
    cn("cb", "circuit-breaker", 1, 0, "Circuit Breaker"),
    cn("svc", "app-server", 2, 0, "Payment API"),
    cn("fb", "app-server", 2, 1, "Fallback Cache"),
    cn("mon", "monitoring", 3, 0, "Dashboard"),
  ];
  const edges = [
    ce("e1", "cl", "cb", "charge card", { protocol: "http", bidirectional: true }),
    ce("e2", "cb", "svc", "forward (closed)", { protocol: "http" }),
    ce("e3", "cb", "svc", "failures → OPEN", { protocol: "http" }),
    ce("e4", "cb", "fb", "fast-fail fallback", { protocol: "http", bidirectional: true }),
    ce("e5", "cb", "mon", "state change alert", { protocol: "http", async: true }),
  ];
  return buildTutorial(nodes, edges);
}

function buildBulkheadTutorial() {
  const nodes = [
    ...tutorialTitle("bulk", "Bulkhead Isolation", "Separate thread pools per dependency"),
    cn("api", "api-gateway", 0, 0, "API"),
    cn("pool-a", "app-server", 1, 0, "Pool A (payments)"),
    cn("pool-b", "app-server", 1, 1, "Pool B (search)"),
    cn("pay", "app-server", 2, 0, "Payment Svc"),
    cn("search", "search", 2, 1, "Search Svc"),
    cn("slow", "app-server", 2, 2, "Slow Dependency"),
  ];
  const edges = [
    ce("e1", "api", "pool-a", "checkout", { protocol: "http" }),
    ce("e2", "api", "pool-b", "search", { protocol: "http" }),
    ce("e3", "pool-a", "pay", "dedicated threads", { protocol: "http", bidirectional: true }),
    ce("e4", "pool-b", "search", "dedicated threads", { protocol: "http", bidirectional: true }),
    ce("e5", "pool-b", "slow", "blocked — pool B only", { protocol: "http" }),
  ];
  return buildTutorial(nodes, edges);
}

function buildIdempotencyTutorial() {
  const nodes = [
    ...tutorialTitle("idem", "Idempotency Keys", "Duplicate requests must not double-charge"),
    cn("cl", "client", 0, 0, "Client"),
    cn("gw", "api-gateway", 1, 0, "API Gateway"),
    cn("pay", "app-server", 2, 0, "Payment Service"),
    cn("dedup", "cache", 3, 0, "Idempotency Store"),
    cn("db", "sql-db", 4, 0, "Ledger DB"),
  ];
  const edges = [
    ce("e1", "cl", "gw", "POST charge (key=abc)", { protocol: "http", bidirectional: true }),
    ce("e2", "gw", "pay", "forward w/ key", { protocol: "http" }),
    ce("e3", "pay", "dedup", "check key abc", { protocol: "tcp", bidirectional: true }),
    ce("e4", "pay", "db", "insert charge", { protocol: "tcp" }),
    ce("e5", "cl", "gw", "retry (same key=abc)", { protocol: "http", async: true }),
    ce("e6", "pay", "dedup", "return cached result", { protocol: "tcp", bidirectional: true }),
  ];
  return buildTutorial(nodes, edges);
}

function buildDegradationTutorial() {
  const nodes = [
    ...tutorialTitle("deg", "Graceful Degradation", "Drop non-critical features under load"),
    cn("cl", "client", 0, 0, "User"),
    cn("gw", "api-gateway", 1, 0, "Gateway"),
    cn("core", "app-server", 2, 0, "Core API"),
    cn("rec", "app-server", 2, 1, "Recommendations"),
    cn("feat", "config-service", 3, 0, "Feature Flags"),
    cn("cache", "cache", 4, 0, "Stale Cache"),
  ];
  const edges = [
    ce("e1", "cl", "gw", "page load", { protocol: "http", bidirectional: true }),
    ce("e2", "gw", "core", "critical path", { protocol: "http", bidirectional: true }),
    ce("e3", "gw", "feat", "check flags", { protocol: "tcp", bidirectional: true }),
    ce("e4", "gw", "rec", "disabled under load", { protocol: "http" }),
    ce("e5", "core", "cache", "serve stale data", { protocol: "tcp", bidirectional: true }),
  ];
  return buildTutorial(nodes, edges);
}

export const RESILIENCY_SIMULATIONS: ConceptSimulationDefinition[] = [
  {
    id: "retries-backoff",
    title: "Retries & Backoff",
    description: "Exponential backoff with jitter",
    topicId: "resiliency",
    conceptId: "timeouts-retries",
    build: buildRetriesTutorial,
    autoPlayMs: AUTO,
    steps: defineSteps([
      { id: "overview", title: "When to retry?", description: "Transient failures (503, timeout) warrant retries. Permanent errors (400) do not." },
      { id: "policy", title: "Retry policy gate", description: "Gateway consults policy: max attempts, backoff curve, idempotency key required.", edges: ["e1", "e2"], nodes: ["cl", "gw", "cb"] },
      { id: "backoff", title: "Exponential backoff + jitter", description: "Attempt 1 fails. Wait 200ms + random jitter before attempt 2 — prevents thundering herd.", edges: ["e3", "e4"], nodes: ["gw", "svc"] },
      { id: "metrics", title: "Observe retry storms", description: "High retry rates signal upstream saturation — alert before cascading failure.", edges: ["e5"], nodes: ["gw", "log"] },
    ]),
  },
  {
    id: "circuit-breaker",
    title: "Circuit Breaker",
    description: "Fail fast when dependency is unhealthy",
    topicId: "resiliency",
    conceptId: "circuit-breaker",
    build: buildCircuitBreakerTutorial,
    autoPlayMs: AUTO,
    steps: defineSteps([
      { id: "overview", title: "Stop calling the sick service", description: "After N failures, circuit opens — callers get immediate fallback instead of waiting." },
      { id: "closed", title: "Closed: normal operation", description: "Requests pass through to Payment API. Failures are counted.", edges: ["e1", "e2"], nodes: ["cl", "cb", "svc"] },
      { id: "open", title: "Open: fast-fail", description: "Threshold exceeded. Circuit opens — return cached response instantly.", edges: ["e3", "e4"], nodes: ["cb", "svc", "fb"] },
      { id: "half", title: "Half-open probe", description: "After cooldown, one probe request tests recovery. Success → closed again.", edges: ["e5"], nodes: ["cb", "mon"] },
    ]),
  },
  {
    id: "bulkhead",
    title: "Bulkhead Isolation",
    description: "Isolate resource pools per dependency",
    topicId: "resiliency",
    conceptId: "bulkhead",
    build: buildBulkheadTutorial,
    autoPlayMs: AUTO,
    steps: defineSteps([
      { id: "overview", title: "Don't let one slow call sink the ship", description: "Named after ship compartments — failure in one pool doesn't exhaust all threads." },
      { id: "pools", title: "Separate thread pools", description: "Payments and search each have dedicated connection pools.", edges: ["e1", "e2", "e3", "e4"], nodes: ["api", "pool-a", "pool-b", "pay", "search"] },
      { id: "isolate", title: "Slow dependency isolated", description: "Search pool blocked on slow dependency — payment pool unaffected.", edges: ["e5"], nodes: ["pool-b", "slow"] },
    ]),
  },
  {
    id: "idempotency",
    title: "Idempotency Keys",
    description: "Safe retries without duplicate side effects",
    topicId: "resiliency",
    conceptId: "idempotency",
    build: buildIdempotencyTutorial,
    autoPlayMs: AUTO,
    steps: defineSteps([
      { id: "overview", title: "Why idempotency keys?", description: "Retries and at-least-once delivery can send the same request twice. Keys deduplicate safely." },
      { id: "first", title: "First request processes", description: "Payment service checks store — key abc not seen. Charge inserted and result cached.", edges: ["e1", "e2", "e3", "e4"], nodes: ["cl", "gw", "pay", "dedup", "db"] },
      { id: "retry", title: "Retry with same key", description: "Network timeout triggers client retry with identical idempotency key abc.", edges: ["e5"], nodes: ["cl", "gw"] },
      { id: "dedup", title: "Return cached result", description: "Service finds key abc already processed — returns original response, no double charge.", edges: ["e6"], nodes: ["pay", "dedup"] },
    ]),
  },
  {
    id: "graceful-degradation",
    title: "Graceful Degradation",
    description: "Shed load by disabling non-critical features",
    topicId: "resiliency",
    conceptId: "graceful-degradation",
    build: buildDegradationTutorial,
    autoPlayMs: AUTO,
    steps: defineSteps([
      { id: "overview", title: "Partial service beats total outage", description: "Under load, disable recommendations and serve stale cache for non-critical data." },
      { id: "core", title: "Core path always runs", description: "Checkout and auth remain available — they're on the critical path.", edges: ["e1", "e2"], nodes: ["cl", "gw", "core"] },
      { id: "shed", title: "Shed non-critical features", description: "Feature flags disable recommendations. Users see page without sidebar recs.", edges: ["e3", "e4"], nodes: ["gw", "feat", "rec"] },
      { id: "stale", title: "Serve stale cache", description: "Better stale product data than timeout — set Cache-Control accordingly.", edges: ["e5"], nodes: ["core", "cache"] },
    ]),
  },
];
