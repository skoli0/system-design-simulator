/**
 * Distributed systems learning topics aligned with
 * "Understanding Distributed Systems" by Roberto Vitillo.
 */

export interface LearningConcept {
  id: string;
  title: string;
  summary: string;
}

export interface LearningSimulation {
  id: string;
  title: string;
  description: string;
  conceptId: string;
  /** Key into CONCEPT_SIMULATIONS registry */
  simulationId: string;
}

export interface DistributedSystemsTopic {
  id: string;
  name: string;
  description: string;
  vitilloChapter: string;
  concepts: LearningConcept[];
  simulations: LearningSimulation[];
}

export const DISTRIBUTED_SYSTEMS_BOOK = {
  title: "Understanding Distributed Systems",
  author: "Roberto Vitillo",
};

export const DISTRIBUTED_SYSTEMS_TOPICS: DistributedSystemsTopic[] = [
  {
    id: "communication",
    name: "Communication",
    description: "How nodes exchange data reliably across unreliable networks",
    vitilloChapter: "Ch. 3–4",
    concepts: [
      {
        id: "sync-vs-async",
        title: "Synchronous vs asynchronous",
        summary:
          "Sync calls block until a response arrives; async decouples sender and receiver via queues or callbacks, improving throughput at the cost of complexity.",
      },
      {
        id: "rpc-rest",
        title: "RPC & REST APIs",
        summary:
          "Remote procedure calls and HTTP APIs are the primary request/response patterns. Choose based on coupling, schema evolution, and client diversity.",
      },
      {
        id: "message-queues",
        title: "Message queues & pub/sub",
        summary:
          "Queues buffer work between producers and consumers; pub/sub fans out events to many subscribers. Both enable loose coupling and burst absorption.",
      },
      {
        id: "serialization",
        title: "Serialization & contracts",
        summary:
          "JSON, Protobuf, and Avro define how data crosses process boundaries. Versioned schemas prevent breaking changes during rolling deploys.",
      },
      {
        id: "delivery-semantics",
        title: "Delivery semantics",
        summary:
          "At-most-once may drop messages; at-least-once can duplicate; exactly-once requires idempotent consumers and transactional outbox patterns.",
      },
    ],
    simulations: [
      {
        id: "chat-comm",
        title: "Real-time chat",
        description: "WebSockets, presence, and ordered message delivery",
        conceptId: "sync-vs-async",
        simulationId: "chat-system",
      },
      {
        id: "whatsapp-comm",
        title: "WhatsApp messaging",
        description: "Store-and-forward, delivery receipts, E2E encryption",
        conceptId: "rpc-rest",
        simulationId: "whatsapp",
      },
      {
        id: "mq-comm",
        title: "Message queue design",
        description: "Partitioned logs, consumer groups, replication",
        conceptId: "message-queues",
        simulationId: "message-queue-design",
      },
      {
        id: "notify-comm",
        title: "Notification system",
        description: "Async fan-out across email, push, and SMS channels",
        conceptId: "delivery-semantics",
        simulationId: "notification-system",
      },
    ],
  },
  {
    id: "coordination",
    name: "Coordination",
    description: "Agreeing on shared state when nodes fail independently",
    vitilloChapter: "Ch. 5–6",
    concepts: [
      {
        id: "consensus",
        title: "Consensus & leader election",
        summary:
          "Raft and Paxos elect a leader and replicate a log so all nodes agree on ordering—even after crashes and network partitions.",
      },
      {
        id: "distributed-locks",
        title: "Distributed locking",
        summary:
          "Locks serialize access to shared resources (seats, inventory). Fencing tokens prevent stale lock holders from writing after expiry.",
      },
      {
        id: "two-phase-commit",
        title: "Two-phase commit",
        summary:
          "2PC atomically commits across participants but blocks on coordinator failure. Sagas trade atomicity for availability via compensating actions.",
      },
      {
        id: "clock-ordering",
        title: "Clocks & ordering",
        summary:
          "Wall clocks drift; logical clocks (Lamport, vector) establish causal order. CRDTs merge concurrent edits without central coordination.",
      },
      {
        id: "membership",
        title: "Membership & failure detection",
        summary:
          "Gossip protocols spread node health; phi-accrual failure detectors adapt to variable network latency instead of fixed timeouts.",
      },
    ],
    simulations: [
      {
        id: "sim-consensus",
        title: "Consensus & Leader Election",
        description: "Raft replication with quorum ACKs",
        conceptId: "consensus",
        simulationId: "consensus",
      },
      {
        id: "sim-lock",
        title: "Distributed Locking",
        description: "Leases, fencing tokens, exclusive access",
        conceptId: "distributed-locks",
        simulationId: "distributed-lock",
      },
      {
        id: "sim-2pc",
        title: "Two-Phase Commit",
        description: "Atomic commit across microservices",
        conceptId: "two-phase-commit",
        simulationId: "two-phase-commit",
      },
      {
        id: "sim-clocks",
        title: "Clocks & Ordering",
        description: "Causal order without synchronized wall clocks",
        conceptId: "clock-ordering",
        simulationId: "clock-ordering",
      },
      {
        id: "sim-membership",
        title: "Membership & Failure Detection",
        description: "Gossip and phi-accrual failure detectors",
        conceptId: "membership",
        simulationId: "membership",
      },
    ],
  },
  {
    id: "scalability",
    name: "Scalability",
    description: "Growing throughput and capacity without redesigning everything",
    vitilloChapter: "Ch. 7–8",
    concepts: [
      {
        id: "horizontal-vertical",
        title: "Horizontal vs vertical scaling",
        summary:
          "Vertical scaling adds CPU/RAM to one machine (simple, limited). Horizontal scaling adds nodes (complex, virtually unlimited).",
      },
      {
        id: "partitioning",
        title: "Partitioning & sharding",
        summary:
          "Split data by key range or hash so each shard fits on one node. Rebalancing and hot keys are the main operational challenges.",
      },
      {
        id: "caching-layers",
        title: "Caching layers",
        summary:
          "CDN, application cache, and database buffer pools each reduce load at different tiers. Cache invalidation remains the hard problem.",
      },
      {
        id: "read-write-paths",
        title: "Read vs write paths",
        summary:
          "Read-heavy systems fan out via replicas and CDNs; write-heavy systems batch, partition, or pipeline through async queues.",
      },
      {
        id: "stateless-services",
        title: "Stateless services",
        summary:
          "Push state to databases and caches so app servers scale freely behind a load balancer. Session stickiness is a scaling anti-pattern.",
      },
    ],
    simulations: [
      {
        id: "sim-scale",
        title: "Horizontal Scaling",
        description: "Stateless replicas behind a load balancer",
        conceptId: "horizontal-vertical",
        simulationId: "horizontal-scaling",
      },
      {
        id: "sim-shard",
        title: "Partitioning & Sharding",
        description: "Hash-based data distribution",
        conceptId: "partitioning",
        simulationId: "partitioning",
      },
      {
        id: "sim-cache",
        title: "Caching Layers",
        description: "Multi-tier cache hierarchy",
        conceptId: "caching-layers",
        simulationId: "caching-layers",
      },
      {
        id: "sim-rw",
        title: "Read vs Write Paths",
        description: "CQRS separates command and query models",
        conceptId: "read-write-paths",
        simulationId: "read-write-paths",
      },
      {
        id: "sim-stateless",
        title: "Stateless Services",
        description: "External session store enables free scaling",
        conceptId: "stateless-services",
        simulationId: "stateless-services",
      },
    ],
  },
  {
    id: "resiliency",
    name: "Resiliency",
    description: "Staying available and correct when components fail",
    vitilloChapter: "Ch. 9–10",
    concepts: [
      {
        id: "timeouts-retries",
        title: "Timeouts & retries",
        summary:
          "Set deadlines shorter than client patience. Exponential backoff with jitter prevents retry storms from amplifying outages.",
      },
      {
        id: "circuit-breaker",
        title: "Circuit breakers",
        summary:
          "Stop calling a failing dependency after a threshold; fail fast and probe periodically. Prevents cascading failures across services.",
      },
      {
        id: "bulkhead",
        title: "Bulkheads & isolation",
        summary:
          "Partition thread pools and connection limits per dependency so one slow service cannot exhaust shared resources.",
      },
      {
        id: "graceful-degradation",
        title: "Graceful degradation",
        summary:
          "Serve stale cache, disable non-critical features, or return partial results rather than a full outage when dependencies fail.",
      },
      {
        id: "idempotency",
        title: "Idempotency keys",
        summary:
          "Duplicate requests (from retries or at-least-once delivery) must not double-charge or double-book. Idempotency keys deduplicate safely.",
      },
    ],
    simulations: [
      {
        id: "sim-retries",
        title: "Retries & Backoff",
        description: "Exponential backoff with jitter",
        conceptId: "timeouts-retries",
        simulationId: "retries-backoff",
      },
      {
        id: "sim-cb",
        title: "Circuit Breaker",
        description: "Fail fast when a downstream dependency is unhealthy",
        conceptId: "circuit-breaker",
        simulationId: "circuit-breaker",
      },
      {
        id: "sim-bulkhead",
        title: "Bulkhead Isolation",
        description: "Isolate resource pools per dependency",
        conceptId: "bulkhead",
        simulationId: "bulkhead",
      },
      {
        id: "sim-degrade",
        title: "Graceful Degradation",
        description: "Shed load by disabling non-critical features",
        conceptId: "graceful-degradation",
        simulationId: "graceful-degradation",
      },
      {
        id: "sim-idem",
        title: "Idempotency Keys",
        description: "Safe retries without duplicate side effects",
        conceptId: "idempotency",
        simulationId: "idempotency",
      },
    ],
  },
  {
    id: "testing-operations",
    name: "Testing & Operations",
    description: "Observing, deploying, and validating distributed behavior",
    vitilloChapter: "Ch. 11–12",
    concepts: [
      {
        id: "observability",
        title: "Observability pillars",
        summary:
          "Metrics (what), logs (why), and traces (where) form the three pillars. Structured logging and correlation IDs tie them together.",
      },
      {
        id: "slo-sli",
        title: "SLIs, SLOs & error budgets",
        summary:
          "Define measurable indicators (latency p99), set targets (99.9% availability), and spend error budget on risky launches.",
      },
      {
        id: "deployment-strategies",
        title: "Deployment strategies",
        summary:
          "Rolling, blue-green, and canary deploys reduce blast radius. Feature flags decouple release from exposure.",
      },
      {
        id: "chaos-engineering",
        title: "Chaos engineering",
        summary:
          "Inject failures in production (kill nodes, add latency) to verify that resilience patterns actually work before real incidents.",
      },
      {
        id: "capacity-planning",
        title: "Capacity planning",
        summary:
          "Load test to find breaking points; model growth curves; automate scaling policies. Over-provisioning is expensive; under-provisioning is worse.",
      },
    ],
    simulations: [
      {
        id: "sim-obs",
        title: "Observability Pillars",
        description: "Metrics, logs, and traces flowing from a service",
        conceptId: "observability",
        simulationId: "observability",
      },
      {
        id: "sim-slo",
        title: "SLIs, SLOs & Error Budgets",
        description: "Reliability targets drive engineering decisions",
        conceptId: "slo-sli",
        simulationId: "slos",
      },
      {
        id: "sim-deploy",
        title: "Deployment Strategies",
        description: "Canary releases with automated rollback",
        conceptId: "deployment-strategies",
        simulationId: "deployment-strategies",
      },
      {
        id: "sim-chaos",
        title: "Chaos Engineering",
        description: "Proactive failure injection in production",
        conceptId: "chaos-engineering",
        simulationId: "chaos-engineering",
      },
      {
        id: "sim-capacity",
        title: "Capacity Planning",
        description: "Load testing and auto-scaling policies",
        conceptId: "capacity-planning",
        simulationId: "capacity-planning",
      },
    ],
  },
];

export function getLearningConcept(
  topicId: string,
  conceptId: string,
): LearningConcept | undefined {
  const topic = DISTRIBUTED_SYSTEMS_TOPICS.find((t) => t.id === topicId);
  return topic?.concepts.find((c) => c.id === conceptId);
}

export function getAdjacentConcepts(
  topicId: string,
  conceptId: string,
): { prev: LearningConcept | null; next: LearningConcept | null } {
  const topic = DISTRIBUTED_SYSTEMS_TOPICS.find((t) => t.id === topicId);
  if (!topic) return { prev: null, next: null };
  const idx = topic.concepts.findIndex((c) => c.id === conceptId);
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? topic.concepts[idx - 1] : null,
    next: idx < topic.concepts.length - 1 ? topic.concepts[idx + 1] : null,
  };
}
