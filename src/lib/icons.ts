import type { ComponentType } from "react";
import {
  // Networking & edge
  Globe,
  Cloud,
  Scale,
  Waypoints,
  Gauge,
  ArrowLeftRight,
  Layers,
  // Compute
  Server,
  LockKeyhole,
  Link2,
  CalendarClock,
  Workflow,
  Bell,
  Bot,
  Binary,
  // Storage
  Database,
  LayoutGrid,
  MemoryStick,
  Package,
  FileSearch,
  Network,
  LineChart,
  Warehouse,
  FolderOpen,
  Orbit,
  Map,
  // Messaging
  Inbox,
  Rss,
  // Infrastructure
  Activity,
  Radar,
  Lock,
  CircleOff,
  Crown,
  Hash,
  Flag,
  // General / custom
  Box,
  Puzzle,
  Search,
  Settings,
  Shield,
  Zap,
  MessageSquare,
  Radio,
  Clock,
  Share2,
  TrendingUp,
  Compass,
  ShieldCheck,
  ShieldOff,
  Users,
  Fingerprint,
  Megaphone,
  Brain,
  MapPin,
  Sparkles,
  Router,
  Archive,
  HardDrive,
  GitBranch,
  FolderTree,
  Cpu,
  Container,
  Webhook,
  Mail,
  RefreshCw,
  Unplug,
  BarChart3,
  GitMerge,
  Tags,
} from "lucide-react";

type IconComponent = ComponentType<{ className?: string }>;

/**
 * Standard system-design icon set — aligned with common interview
 * diagram conventions (AWS/GCP-style semantics, Lucide visuals).
 */
export const SYSTEM_DESIGN_ICONS = {
  networking: {
    Globe, // DNS
    Cloud, // CDN / edge
    Scale, // Load balancer
    Waypoints, // API gateway / routing hub
    Gauge, // Rate limiter / throttle
    ArrowLeftRight, // Reverse proxy
    Layers, // Origin shield / cache tier
    Router, // Generic router
    Shield, // WAF / edge security
    Users, // End users / clients
  },
  compute: {
    Server, // App / microservice
    LockKeyhole, // Auth / IAM
    Link2, // WebSocket / persistent connection
    CalendarClock, // Cron / task scheduler
    Workflow, // Stream processor / pipeline
    Bell, // Notifications
    Bot, // LLM / AI inference gateway
    Binary, // Embeddings / vector encoding
    Cpu, // Generic compute
    Container, // Container / K8s pod
    Webhook, // Webhook handler
    Radio, // Real-time broadcast
    Clock, // Timer / delay queue
  },
  storage: {
    Database, // SQL / relational
    LayoutGrid, // NoSQL / partitioned store
    MemoryStick, // Cache / Redis
    Package, // Object storage / S3
    FileSearch, // Search index / Elasticsearch
    Network, // Graph database
    LineChart, // Time-series DB
    Warehouse, // Data warehouse / OLAP
    FolderOpen, // POSIX file store
    FolderTree, // Hierarchical storage
    Orbit, // Vector DB / embedding index
    Map, // Geospatial index
    Archive, // Cold / archival storage
    HardDrive, // Block storage
  },
  messaging: {
    Inbox, // Message queue / FIFO
    Rss, // Pub/sub fan-out
    MessageSquare, // Point-to-point messaging
    Mail, // Email queue
    RefreshCw, // Event replay / CDC
  },
  infrastructure: {
    Activity, // Monitoring / observability
    BarChart3, // Metrics / dashboards
    Radar, // Service discovery
    Lock, // Distributed lock
    CircleOff, // Circuit breaker (open)
    Crown, // Coordination / leader election
    Hash, // ID generator / sharded counter
    Flag, // Config / feature flags
    Settings, // Runtime configuration
    Compass, // Service registry
    Users, // Cluster membership
    GitMerge, // Consensus / replication
    Unplug, // Failover / disconnect
    Tags, // Metadata / labels
  },
  general: {
    Box, // Custom component
    Puzzle, // Plugin / extension
    Search, // Generic lookup
    Zap, // Fast path / cache hit
    Share2, // Fan-out
    TrendingUp, // Analytics
    Sparkles, // AI / ML feature
    Brain, // ML model
    Fingerprint, // Unique ID
    Megaphone, // Broadcast
    MapPin, // Location pin
    ShieldCheck, // Verified / secure
    ShieldOff, // Degraded / bypass
    GitBranch, // Branching / mesh
  },
} as const satisfies Record<string, Record<string, IconComponent>>;

/** Flat lookup used by canvas nodes and the component palette. */
export const ICON_MAP: Record<string, IconComponent> = {
  ...SYSTEM_DESIGN_ICONS.networking,
  ...SYSTEM_DESIGN_ICONS.compute,
  ...SYSTEM_DESIGN_ICONS.storage,
  ...SYSTEM_DESIGN_ICONS.messaging,
  ...SYSTEM_DESIGN_ICONS.infrastructure,
  ...SYSTEM_DESIGN_ICONS.general,
};

/** Curated picker list for custom components (deduped, interview-relevant). */
export const ICON_PICKER_OPTIONS: string[] = [
  // Networking
  "Globe",
  "Cloud",
  "Scale",
  "Waypoints",
  "Gauge",
  "ArrowLeftRight",
  "Layers",
  "Shield",
  // Compute
  "Server",
  "LockKeyhole",
  "Link2",
  "CalendarClock",
  "Workflow",
  "Bell",
  "Bot",
  "Binary",
  "Cpu",
  "Container",
  "Webhook",
  // Storage
  "Database",
  "LayoutGrid",
  "MemoryStick",
  "Package",
  "FileSearch",
  "Network",
  "LineChart",
  "Warehouse",
  "FolderOpen",
  "Orbit",
  "Map",
  // Messaging
  "Inbox",
  "Rss",
  "MessageSquare",
  "Mail",
  // Infrastructure
  "Activity",
  "BarChart3",
  "Radar",
  "Lock",
  "CircleOff",
  "Crown",
  "Hash",
  "Flag",
  "GitMerge",
  // General
  "Box",
  "Puzzle",
  "Search",
  "Zap",
  "Sparkles",
  "Brain",
];

/** Default icon per built-in component id. */
export const COMPONENT_ICON_DEFAULTS: Record<string, string> = {
  client: "Users",
  dns: "Globe",
  cdn: "Cloud",
  "load-balancer": "Scale",
  "api-gateway": "Waypoints",
  "rate-limiter": "Gauge",
  "reverse-proxy": "ArrowLeftRight",
  "origin-shield": "Layers",
  "app-server": "Server",
  "auth-service": "LockKeyhole",
  "websocket-server": "Link2",
  "task-scheduler": "CalendarClock",
  "stream-processor": "Workflow",
  "notification-service": "Bell",
  "llm-gateway": "Bot",
  "embedding-service": "Binary",
  "sql-db": "Database",
  "nosql-db": "LayoutGrid",
  cache: "MemoryStick",
  "object-storage": "Package",
  search: "FileSearch",
  "graph-db": "Network",
  "timeseries-db": "LineChart",
  "data-warehouse": "Warehouse",
  "file-store": "FolderOpen",
  "vector-db": "Orbit",
  "geospatial-index": "Map",
  "message-queue": "Inbox",
  "pub-sub": "Rss",
  "service-mesh": "GitMerge",
  monitoring: "Activity",
  "service-discovery": "Radar",
  "distributed-lock": "Lock",
  "circuit-breaker": "CircleOff",
  "coordination-service": "Crown",
  "id-generator": "Hash",
  "sharded-counter": "Hash",
  "config-service": "Flag",
  custom: "Box",
};

export function getIconComponent(name: string): IconComponent | undefined {
  return ICON_MAP[name];
}
