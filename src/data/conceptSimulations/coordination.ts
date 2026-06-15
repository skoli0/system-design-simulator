import type { ConceptSimulationDefinition } from "@/types/conceptSimulation";
import {
  tutorialTitle,
  cn,
  ce,
  buildTutorial,
  defineSteps,
} from "@/lib/conceptSimulations/tutorialLayout";

const AUTO = 5500;

function buildConsensusTutorial() {
  const nodes = [
    ...tutorialTitle("consensus", "Consensus & Leader Election", "Raft: one leader, replicated log, majority quorum"),
    cn("c1", "client", 0, 0, "Client"),
    cn("lb", "load-balancer", 1, 0, "LB"),
    cn("l", "coordination-service", 2, 0, "Leader"),
    cn("f1", "coordination-service", 3, 0, "Follower 1"),
    cn("f2", "coordination-service", 3, 1, "Follower 2"),
    cn("f3", "coordination-service", 3, 2, "Follower 3"),
  ];
  const edges = [
    ce("e1", "c1", "lb", "write config", { protocol: "http", bidirectional: true }),
    ce("e2", "lb", "l", "route to leader", { protocol: "http", bidirectional: true }),
    ce("e3", "l", "f1", "replicate log entry", { protocol: "tcp" }),
    ce("e4", "l", "f2", "replicate log entry", { protocol: "tcp" }),
    ce("e5", "l", "f3", "replicate log entry", { protocol: "tcp" }),
    ce("e6", "f1", "l", "ACK (2/3 quorum)", { protocol: "tcp", async: true }),
  ];
  return buildTutorial(nodes, edges);
}

function buildLockTutorial() {
  const nodes = [
    ...tutorialTitle("lock", "Distributed Locking", "Serialize access with leases and fencing tokens"),
    cn("a", "client", 0, 0, "Client A"),
    cn("b", "client", 0, 1, "Client B"),
    cn("lock", "distributed-lock", 1, 0, "Lock Service"),
    cn("cache", "cache", 2, 0, "Lease Store"),
    cn("db", "sql-db", 3, 0, "Inventory DB"),
  ];
  const edges = [
    ce("e1", "a", "lock", "acquire lease", { protocol: "tcp", bidirectional: true }),
    ce("e2", "lock", "cache", "store token=42", { protocol: "tcp", bidirectional: true }),
    ce("e3", "a", "db", "write w/ fence=42", { protocol: "tcp", bidirectional: true }),
    ce("e4", "b", "lock", "blocked — lease held", { protocol: "tcp" }),
  ];
  return buildTutorial(nodes, edges);
}

function build2pcTutorial() {
  const nodes = [
    ...tutorialTitle("2pc", "Two-Phase Commit", "Coordinator orchestrates all-or-nothing across services"),
    cn("coord", "app-server", 0, 0, "Coordinator"),
    cn("pay", "app-server", 1, 0, "Payment Svc"),
    cn("inv", "app-server", 1, 1, "Inventory Svc"),
    cn("ship", "app-server", 1, 2, "Shipping Svc"),
    cn("log", "sql-db", 2, 0, "Txn Log"),
  ];
  const edges = [
    ce("e1", "coord", "pay", "PREPARE", { protocol: "http", bidirectional: true }),
    ce("e2", "coord", "inv", "PREPARE", { protocol: "http", bidirectional: true }),
    ce("e3", "coord", "ship", "PREPARE", { protocol: "http", bidirectional: true }),
    ce("e4", "coord", "log", "record decision", { protocol: "tcp" }),
    ce("e5", "coord", "pay", "COMMIT", { protocol: "http", async: true }),
  ];
  return buildTutorial(nodes, edges);
}

function buildClocksTutorial() {
  const nodes = [
    ...tutorialTitle("clocks", "Clocks & Causal Ordering", "Lamport timestamps and vector clocks for event order"),
    cn("a", "app-server", 0, 0, "Service A"),
    cn("b", "app-server", 1, 0, "Service B"),
    cn("c", "app-server", 2, 0, "Service C"),
    cn("store", "nosql-db", 3, 0, "Event Store"),
  ];
  const edges = [
    ce("e1", "a", "b", "event t=5", { protocol: "http", async: true }),
    ce("e2", "b", "c", "event t=6 (causal)", { protocol: "http", async: true }),
    ce("e3", "c", "store", "append w/ vector clock", { protocol: "tcp" }),
    ce("e4", "a", "store", "append w/ vector clock", { protocol: "tcp" }),
  ];
  return buildTutorial(nodes, edges);
}

function buildMembershipTutorial() {
  const nodes = [
    ...tutorialTitle("member", "Membership & Failure Detection", "Gossip protocol spreads node health across the cluster"),
    cn("n1", "app-server", 0, 0, "Node 1"),
    cn("n2", "app-server", 1, 0, "Node 2"),
    cn("n3", "app-server", 2, 0, "Node 3"),
    cn("n4", "app-server", 1, 1, "Node 4 (suspect)"),
    cn("mon", "monitoring", 3, 0, "Health Monitor"),
  ];
  const edges = [
    ce("e1", "n1", "n2", "gossip heartbeat", { protocol: "tcp", bidirectional: true }),
    ce("e2", "n2", "n3", "gossip heartbeat", { protocol: "tcp", bidirectional: true }),
    ce("e3", "n3", "n4", "phi-accrual: suspect", { protocol: "tcp" }),
    ce("e4", "mon", "n1", "alert on failure", { protocol: "http", async: true }),
  ];
  return buildTutorial(nodes, edges);
}

export const COORDINATION_SIMULATIONS: ConceptSimulationDefinition[] = [
  {
    id: "consensus",
    title: "Consensus & Leader Election",
    description: "Raft replication with quorum ACKs",
    topicId: "coordination",
    conceptId: "consensus",
    build: buildConsensusTutorial,
    autoPlayMs: AUTO,
    steps: defineSteps([
      { id: "overview", title: "Why consensus?", description: "Multiple nodes must agree on order of writes. Raft elects a leader that replicates log entries to followers." },
      { id: "write", title: "Client writes to leader", description: "All mutations go through the elected leader — followers reject direct writes.", edges: ["e1", "e2"], nodes: ["c1", "lb", "l"] },
      { id: "replicate", title: "Leader replicates log", description: "Entry is sent to all followers before acknowledging the client.", edges: ["e3", "e4", "e5"], nodes: ["l", "f1", "f2", "f3"] },
      { id: "quorum", title: "Majority quorum commits", description: "With 2/3 ACKs the entry is committed. Leader survives losing one node.", edges: ["e6"], nodes: ["f1", "l"] },
    ]),
  },
  {
    id: "distributed-lock",
    title: "Distributed Locking",
    description: "Leases, fencing tokens, exclusive access",
    topicId: "coordination",
    conceptId: "distributed-locks",
    build: buildLockTutorial,
    autoPlayMs: AUTO,
    steps: defineSteps([
      { id: "overview", title: "Why distributed locks?", description: "Multiple clients must not write the same inventory row concurrently." },
      { id: "acquire", title: "Client A acquires lease", description: "Lock service grants a time-bound lease and fencing token 42.", edges: ["e1", "e2"], nodes: ["a", "lock", "cache"] },
      { id: "write", title: "Fenced write to DB", description: "DB rejects writes with stale tokens — prevents split-brain after lease expiry.", edges: ["e3"], nodes: ["a", "db"] },
      { id: "block", title: "Client B is blocked", description: "B cannot acquire the lock until A releases or lease expires.", edges: ["e4"], nodes: ["b", "lock"] },
    ]),
  },
  {
    id: "two-phase-commit",
    title: "Two-Phase Commit",
    description: "Atomic commit across microservices",
    topicId: "coordination",
    conceptId: "two-phase-commit",
    build: build2pcTutorial,
    autoPlayMs: AUTO,
    steps: defineSteps([
      { id: "overview", title: "Distributed transactions", description: "2PC ensures all participants commit or all abort — at the cost of blocking on coordinator failure." },
      { id: "prepare", title: "Phase 1: PREPARE", description: "Coordinator asks each service: can you commit? Services lock resources and vote yes/no.", edges: ["e1", "e2", "e3"], nodes: ["coord", "pay", "inv", "ship"] },
      { id: "commit", title: "Phase 2: COMMIT", description: "All voted yes → coordinator logs decision and sends COMMIT to all.", edges: ["e4", "e5"], nodes: ["coord", "log", "pay"] },
    ]),
  },
  {
    id: "clock-ordering",
    title: "Clocks & Ordering",
    description: "Causal order without synchronized wall clocks",
    topicId: "coordination",
    conceptId: "clock-ordering",
    build: buildClocksTutorial,
    autoPlayMs: AUTO,
    steps: defineSteps([
      { id: "overview", title: "Time in distributed systems", description: "Wall clocks drift. Logical clocks capture cause-and-effect between events." },
      { id: "causal", title: "Causal chain A → B → C", description: "Each hop increments the Lamport timestamp. C sees the full causal history.", edges: ["e1", "e2"], nodes: ["a", "b", "c"] },
      { id: "store", title: "Merge into event store", description: "Vector clocks detect concurrent writes for CRDT-style merge.", edges: ["e3", "e4"], nodes: ["c", "a", "store"] },
    ]),
  },
  {
    id: "membership",
    title: "Membership & Failure Detection",
    description: "Gossip and phi-accrual failure detectors",
    topicId: "coordination",
    conceptId: "membership",
    build: buildMembershipTutorial,
    autoPlayMs: AUTO,
    steps: defineSteps([
      { id: "overview", title: "Who is alive?", description: "Clusters need a live membership view to route traffic and trigger failover." },
      { id: "gossip", title: "Gossip spreads heartbeats", description: "Each node periodically exchanges state with peers — no central registry required.", edges: ["e1", "e2"], nodes: ["n1", "n2", "n3"] },
      { id: "suspect", title: "Phi-accrual suspects Node 4", description: "Adaptive timeout based on historical latency — fewer false positives than fixed timeouts.", edges: ["e3"], nodes: ["n3", "n4"] },
      { id: "alert", title: "Monitor alerts operators", description: "Confirmed failure triggers page and automatic traffic drain.", edges: ["e4"], nodes: ["mon", "n1"] },
    ]),
  },
];
