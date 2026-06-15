import type { ConceptSimulationDefinition } from "@/types/conceptSimulation";
import {
  tutorialTitle,
  sectionLabel,
  note,
  cn,
  ce,
  buildTutorial,
  defineSteps,
  COL,
  ROW,
} from "@/lib/conceptSimulations/tutorialLayout";

const AUTO = 5500;

function buildSyncAsyncTutorial() {
  const ySync = 0;
  const yAsync = ROW.h * 3;

  const nodes = [
    ...tutorialTitle(
      "sync-async",
      "Synchronous vs Asynchronous Communication",
      "Compare blocking request-response with queue-decoupled processing",
    ),
    sectionLabel("lbl-sync-path", "① Synchronous path — caller blocks until done", ySync),
    cn("c-sync", "client", 0, ySync / ROW.h, "Mobile Client"),
    cn("gw-sync", "api-gateway", 1, ySync / ROW.h, "API Gateway"),
    cn("ord-sync", "app-server", 2, ySync / ROW.h, "Order Service"),
    cn("db-sync", "sql-db", 3, ySync / ROW.h, "Orders DB"),
    note("n-sync", "Thread blocked waiting for DB commit", COL.x1, ySync + 100),

    sectionLabel("lbl-async-path", "② Asynchronous path — accept now, process later", yAsync),
    cn("c-async", "client", 0, yAsync / ROW.h, "Mobile Client"),
    cn("gw-async", "api-gateway", 1, yAsync / ROW.h, "API Gateway"),
    cn("mq-async", "message-queue", 2, yAsync / ROW.h, "Order Queue"),
    cn("w-async", "app-server", 3, yAsync / ROW.h, "Worker Service"),
    cn("db-async", "sql-db", 4, yAsync / ROW.h, "Orders DB"),
    cn("notify-async", "notification-service", 3, yAsync / ROW.h + 1, "Notifier"),
  ];

  const edges = [
    ce("e-s1", "c-sync", "gw-sync", "POST /orders", { protocol: "http", bidirectional: true }),
    ce("e-s2", "gw-sync", "ord-sync", "route", { protocol: "http", bidirectional: true }),
    ce("e-s3", "ord-sync", "db-sync", "INSERT + COMMIT", { protocol: "tcp", bidirectional: true }),
    ce("e-a1", "c-async", "gw-async", "POST /orders", { protocol: "http", bidirectional: true }),
    ce("e-a2", "gw-async", "mq-async", "publish OrderCreated", { protocol: "pubsub", async: true }),
    ce("e-a3", "gw-async", "c-async", "202 Accepted", { protocol: "http", async: true }),
    ce("e-a4", "mq-async", "w-async", "consume job", { protocol: "pubsub", async: true }),
    ce("e-a5", "w-async", "db-async", "write order", { protocol: "tcp" }),
    ce("e-a6", "w-async", "notify-async", "order ready", { protocol: "http", async: true }),
  ];

  return buildTutorial(nodes, edges);
}

function buildApiStylesTutorial() {
  const r = ROW.h;
  const nodes = [
    ...tutorialTitle(
      "api",
      "Six API Communication Styles",
      "Each row is a complete request path — click Simulate to walk through them",
    ),
    // REST
    sectionLabel("lbl-rest", "1 · REST — resource URLs, stateless HTTP", 0),
    cn("cl-r", "client", 0, 0, "Client"),
    cn("gw-r", "api-gateway", 1, 0, "API Gateway"),
    cn("auth-r", "auth-service", 2, 0, "Auth"),
    cn("svc-r", "app-server", 3, 0, "User Service"),
    cn("cache-r", "cache", 4, 0, "Cache"),
    cn("db-r", "sql-db", 5, 0, "PostgreSQL"),
    // gRPC
    sectionLabel("lbl-grpc", "2 · RPC/gRPC — typed procedure calls over HTTP/2", r),
    cn("cl-g", "client", 0, 1, "Service Client"),
    cn("mesh-g", "service-mesh", 1, 1, "Service Mesh"),
    cn("svc-g", "app-server", 2, 1, "Inventory RPC"),
    cn("db-g", "nosql-db", 3, 1, "Product Store"),
    // GraphQL
    sectionLabel("lbl-gql", "3 · GraphQL — one endpoint, client picks fields", r * 2),
    cn("cl-q", "client", 0, 2, "Web App"),
    cn("gql-q", "api-gateway", 1, 2, "GraphQL Gateway"),
    cn("usr-q", "app-server", 2, 2, "Users API"),
    cn("ord-q", "app-server", 3, 2, "Orders API"),
    // WebSocket
    sectionLabel("lbl-ws", "4 · WebSocket — persistent bidirectional stream", r * 3),
    cn("cl-w", "client", 0, 3, "Chat Client"),
    cn("lb-w", "load-balancer", 1, 3, "Load Balancer"),
    cn("ws-w", "websocket-server", 2, 3, "WS Cluster"),
    cn("cache-w", "cache", 3, 3, "Presence Store"),
    // Webhooks
    sectionLabel("lbl-hook", "5 · Webhooks — server pushes to your callback URL", r * 4),
    cn("pay-h", "app-server", 0, 4, "Payment Service"),
    cn("mq-h", "message-queue", 1, 4, "Event Bus"),
    cn("wh-h", "app-server", 2, 4, "Webhook Dispatcher"),
    cn("cl-h", "client", 3, 4, "Merchant Callback"),
    // Events
    sectionLabel("lbl-ev", "6 · Event-driven — async pub/sub via broker", r * 5),
    cn("prod-e", "app-server", 0, 5, "Checkout Service"),
    cn("mq-e", "message-queue", 1, 5, "Kafka Broker"),
    cn("inv-e", "app-server", 2, 5, "Inventory Consumer"),
    cn("ship-e", "app-server", 3, 5, "Shipping Consumer"),
    cn("ana-e", "stream-processor", 4, 5, "Analytics"),
  ];

  const edges = [
    ce("e-r1", "cl-r", "gw-r", "GET /users/42", { protocol: "http", bidirectional: true }),
    ce("e-r2", "gw-r", "auth-r", "validate JWT", { protocol: "http", bidirectional: true }),
    ce("e-r3", "auth-r", "svc-r", "authorized", { protocol: "http", bidirectional: true }),
    ce("e-r4", "svc-r", "cache-r", "cache-aside", { protocol: "tcp", bidirectional: true }),
    ce("e-r5", "svc-r", "db-r", "SELECT on miss", { protocol: "tcp", bidirectional: true }),
    ce("e-g1", "cl-g", "mesh-g", "GetStock()", { protocol: "grpc", bidirectional: true }),
    ce("e-g2", "mesh-g", "svc-g", "forward RPC", { protocol: "grpc", bidirectional: true }),
    ce("e-g3", "svc-g", "db-g", "read SKU", { protocol: "tcp", bidirectional: true }),
    ce("e-q1", "cl-q", "gql-q", "{ user { orders } }", { protocol: "http", bidirectional: true }),
    ce("e-q2", "gql-q", "usr-q", "resolve user", { protocol: "http", bidirectional: true }),
    ce("e-q3", "gql-q", "ord-q", "resolve orders", { protocol: "http", bidirectional: true }),
    ce("e-w1", "cl-w", "lb-w", "HTTP upgrade", { protocol: "websocket", bidirectional: true }),
    ce("e-w2", "lb-w", "ws-w", "sticky session", { protocol: "websocket", bidirectional: true }),
    ce("e-w3", "ws-w", "cache-w", "presence heartbeat", { protocol: "tcp", bidirectional: true }),
    ce("e-h1", "pay-h", "mq-h", "PaymentSettled", { protocol: "pubsub", async: true }),
    ce("e-h2", "mq-h", "wh-h", "deliver event", { protocol: "pubsub", async: true }),
    ce("e-h3", "wh-h", "cl-h", "POST /webhook", { protocol: "http", async: true }),
    ce("e-e1", "prod-e", "mq-e", "OrderPlaced", { protocol: "pubsub", async: true }),
    ce("e-e2", "mq-e", "inv-e", "reserve stock", { protocol: "pubsub", async: true }),
    ce("e-e3", "mq-e", "ship-e", "create shipment", { protocol: "pubsub", async: true }),
    ce("e-e4", "mq-e", "ana-e", "stream to warehouse", { protocol: "pubsub", async: true }),
  ];

  return buildTutorial(nodes, edges);
}

function buildPubSubTutorial() {
  const yQ = 0;
  const yP = ROW.h * 3;
  const nodes = [
    ...tutorialTitle(
      "pubsub",
      "Message Queues & Pub/Sub",
      "Point-to-point work distribution vs broadcast event fan-out",
    ),
    sectionLabel("lbl-q", "Point-to-point queue — one consumer per message", yQ),
    cn("api-q", "api-gateway", 0, 0, "API"),
    cn("prod-q", "app-server", 1, 0, "Producer"),
    cn("mq-q", "message-queue", 2, 0, "Task Queue"),
    cn("w1-q", "app-server", 3, 0, "Worker 1"),
    cn("w2-q", "app-server", 3, 1, "Worker 2"),
    cn("db-q", "sql-db", 4, 0, "Job Store"),

    sectionLabel("lbl-p", "Pub/Sub topic — every subscriber gets a copy", yP),
    cn("pub-p", "app-server", 0, yP / ROW.h, "Order Service"),
    cn("topic-p", "pub-sub", 1, yP / ROW.h, "orders.events"),
    cn("email-p", "notification-service", 2, yP / ROW.h, "Email Sub"),
    cn("cache-p", "cache", 2, yP / ROW.h + 1, "Cache Invalidator"),
    cn("search-p", "search", 2, yP / ROW.h + 2, "Search Indexer"),
    cn("wh-p", "app-server", 3, yP / ROW.h, "Webhook Fan-out"),
  ];

  const edges = [
    ce("e-q1", "api-q", "prod-q", "enqueue job", { protocol: "http" }),
    ce("e-q2", "prod-q", "mq-q", "publish task", { protocol: "pubsub", async: true }),
    ce("e-q3", "mq-q", "w1-q", "competing consumer", { protocol: "pubsub", async: true }),
    ce("e-q4", "mq-q", "w2-q", "competing consumer", { protocol: "pubsub", async: true }),
    ce("e-q5", "w1-q", "db-q", "mark complete", { protocol: "tcp" }),
    ce("e-p1", "pub-p", "topic-p", "OrderCreated", { protocol: "pubsub", async: true }),
    ce("e-p2", "topic-p", "email-p", "send receipt", { protocol: "pubsub", async: true }),
    ce("e-p3", "topic-p", "cache-p", "invalidate PDP", { protocol: "pubsub", async: true }),
    ce("e-p4", "topic-p", "search-p", "reindex product", { protocol: "pubsub", async: true }),
    ce("e-p5", "topic-p", "wh-p", "notify partners", { protocol: "pubsub", async: true }),
  ];

  return buildTutorial(nodes, edges);
}

function buildSerializationTutorial() {
  const nodes = [
    ...tutorialTitle(
      "serde",
      "Serialization & API Contracts",
      "How data is encoded on the wire and evolved safely",
    ),
    sectionLabel("lbl-json", "JSON + OpenAPI — human-readable REST contracts", 0),
    cn("cl-j", "client", 0, 0, "REST Client"),
    cn("gw-j", "api-gateway", 1, 0, "API Gateway"),
    cn("svc-j", "app-server", 2, 0, "Service"),
    note("nj", '{"id":42,"name":"Ada"} — schema-on-read', COL.x3, 20),

    sectionLabel("lbl-proto", "Protobuf + gRPC — schema-first binary RPC", ROW.h * 2),
    cn("cl-p", "client", 0, 2, "gRPC Client"),
    cn("gen-p", "app-server", 1, 2, "Generated Stubs"),
    cn("svc-p", "app-server", 2, 2, "Service Impl"),
    cn("reg-p", "config-service", 3, 2, "Schema Registry"),
    note("np", ".proto defines messages — backward compatible fields", COL.x3, ROW.h * 2 + 20),
  ];

  const edges = [
    ce("e-j1", "cl-j", "gw-j", "JSON body", { protocol: "http", bidirectional: true }),
    ce("e-j2", "gw-j", "svc-j", "validate OpenAPI", { protocol: "http", bidirectional: true }),
    ce("e-p1", "cl-p", "gen-p", "marshal request", { protocol: "grpc", bidirectional: true }),
    ce("e-p2", "gen-p", "svc-p", "invoke handler", { protocol: "grpc" }),
    ce("e-p3", "svc-p", "reg-p", "check schema v2", { protocol: "http", bidirectional: true }),
  ];

  return buildTutorial(nodes, edges);
}

function buildDeliveryTutorial() {
  const col = (i: number) => i * 320;
  const nodes = [
    ...tutorialTitle(
      "delivery",
      "Message Delivery Semantics",
      "Trade-offs between loss, duplication, and complexity",
    ),
    sectionLabel("lbl-mo", "At-most-once — fire and forget", 0),
    cn("p-mo", "app-server", 0, 0, "Producer"),
    cn("q-mo", "message-queue", 1, 0, "Queue"),
    note("no-mo", "No retry → may lose message on crash", col(2), 10),

    sectionLabel("lbl-al", "At-least-once — retry until ACK", ROW.h * 2),
    cn("p-al", "app-server", 0, 2, "Producer"),
    cn("q-al", "message-queue", 1, 2, "Queue"),
    cn("c-al", "app-server", 2, 2, "Consumer"),
    cn("ded-al", "cache", 3, 2, "Dedup Store"),
    note("no-al", "Retries → duplicates possible", col(2), ROW.h * 2 + 10),

    sectionLabel("lbl-eo", "Exactly-once — transactional outbox", ROW.h * 4),
    cn("p-eo", "app-server", 0, 4, "Producer"),
    cn("db-eo", "sql-db", 1, 4, "Business DB"),
    cn("out-eo", "sql-db", 2, 4, "Outbox Table"),
    cn("relay-eo", "stream-processor", 3, 4, "Outbox Relay"),
    cn("q-eo", "message-queue", 4, 4, "Broker"),
    cn("c-eo", "app-server", 5, 4, "Idempotent Consumer"),
  ];

  const edges = [
    ce("e-mo1", "p-mo", "q-mo", "send once", { protocol: "pubsub", async: true }),
    ce("e-al1", "p-al", "q-al", "retry w/ backoff", { protocol: "pubsub", async: true }),
    ce("e-al2", "q-al", "c-al", "deliver (maybe twice)", { protocol: "pubsub", async: true }),
    ce("e-al3", "c-al", "ded-al", "check idempotency key", { protocol: "tcp", bidirectional: true }),
    ce("e-eo1", "p-eo", "db-eo", "txn: write order", { protocol: "tcp", bidirectional: true }),
    ce("e-eo2", "p-eo", "out-eo", "txn: write outbox row", { protocol: "tcp" }),
    ce("e-eo3", "relay-eo", "out-eo", "poll new events", { protocol: "tcp", bidirectional: true }),
    ce("e-eo4", "relay-eo", "q-eo", "publish once", { protocol: "pubsub", async: true }),
    ce("e-eo5", "q-eo", "c-eo", "process w/ dedupe", { protocol: "pubsub", async: true }),
  ];

  return buildTutorial(nodes, edges);
}

export const COMMUNICATION_SIMULATIONS: ConceptSimulationDefinition[] = [
  {
    id: "sync-vs-async",
    title: "Sync vs Async",
    description: "Blocking pipelines vs queue-decoupled workers",
    topicId: "communication",
    conceptId: "sync-vs-async",
    build: buildSyncAsyncTutorial,
    autoPlayMs: AUTO,
    steps: defineSteps([
      {
        id: "overview",
        title: "Two communication models",
        description:
          "The top path is synchronous: the client waits for the full write to complete. The bottom path accepts work immediately and processes it asynchronously.",
      },
      {
        id: "sync-request",
        title: "Sync: client sends order",
        description: "POST /orders hits the API gateway. The HTTP connection stays open — the user sees a spinner.",
        edges: ["e-s1"],
        nodes: ["c-sync", "gw-sync"],
      },
      {
        id: "sync-process",
        title: "Sync: service writes to database",
        description:
          "The order service validates and commits to PostgreSQL before returning. Any DB slowness directly increases user latency.",
        edges: ["e-s2", "e-s3"],
        nodes: ["ord-sync", "db-sync"],
      },
      {
        id: "async-accept",
        title: "Async: gateway accepts immediately",
        description:
          "The gateway publishes an OrderCreated event and returns 202 Accepted. The client can continue — no thread blocked on DB I/O.",
        edges: ["e-a1", "e-a2", "e-a3"],
        nodes: ["c-async", "gw-async", "mq-async"],
      },
      {
        id: "async-worker",
        title: "Async: worker processes in background",
        description:
          "A worker pulls from the queue, persists the order, and triggers a push notification when ready.",
        edges: ["e-a4", "e-a5", "e-a6"],
        nodes: ["w-async", "db-async", "notify-async"],
      },
    ]),
  },
  {
    id: "api-six-styles",
    title: "Six API Styles",
    description: "REST, gRPC, GraphQL, WebSocket, Webhooks, and events",
    topicId: "communication",
    conceptId: "rpc-rest",
    build: buildApiStylesTutorial,
    autoPlayMs: AUTO,
    steps: defineSteps([
      {
        id: "overview",
        title: "Six ways services communicate",
        description:
          "Each row shows a full internal path — not just two boxes, but the real components involved (auth, cache, broker, etc.).",
      },
      {
        id: "rest",
        title: "REST: resource-oriented HTTP",
        description:
          "GET /users/42 flows through gateway → auth → service → cache-aside → database. Stateless, cacheable, JSON payloads.",
        edges: ["e-r1", "e-r2", "e-r3", "e-r4", "e-r5"],
        nodes: ["cl-r", "gw-r", "auth-r", "svc-r", "cache-r", "db-r"],
      },
      {
        id: "grpc",
        title: "gRPC: typed RPC over HTTP/2",
        description:
          "Internal callers invoke GetStock() through a service mesh. Protobuf messages are compact; stubs are generated from .proto files.",
        edges: ["e-g1", "e-g2", "e-g3"],
        nodes: ["cl-g", "mesh-g", "svc-g", "db-g"],
      },
      {
        id: "graphql",
        title: "GraphQL: client-shaped queries",
        description:
          "One POST carries a query. The gateway fans out to Users and Orders services, stitching the response the client asked for.",
        edges: ["e-q1", "e-q2", "e-q3"],
        nodes: ["cl-q", "gql-q", "usr-q", "ord-q"],
      },
      {
        id: "websocket",
        title: "WebSocket: live bidirectional stream",
        description:
          "After HTTP upgrade, messages flow both ways through a load-balanced WS cluster. Presence is tracked in Redis.",
        edges: ["e-w1", "e-w2", "e-w3"],
        nodes: ["cl-w", "lb-w", "ws-w", "cache-w"],
      },
      {
        id: "webhook",
        title: "Webhooks: server-initiated callbacks",
        description:
          "Payment settlement emits an event. A dispatcher POSTs to the merchant's registered callback URL — no polling required.",
        edges: ["e-h1", "e-h2", "e-h3"],
        nodes: ["pay-h", "mq-h", "wh-h", "cl-h"],
      },
      {
        id: "events",
        title: "Event-driven: pub/sub fan-out",
        description:
          "Checkout publishes OrderPlaced. Inventory, shipping, and analytics each consume independently — temporal decoupling.",
        edges: ["e-e1", "e-e2", "e-e3", "e-e4"],
        nodes: ["prod-e", "mq-e", "inv-e", "ship-e", "ana-e"],
      },
    ]),
  },
  {
    id: "pubsub-queue",
    title: "Queues & Pub/Sub",
    description: "Work queues vs broadcast topics",
    topicId: "communication",
    conceptId: "message-queues",
    build: buildPubSubTutorial,
    autoPlayMs: AUTO,
    steps: defineSteps([
      {
        id: "overview",
        title: "Queue vs topic",
        description:
          "Queues deliver each message to one worker (competing consumers). Topics deliver a copy to every subscriber.",
      },
      {
        id: "queue",
        title: "Task queue absorbs bursts",
        description:
          "API enqueues background jobs. Workers compete for messages — each job processed exactly once by one worker.",
        edges: ["e-q1", "e-q2", "e-q3", "e-q4", "e-q5"],
        nodes: ["api-q", "prod-q", "mq-q", "w1-q", "db-q"],
      },
      {
        id: "pubsub",
        title: "Topic fans out to many services",
        description:
          "OrderCreated triggers email, cache invalidation, search reindex, and partner webhooks — all in parallel.",
        edges: ["e-p1", "e-p2", "e-p3", "e-p4", "e-p5"],
        nodes: ["pub-p", "topic-p", "email-p", "cache-p", "search-p"],
      },
    ]),
  },
  {
    id: "serialization",
    title: "Serialization & Contracts",
    description: "JSON/OpenAPI vs Protobuf/gRPC",
    topicId: "communication",
    conceptId: "serialization",
    build: buildSerializationTutorial,
    autoPlayMs: AUTO,
    steps: defineSteps([
      {
        id: "overview",
        title: "Encoding on the wire",
        description:
          "How you serialize data affects payload size, speed, schema evolution, and who can call your API.",
      },
      {
        id: "json",
        title: "JSON + OpenAPI for REST",
        description:
          "Human-readable text. Gateway validates against OpenAPI spec. Easy to debug; larger on the wire.",
        edges: ["e-j1", "e-j2"],
        nodes: ["cl-j", "gw-j", "svc-j"],
      },
      {
        id: "proto",
        title: "Protobuf + schema registry",
        description:
          "Binary encoding with generated stubs. Schema registry enforces backward-compatible field additions.",
        edges: ["e-p1", "e-p2", "e-p3"],
        nodes: ["cl-p", "gen-p", "svc-p", "reg-p"],
      },
    ]),
  },
  {
    id: "delivery-semantics",
    title: "Delivery Semantics",
    description: "At-most-once, at-least-once, exactly-once",
    topicId: "communication",
    conceptId: "delivery-semantics",
    build: buildDeliveryTutorial,
    autoPlayMs: AUTO,
    steps: defineSteps([
      {
        id: "overview",
        title: "Three guarantees",
        description:
          "You cannot have all three of fast, lossless, and duplicate-free without additional infrastructure.",
      },
      {
        id: "at-most",
        title: "At-most-once: may lose messages",
        description: "Producer sends once with no retry. Simple and fast, but network blips can drop events.",
        edges: ["e-mo1"],
        nodes: ["p-mo", "q-mo"],
      },
      {
        id: "at-least",
        title: "At-least-once: may duplicate",
        description:
          "Producer retries until ACK. Consumer checks an idempotency key in a dedup store before processing.",
        edges: ["e-al1", "e-al2", "e-al3"],
        nodes: ["p-al", "q-al", "c-al", "ded-al"],
      },
      {
        id: "exactly",
        title: "Exactly-once: transactional outbox",
        description:
          "Business write and outbox row commit in one DB transaction. Relay publishes to broker; consumer deduplicates.",
        edges: ["e-eo1", "e-eo2", "e-eo3", "e-eo4", "e-eo5"],
        nodes: ["p-eo", "db-eo", "out-eo", "relay-eo", "q-eo", "c-eo"],
      },
    ]),
  },
];
