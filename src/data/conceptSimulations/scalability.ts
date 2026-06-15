import type { ConceptSimulationDefinition } from "@/types/conceptSimulation";
import {
  tutorialTitle,
  cn,
  ce,
  buildTutorial,
  defineSteps,
} from "@/lib/conceptSimulations/tutorialLayout";

const AUTO = 5500;

function buildHorizontalTutorial() {
  const nodes = [
    ...tutorialTitle("scale-h", "Horizontal vs Vertical Scaling", "Add replicas vs bigger machines"),
    cn("cl", "client", 0, 0, "Traffic"),
    cn("lb", "load-balancer", 1, 0, "Load Balancer"),
    cn("s1", "app-server", 2, 0, "Replica 1"),
    cn("s2", "app-server", 2, 1, "Replica 2"),
    cn("s3", "app-server", 2, 2, "Replica 3"),
    cn("db", "sql-db", 3, 0, "Shared State Store"),
  ];
  const edges = [
    ce("e1", "cl", "lb", "requests", { protocol: "http", bidirectional: true }),
    ce("e2", "lb", "s1", "round-robin", { protocol: "http" }),
    ce("e3", "lb", "s2", "round-robin", { protocol: "http" }),
    ce("e4", "lb", "s3", "round-robin", { protocol: "http" }),
    ce("e5", "s1", "db", "stateless read/write", { protocol: "tcp" }),
    ce("e6", "s2", "db", "stateless read/write", { protocol: "tcp" }),
  ];
  return buildTutorial(nodes, edges);
}

function buildShardingTutorial() {
  const nodes = [
    ...tutorialTitle("shard", "Partitioning & Sharding", "Split data by key hash across DB shards"),
    cn("api", "api-gateway", 0, 0, "API"),
    cn("router", "app-server", 1, 0, "Shard Router"),
    cn("s0", "sql-db", 2, 0, "Shard 0 (A-M)"),
    cn("s1", "sql-db", 2, 1, "Shard 1 (N-Z)"),
    cn("s2", "sql-db", 2, 2, "Shard 2 (overflow)"),
    cn("cache", "cache", 3, 0, "Routing Cache"),
  ];
  const edges = [
    ce("e1", "api", "router", "get user", { protocol: "http", bidirectional: true }),
    ce("e2", "router", "cache", "lookup shard map", { protocol: "tcp", bidirectional: true }),
    ce("e3", "router", "s1", "hash(userId) → shard 1", { protocol: "tcp", bidirectional: true }),
    ce("e4", "router", "s0", "hash(userId) → shard 0", { protocol: "tcp" }),
  ];
  return buildTutorial(nodes, edges);
}

function buildCachingTutorial() {
  const nodes = [
    ...tutorialTitle("cache", "Caching Layers", "CDN → app cache → DB buffer pool"),
    cn("cl", "client", 0, 0, "User"),
    cn("cdn", "cdn", 1, 0, "CDN Edge"),
    cn("gw", "api-gateway", 2, 0, "API Gateway"),
    cn("app", "app-server", 3, 0, "App Server"),
    cn("redis", "cache", 4, 0, "Redis Cache"),
    cn("db", "sql-db", 5, 0, "PostgreSQL"),
  ];
  const edges = [
    ce("e1", "cl", "cdn", "static assets", { protocol: "http", bidirectional: true }),
    ce("e2", "cl", "gw", "API request", { protocol: "http", bidirectional: true }),
    ce("e3", "gw", "app", "route", { protocol: "http", bidirectional: true }),
    ce("e4", "app", "redis", "cache-aside GET", { protocol: "tcp", bidirectional: true }),
    ce("e5", "app", "db", "read on cache miss", { protocol: "tcp", bidirectional: true }),
  ];
  return buildTutorial(nodes, edges);
}

function buildReadWriteTutorial() {
  const nodes = [
    ...tutorialTitle("rw", "Read vs Write Paths", "CQRS: optimized read and write pipelines"),
    cn("cl", "client", 0, 0, "Client"),
    cn("gw", "api-gateway", 1, 0, "Gateway"),
    cn("w", "app-server", 2, 0, "Write Service"),
    cn("mq", "message-queue", 3, 0, "Event Bus"),
    cn("proj", "stream-processor", 4, 0, "Projector"),
    cn("rdb", "nosql-db", 5, 0, "Read Model"),
    cn("r", "app-server", 2, 1, "Read Service"),
  ];
  const edges = [
    ce("e1", "cl", "gw", "POST /orders", { protocol: "http", bidirectional: true }),
    ce("e2", "gw", "w", "command", { protocol: "http" }),
    ce("e3", "w", "mq", "OrderPlaced", { protocol: "pubsub", async: true }),
    ce("e4", "mq", "proj", "build read model", { protocol: "pubsub", async: true }),
    ce("e5", "proj", "rdb", "denormalize", { protocol: "tcp" }),
    ce("e6", "cl", "gw", "GET /orders", { protocol: "http", bidirectional: true }),
    ce("e7", "gw", "r", "query", { protocol: "http", bidirectional: true }),
    ce("e8", "r", "rdb", "fast read", { protocol: "tcp", bidirectional: true }),
  ];
  return buildTutorial(nodes, edges);
}

function buildStatelessTutorial() {
  const nodes = [
    ...tutorialTitle("stateless", "Stateless Services", "Session state externalized to Redis"),
    cn("cl", "client", 0, 0, "Browser"),
    cn("lb", "load-balancer", 1, 0, "LB"),
    cn("a", "app-server", 2, 0, "Pod A"),
    cn("b", "app-server", 2, 1, "Pod B"),
    cn("sess", "cache", 3, 0, "Session Store"),
    cn("db", "sql-db", 4, 0, "User DB"),
  ];
  const edges = [
    ce("e1", "cl", "lb", "any request", { protocol: "http", bidirectional: true }),
    ce("e2", "lb", "a", "no sticky session", { protocol: "http" }),
    ce("e3", "lb", "b", "no sticky session", { protocol: "http" }),
    ce("e4", "a", "sess", "load session by JWT", { protocol: "tcp", bidirectional: true }),
    ce("e5", "b", "sess", "load session by JWT", { protocol: "tcp", bidirectional: true }),
    ce("e6", "a", "db", "fetch user data", { protocol: "tcp" }),
  ];
  return buildTutorial(nodes, edges);
}

export const SCALABILITY_SIMULATIONS: ConceptSimulationDefinition[] = [
  {
    id: "horizontal-scaling",
    title: "Horizontal Scaling",
    description: "Stateless replicas behind a load balancer",
    topicId: "scalability",
    conceptId: "horizontal-vertical",
    build: buildHorizontalTutorial,
    autoPlayMs: AUTO,
    steps: defineSteps([
      { id: "overview", title: "Scale out, not up", description: "Add more identical replicas instead of buying a bigger machine. State lives in external stores." },
      { id: "traffic", title: "LB distributes traffic", description: "Round-robin across healthy replicas. Any pod can handle any request.", edges: ["e1", "e2", "e3", "e4"], nodes: ["cl", "lb", "s1", "s2", "s3"] },
      { id: "state", title: "Shared state store", description: "Replicas remain stateless — all durable data in PostgreSQL.", edges: ["e5", "e6"], nodes: ["s1", "s2", "db"] },
    ]),
  },
  {
    id: "partitioning",
    title: "Partitioning & Sharding",
    description: "Hash-based data distribution",
    topicId: "scalability",
    conceptId: "partitioning",
    build: buildShardingTutorial,
    autoPlayMs: AUTO,
    steps: defineSteps([
      { id: "overview", title: "Why shard?", description: "Single-node DB hits ceiling. Partition rows by hash(userId) across shards." },
      { id: "route", title: "Router picks shard", description: "Consistent hashing maps keys to shards. Routing cache avoids repeated lookups.", edges: ["e1", "e2", "e3"], nodes: ["api", "router", "cache", "s1"] },
      { id: "rebalance", title: "Hot key mitigation", description: "Overflow shard absorbs rebalanced keys when a partition grows too large.", edges: ["e4"], nodes: ["router", "s0", "s2"] },
    ]),
  },
  {
    id: "caching-layers",
    title: "Caching Layers",
    description: "Multi-tier cache hierarchy",
    topicId: "scalability",
    conceptId: "caching-layers",
    build: buildCachingTutorial,
    autoPlayMs: AUTO,
    steps: defineSteps([
      { id: "overview", title: "Cache hierarchy", description: "Each tier absorbs load before hitting the next — CDN for static, Redis for dynamic, DB last." },
      { id: "cdn", title: "CDN serves static assets", description: "Images and JS served from edge — never hit origin.", edges: ["e1"], nodes: ["cl", "cdn"] },
      { id: "api", title: "API cache-aside", description: "App checks Redis first. On miss, read DB and populate cache.", edges: ["e2", "e3", "e4", "e5"], nodes: ["cl", "gw", "app", "redis", "db"] },
    ]),
  },
  {
    id: "read-write-paths",
    title: "Read vs Write Paths",
    description: "CQRS separates command and query models",
    topicId: "scalability",
    conceptId: "read-write-paths",
    build: buildReadWriteTutorial,
    autoPlayMs: AUTO,
    steps: defineSteps([
      { id: "overview", title: "CQRS pattern", description: "Writes and reads use different optimized paths and data models." },
      { id: "write", title: "Write path: command → event", description: "Order placed as command. Event published to bus for async projection.", edges: ["e1", "e2", "e3", "e4", "e5"], nodes: ["cl", "gw", "w", "mq", "proj", "rdb"] },
      { id: "read", title: "Read path: denormalized query", description: "Reads hit pre-built read model — no joins at query time.", edges: ["e6", "e7", "e8"], nodes: ["cl", "gw", "r", "rdb"] },
    ]),
  },
  {
    id: "stateless-services",
    title: "Stateless Services",
    description: "External session store enables free scaling",
    topicId: "scalability",
    conceptId: "stateless-services",
    build: buildStatelessTutorial,
    autoPlayMs: AUTO,
    steps: defineSteps([
      { id: "overview", title: "No sticky sessions", description: "Any pod can serve any request. Session state lives in Redis, not pod memory." },
      { id: "route", title: "LB routes freely", description: "No session affinity needed — pods are interchangeable.", edges: ["e1", "e2", "e3"], nodes: ["cl", "lb", "a", "b"] },
      { id: "session", title: "Shared session store", description: "JWT references session in Redis. Pod crash doesn't lose user state.", edges: ["e4", "e5", "e6"], nodes: ["a", "b", "sess", "db"] },
    ]),
  },
];
