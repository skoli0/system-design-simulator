/** Standard architecture roles — labels only; icons come from the component catalog. */
export type ArchRole =
  | "client"
  | "api-gateway"
  | "service"
  | "database"
  | "cache"
  | "queue"
  | "topic"
  | "auth"
  | "load-balancer"
  | "websocket"
  | "notification"
  | "stream"
  | "search"
  | "mesh"
  | "registry";

export interface ArchRoleMeta {
  role: ArchRole;
  label: string;
}

export const ARCH_ROLE_META: Record<ArchRole, ArchRoleMeta> = {
  client: { role: "client", label: "Client" },
  "api-gateway": { role: "api-gateway", label: "API Gateway" },
  service: { role: "service", label: "Service" },
  database: { role: "database", label: "Database" },
  cache: { role: "cache", label: "Cache" },
  queue: { role: "queue", label: "Message Queue" },
  topic: { role: "topic", label: "Pub/Sub Topic" },
  auth: { role: "auth", label: "Auth Service" },
  "load-balancer": { role: "load-balancer", label: "Load Balancer" },
  websocket: { role: "websocket", label: "WebSocket" },
  notification: { role: "notification", label: "Notifier" },
  stream: { role: "stream", label: "Stream Processor" },
  search: { role: "search", label: "Search Index" },
  mesh: { role: "mesh", label: "Service Mesh" },
  registry: { role: "registry", label: "Schema Registry" },
};

const COMPONENT_ID_ROLE: Record<string, ArchRole> = {
  client: "client",
  "api-gateway": "api-gateway",
  "app-server": "service",
  "sql-db": "database",
  "nosql-db": "database",
  "message-queue": "queue",
  "pub-sub": "topic",
  cache: "cache",
  "auth-service": "auth",
  "load-balancer": "load-balancer",
  "websocket-server": "websocket",
  "notification-service": "notification",
  "stream-processor": "stream",
  search: "search",
  "service-mesh": "mesh",
  "config-service": "registry",
};

const LABEL_PATTERNS: { pattern: RegExp; role: ArchRole }[] = [
  { pattern: /client|mobile|merchant|browser|web app|chat client|service client|rest client|grpc client/i, role: "client" },
  { pattern: /gateway|graphql/i, role: "api-gateway" },
  { pattern: /auth|jwt|validate/i, role: "auth" },
  { pattern: /load balanc/i, role: "load-balancer" },
  { pattern: /websocket|ws cluster/i, role: "websocket" },
  { pattern: /postgres|mysql|orders db|job store|business db|outbox|product store|data store|database|db\b/i, role: "database" },
  { pattern: /cache|dedup|presence|redis/i, role: "cache" },
  { pattern: /topic|kafka|event bus|broker|orders\.events/i, role: "topic" },
  { pattern: /queue|task queue|order queue/i, role: "queue" },
  { pattern: /notif|email|webhook dispatch|notifier/i, role: "notification" },
  { pattern: /webhook|callback/i, role: "client" },
  { pattern: /relay|stream|analytics|warehouse/i, role: "stream" },
  { pattern: /search|index/i, role: "search" },
  { pattern: /mesh/i, role: "mesh" },
  { pattern: /schema|registry|openapi|stub/i, role: "registry" },
  { pattern: /worker|consumer|producer|checkout|payment|inventory|shipping|user service|order service|rpc|service|api\b/i, role: "service" },
];

function roleFromLabel(label: string): ArchRole | undefined {
  for (const { pattern, role } of LABEL_PATTERNS) {
    if (pattern.test(label)) return role;
  }
  return undefined;
}

export function resolveArchRole(componentId: string, label: string): ArchRoleMeta {
  const role =
    COMPONENT_ID_ROLE[componentId] ??
    roleFromLabel(label) ??
    "service";
  return ARCH_ROLE_META[role];
}

/** Standard role label; keep specific instance name as sublabel when useful. */
export function normalizeArchNode(
  componentId: string,
  label: string,
): { displayLabel: string; sublabel?: string } {
  const meta = resolveArchRole(componentId, label);
  const normalized = label.trim();
  const isGeneric =
    normalized.toLowerCase() === meta.label.toLowerCase() ||
    normalized.toLowerCase().includes(meta.label.toLowerCase());

  return {
    displayLabel: meta.label,
    sublabel: isGeneric ? undefined : normalized,
  };
}
