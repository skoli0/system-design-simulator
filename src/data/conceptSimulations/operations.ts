import type { ConceptSimulationDefinition } from "@/types/conceptSimulation";
import {
  tutorialTitle,
  cn,
  ce,
  buildTutorial,
  defineSteps,
} from "@/lib/conceptSimulations/tutorialLayout";

const AUTO = 5500;

function buildObservabilityTutorial() {
  const nodes = [
    ...tutorialTitle("obs", "Observability Stack", "Metrics, logs, and traces — the three pillars"),
    cn("svc", "app-server", 0, 0, "Microservice"),
    cn("otel", "monitoring", 1, 0, "OTel Collector"),
    cn("prom", "monitoring", 2, 0, "Prometheus"),
    cn("loki", "monitoring", 2, 1, "Loki (Logs)"),
    cn("tempo", "monitoring", 2, 2, "Tempo (Traces)"),
    cn("graf", "monitoring", 3, 0, "Grafana"),
    cn("alert", "monitoring", 4, 0, "Alertmanager"),
  ];
  const edges = [
    ce("e1", "svc", "otel", "metrics + logs + spans", { protocol: "http", async: true }),
    ce("e2", "otel", "prom", "counter/histogram", { protocol: "http" }),
    ce("e3", "otel", "loki", "structured logs", { protocol: "http" }),
    ce("e4", "otel", "tempo", "distributed trace", { protocol: "http" }),
    ce("e5", "prom", "graf", "dashboards", { protocol: "http", bidirectional: true }),
    ce("e6", "prom", "alert", "SLO burn alert", { protocol: "http", async: true }),
  ];
  return buildTutorial(nodes, edges);
}

function buildSloTutorial() {
  const nodes = [
    ...tutorialTitle("slo", "SLOs & Error Budgets", "Reliability target drives release velocity"),
    cn("users", "client", 0, 0, "Users"),
    cn("svc", "app-server", 1, 0, "Service"),
    cn("slis", "monitoring", 2, 0, "SLI Recorder"),
    cn("slo", "monitoring", 3, 0, "SLO: 99.9% / 30d"),
    cn("budget", "monitoring", 4, 0, "Error Budget"),
    cn("rel", "app-server", 5, 0, "Release Gate"),
  ];
  const edges = [
    ce("e1", "users", "svc", "requests", { protocol: "http", bidirectional: true }),
    ce("e2", "svc", "slis", "latency + availability", { protocol: "http", async: true }),
    ce("e3", "slis", "slo", "aggregate SLI", { protocol: "tcp" }),
    ce("e4", "slo", "budget", "remaining budget", { protocol: "tcp", bidirectional: true }),
    ce("e5", "budget", "rel", "block deploy if exhausted", { protocol: "tcp" }),
  ];
  return buildTutorial(nodes, edges);
}

function buildChaosTutorial() {
  const nodes = [
    ...tutorialTitle("chaos", "Chaos Engineering", "Inject failures in production to validate resilience"),
    cn("ctrl", "app-server", 0, 0, "Chaos Controller"),
    cn("mesh", "service-mesh", 1, 0, "Service Mesh"),
    cn("a", "app-server", 2, 0, "Service A"),
    cn("b", "app-server", 2, 1, "Service B"),
    cn("mon", "monitoring", 3, 0, "Observability"),
    cn("run", "app-server", 4, 0, "Experiment Run"),
  ];
  const edges = [
    ce("e1", "ctrl", "run", "start experiment", { protocol: "http", bidirectional: true }),
    ce("e2", "run", "mesh", "inject 500ms latency", { protocol: "tcp" }),
    ce("e3", "mesh", "a", "fault injection", { protocol: "tcp" }),
    ce("e4", "a", "b", "degraded call", { protocol: "http" }),
    ce("e5", "mon", "run", "validate SLO held", { protocol: "http", bidirectional: true }),
  ];
  return buildTutorial(nodes, edges);
}

function buildDeployTutorial() {
  const nodes = [
    ...tutorialTitle("deploy", "Deployment Strategies", "Rolling, blue-green, and canary releases"),
    cn("ci", "app-server", 0, 0, "CI Pipeline"),
    cn("reg", "object-storage", 1, 0, "Container Registry"),
    cn("lb", "load-balancer", 2, 0, "Load Balancer"),
    cn("blue", "app-server", 3, 0, "Blue (v1)"),
    cn("green", "app-server", 3, 1, "Green (v2)"),
    cn("canary", "app-server", 3, 2, "Canary (5%)"),
    cn("mon", "monitoring", 4, 0, "Canary Analysis"),
  ];
  const edges = [
    ce("e1", "ci", "reg", "push image v2", { protocol: "tcp" }),
    ce("e2", "reg", "green", "deploy green", { protocol: "tcp" }),
    ce("e3", "lb", "blue", "95% traffic → blue", { protocol: "http" }),
    ce("e4", "lb", "canary", "5% → canary", { protocol: "http" }),
    ce("e5", "mon", "canary", "compare error rate", { protocol: "http", bidirectional: true }),
    ce("e6", "lb", "green", "promote → 100% green", { protocol: "http", async: true }),
  ];
  return buildTutorial(nodes, edges);
}

function buildCapacityTutorial() {
  const nodes = [
    ...tutorialTitle("cap", "Capacity Planning", "Load test, model growth, auto-scale"),
    cn("users", "client", 0, 0, "Traffic Growth"),
    cn("lb", "load-balancer", 1, 0, "Load Balancer"),
    cn("asg", "app-server", 2, 0, "Auto-Scale Group"),
    cn("mon", "monitoring", 3, 0, "Metrics (CPU/RPS)"),
    cn("policy", "config-service", 4, 0, "Scaling Policy"),
    cn("load", "app-server", 5, 0, "Load Test (k6)"),
  ];
  const edges = [
    ce("e1", "users", "lb", "rising RPS", { protocol: "http", bidirectional: true }),
    ce("e2", "lb", "asg", "distribute load", { protocol: "http", bidirectional: true }),
    ce("e3", "asg", "mon", "emit CPU/RPS", { protocol: "http", async: true }),
    ce("e4", "mon", "policy", "threshold > 70%", { protocol: "tcp" }),
    ce("e5", "policy", "asg", "add 2 replicas", { protocol: "tcp", async: true }),
    ce("e6", "load", "lb", "soak test 2× peak", { protocol: "http", bidirectional: true }),
  ];
  return buildTutorial(nodes, edges);
}

export const OPERATIONS_SIMULATIONS: ConceptSimulationDefinition[] = [
  {
    id: "observability",
    title: "Observability",
    description: "Metrics, logs, and distributed traces",
    topicId: "testing-operations",
    conceptId: "observability",
    build: buildObservabilityTutorial,
    autoPlayMs: AUTO,
    steps: defineSteps([
      { id: "overview", title: "Three pillars", description: "Metrics for aggregates, logs for events, traces for request flow across services." },
      { id: "emit", title: "Instrument the service", description: "OpenTelemetry SDK emits all three signal types to a collector.", edges: ["e1"], nodes: ["svc", "otel"] },
      { id: "route", title: "Collector routes signals", description: "Metrics → Prometheus, logs → Loki, traces → Tempo.", edges: ["e2", "e3", "e4"], nodes: ["otel", "prom", "loki", "tempo"] },
      { id: "alert", title: "Dashboards and alerts", description: "Grafana correlates signals. Alertmanager pages on SLO burn.", edges: ["e5", "e6"], nodes: ["prom", "graf", "alert"] },
    ]),
  },
  {
    id: "slos",
    title: "SLOs & Error Budgets",
    description: "Reliability targets drive engineering decisions",
    topicId: "testing-operations",
    conceptId: "slo-sli",
    build: buildSloTutorial,
    autoPlayMs: AUTO,
    steps: defineSteps([
      { id: "overview", title: "What is an SLO?", description: "99.9% availability over 30 days = 43 minutes downtime budget. SLIs measure reality." },
      { id: "measure", title: "Record SLIs", description: "Every request records latency and success/failure. Aggregated into rolling windows.", edges: ["e1", "e2", "e3"], nodes: ["users", "svc", "slis", "slo"] },
      { id: "budget", title: "Error budget gates releases", description: "Budget exhausted → freeze risky deploys until reliability recovers.", edges: ["e4", "e5"], nodes: ["slo", "budget", "rel"] },
    ]),
  },
  {
    id: "chaos-engineering",
    title: "Chaos Engineering",
    description: "Proactive failure injection in production",
    topicId: "testing-operations",
    conceptId: "chaos-engineering",
    build: buildChaosTutorial,
    autoPlayMs: AUTO,
    steps: defineSteps([
      { id: "overview", title: "Break things on purpose", description: "Controlled experiments validate that your resilience patterns actually work." },
      { id: "inject", title: "Inject fault via mesh", description: "Chaos controller adds 500ms latency to Service A → B calls.", edges: ["e1", "e2", "e3"], nodes: ["ctrl", "run", "mesh", "a"] },
      { id: "observe", title: "Validate system holds SLO", description: "Monitoring confirms circuit breakers fired and users unaffected.", edges: ["e4", "e5"], nodes: ["a", "b", "mon", "run"] },
    ]),
  },
  {
    id: "deployment-strategies",
    title: "Deployment Strategies",
    description: "Canary releases with automated rollback",
    topicId: "testing-operations",
    conceptId: "deployment-strategies",
    build: buildDeployTutorial,
    autoPlayMs: AUTO,
    steps: defineSteps([
      { id: "overview", title: "Safe releases", description: "Never flip 100% traffic at once. Canary validates v2 with real production traffic." },
      { id: "build", title: "Build and deploy v2", description: "CI pushes image. Green environment receives new version alongside blue.", edges: ["e1", "e2"], nodes: ["ci", "reg", "green"] },
      { id: "canary", title: "5% canary traffic", description: "LB sends 5% to canary. Monitor compares error rates vs blue.", edges: ["e3", "e4", "e5"], nodes: ["lb", "blue", "canary", "mon"] },
      { id: "promote", title: "Promote or rollback", description: "Canary healthy → shift 100% to green. Unhealthy → instant rollback to blue.", edges: ["e6"], nodes: ["lb", "green"] },
    ]),
  },
  {
    id: "capacity-planning",
    title: "Capacity Planning",
    description: "Load testing and auto-scaling policies",
    topicId: "testing-operations",
    conceptId: "capacity-planning",
    build: buildCapacityTutorial,
    autoPlayMs: AUTO,
    steps: defineSteps([
      { id: "overview", title: "Plan before you break", description: "Load test to find breaking points. Model growth curves. Automate scaling before users feel pain." },
      { id: "traffic", title: "Traffic rises", description: "RPS grows. Auto-scale group handles load until CPU threshold approached.", edges: ["e1", "e2", "e3"], nodes: ["users", "lb", "asg", "mon"] },
      { id: "scale", title: "Policy adds replicas", description: "CPU > 70% for 2 minutes triggers scale-out. New pods join the pool.", edges: ["e4", "e5"], nodes: ["mon", "policy", "asg"] },
      { id: "loadtest", title: "Validate with load test", description: "k6 soak test at 2× expected peak confirms headroom before launch.", edges: ["e6"], nodes: ["load", "lb"] },
    ]),
  },
];
