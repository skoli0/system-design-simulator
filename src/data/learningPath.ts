export interface LearningTier {
  name: string;
  description: string;
  problemIds: string[];
}

export const LEARNING_PATH: LearningTier[] = [
  {
    name: "Foundations",
    description: "Master the basic building blocks",
    problemIds: ["url-shortener", "rate-limiter", "parking-lot"],
  },
  {
    name: "Intermediate",
    description: "Combine multiple systems",
    problemIds: [
      "notification-system",
      "typeahead-autocomplete",
      "distributed-cache",
      "instagram",
      "music-streaming",
      "reddit",
      "location-service",
      "tinder",
    ],
  },
  {
    name: "Advanced",
    description: "Complex distributed systems",
    problemIds: [
      "twitter-feed",
      "chat-system",
      "web-crawler",
      "file-storage",
      "ecommerce",
      "airbnb",
      "whatsapp",
      "food-delivery",
      "code-editor",
      "cicd-pipeline",
    ],
  },
  {
    name: "Expert",
    description: "Multi-concern architectures",
    problemIds: [
      "ride-sharing",
      "video-streaming",
      "payment-system",
      "ticket-booking",
      "collaborative-editor",
      "team-messaging",
      "metrics-monitoring",
      "netflix",
      "google-maps",
      "zoom",
      "search-engine",
      "tiktok",
      "message-queue-design",
      "digital-wallet",
      "rag-qa-system",
      "ai-chat-assistant",
    ],
  },
];

export interface ConceptPrerequisite {
  problemId: string;
  concepts: string[];
  prerequisites: string[];
}

export const PROBLEM_CONCEPTS: ConceptPrerequisite[] = [
  {
    problemId: "url-shortener",
    concepts: ["caching", "hashing", "read-heavy-design"],
    prerequisites: [],
  },
  {
    problemId: "rate-limiter",
    concepts: ["rate-limiting", "sliding-window", "token-bucket"],
    prerequisites: [],
  },
  {
    problemId: "parking-lot",
    concepts: ["object-modeling", "state-management", "concurrency"],
    prerequisites: [],
  },
  {
    problemId: "notification-system",
    concepts: ["async-processing", "message-queue", "priority-queue"],
    prerequisites: ["rate-limiting"],
  },
  {
    problemId: "typeahead-autocomplete",
    concepts: ["trie", "prefix-search", "ranking"],
    prerequisites: ["caching", "read-heavy-design"],
  },
  {
    problemId: "distributed-cache",
    concepts: ["consistent-hashing", "cache-eviction", "replication"],
    prerequisites: ["caching", "hashing"],
  },
  {
    problemId: "instagram",
    concepts: ["media-storage", "feed-generation", "cdn"],
    prerequisites: ["caching", "async-processing"],
  },
  {
    problemId: "music-streaming",
    concepts: ["streaming-protocol", "content-delivery", "recommendation"],
    prerequisites: ["caching", "cdn"],
  },
  {
    problemId: "reddit",
    concepts: ["ranking-algorithms", "comment-trees", "vote-counting"],
    prerequisites: ["caching", "ranking", "async-processing"],
  },
  {
    problemId: "location-service",
    concepts: ["geospatial-indexing", "quadtree", "proximity-search"],
    prerequisites: ["caching", "read-heavy-design"],
  },
  {
    problemId: "tinder",
    concepts: ["match-detection", "elo-scoring", "bloom-filter"],
    prerequisites: ["geospatial-indexing", "caching", "async-processing"],
  },
  {
    problemId: "twitter-feed",
    concepts: ["fan-out", "timeline", "hybrid-approach"],
    prerequisites: ["caching", "async-processing", "feed-generation"],
  },
  {
    problemId: "chat-system",
    concepts: ["websocket", "presence", "message-ordering"],
    prerequisites: ["async-processing", "message-queue"],
  },
  {
    problemId: "web-crawler",
    concepts: ["crawling", "url-frontier", "politeness"],
    prerequisites: ["hashing", "async-processing", "rate-limiting"],
  },
  {
    problemId: "file-storage",
    concepts: ["chunking", "deduplication", "metadata-db"],
    prerequisites: ["consistent-hashing", "replication"],
  },
  {
    problemId: "ecommerce",
    concepts: ["inventory-management", "search-indexing", "payment-flow"],
    prerequisites: ["caching", "async-processing", "message-queue"],
  },
  {
    problemId: "airbnb",
    concepts: ["availability-calendar", "reservation-holds", "faceted-search"],
    prerequisites: ["search-indexing", "geospatial-indexing", "concurrency", "caching"],
  },
  {
    problemId: "whatsapp",
    concepts: ["e2e-encryption", "store-and-forward", "delivery-receipts"],
    prerequisites: ["websocket", "message-ordering", "message-queue"],
  },
  {
    problemId: "food-delivery",
    concepts: ["dispatch-matching", "eta-prediction", "order-state-machine", "stream-processing"],
    prerequisites: ["geospatial-indexing", "message-queue", "state-management"],
  },
  {
    problemId: "code-editor",
    concepts: ["sandboxed-execution", "container-isolation", "lsp"],
    prerequisites: ["websocket", "async-processing", "concurrency"],
  },
  {
    problemId: "cicd-pipeline",
    concepts: ["dag-scheduling", "artifact-storage", "deployment-strategies"],
    prerequisites: ["message-queue", "async-processing", "state-management"],
  },
  {
    problemId: "ride-sharing",
    concepts: ["matching-algorithm", "real-time-tracking", "surge-pricing"],
    prerequisites: ["websocket", "geospatial-indexing", "consistent-hashing"],
  },
  {
    problemId: "video-streaming",
    concepts: ["adaptive-bitrate", "transcoding", "edge-caching"],
    prerequisites: ["cdn", "streaming-protocol", "async-processing"],
  },
  {
    problemId: "payment-system",
    concepts: ["idempotency", "saga-pattern", "ledger"],
    prerequisites: ["async-processing", "message-queue", "state-management"],
  },
  {
    problemId: "ticket-booking",
    concepts: ["distributed-locking", "seat-reservation", "optimistic-concurrency"],
    prerequisites: ["concurrency", "caching", "async-processing"],
  },
  {
    problemId: "collaborative-editor",
    concepts: ["crdt", "operational-transform", "conflict-resolution"],
    prerequisites: ["websocket", "message-ordering", "replication"],
  },
  {
    problemId: "team-messaging",
    concepts: ["channel-model", "search", "notification-routing"],
    prerequisites: ["websocket", "message-queue", "async-processing"],
  },
  {
    problemId: "metrics-monitoring",
    concepts: ["time-series-db", "aggregation-pipeline", "alerting"],
    prerequisites: ["stream-processing", "async-processing", "message-queue"],
  },
  {
    problemId: "netflix",
    concepts: ["open-connect-cdn", "abr-ladder", "precomputed-recommendations"],
    prerequisites: ["cdn", "adaptive-bitrate", "edge-caching", "recommendation"],
  },
  {
    problemId: "google-maps",
    concepts: ["tile-pyramid", "shortest-path-routing", "traffic-ingestion"],
    prerequisites: ["geospatial-indexing", "cdn", "stream-processing", "caching"],
  },
  {
    problemId: "zoom",
    concepts: ["webrtc", "sfu-architecture", "simulcast"],
    prerequisites: ["websocket", "streaming-protocol", "async-processing"],
  },
  {
    problemId: "search-engine",
    concepts: ["inverted-index", "pagerank", "scatter-gather"],
    prerequisites: ["crawling", "url-frontier", "ranking", "search-indexing"],
  },
  {
    problemId: "tiktok",
    concepts: ["two-tower-model", "candidate-generation", "cold-start"],
    prerequisites: ["recommendation", "feed-generation", "stream-processing", "cdn"],
  },
  {
    problemId: "message-queue-design",
    concepts: ["partitioned-log", "consumer-groups", "isr-replication"],
    prerequisites: ["message-queue", "replication", "consistent-hashing"],
  },
  {
    problemId: "digital-wallet",
    concepts: ["double-entry-ledger", "exactly-once-execution", "reconciliation"],
    prerequisites: ["idempotency", "saga-pattern", "ledger", "distributed-locking"],
  },
  {
    problemId: "rag-qa-system",
    concepts: ["vector-search", "chunking", "hybrid-retrieval", "grounded-generation"],
    prerequisites: ["caching", "message-queue", "async-processing", "search-indexing"],
  },
  {
    problemId: "ai-chat-assistant",
    concepts: ["streaming-inference", "context-window", "model-routing", "token-budgets"],
    prerequisites: ["websocket", "caching", "rate-limiting", "message-queue"],
  },
];
