<div align="center">

<a href="https://github.com/vijaygupta18/system-design-simulator">
  <img src="public/banner.svg" alt="SystemSim" width="900"/>
</a>

<br/><br/>

[![Next.js](https://img.shields.io/badge/Next.js_16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![ReactFlow](https://img.shields.io/badge/ReactFlow_v12-FF0072?style=for-the-badge)](https://reactflow.dev)

**The open-source system design interview simulator.**<br/>
**Build architectures. Simulate traffic. Get scored. Pass interviews.**

[Getting Started](#quick-start) &nbsp;&middot;&nbsp; [Features](#features) &nbsp;&middot;&nbsp; [37 Problems](#37-design-problems) &nbsp;&middot;&nbsp; [Contributing](#contributing)

</div>

---

## Why SystemSim?

Most system design prep is passive — reading articles, watching videos. SystemSim is **active practice**. You drag real infrastructure components onto a canvas, wire them together, simulate production-scale traffic, and get scored the way an interviewer would evaluate you.

It's the flight simulator for system design interviews.

---

## Features

<div align="center">
  <img src="public/features.svg" alt="Features overview" width="800"/>
</div>

<br/>

<table>
<tr>
<td width="50%">

### 38 Infrastructure Components

Every building block you need for any system design:

**Networking** — DNS, CDN, Load Balancer, API Gateway, Rate Limiter, Reverse Proxy, Origin Shield

**Compute** — App Server, Auth Service, WebSocket Server, Task Scheduler, Stream Processor, Notification Service, LLM Gateway, Embedding Service

**Storage** — SQL DB, NoSQL DB, Cache/Redis, Object Storage, Search/ES, Graph DB, Time-Series DB, Data Warehouse, File Store, Vector DB, Geospatial Index

**Infrastructure** — Message Queue, Pub/Sub, Service Mesh, Monitoring, Service Discovery, Distributed Lock, Circuit Breaker, Coordination Service, ID Generator, Sharded Counter, Config Service

**Special** — Custom Component (double-click to rename to anything)

</td>
<td width="50%">

### Realistic Specs

Every component has **verified benchmarks**:

| Component | Max QPS | Latency |
|-----------|---------|---------|
| Load Balancer | 1,000,000 | 1ms |
| Cache/Redis | 100,000 | 1ms |
| SQL Database | 10,000 | 8ms |
| NoSQL (DynamoDB) | 50,000 | 3ms |
| Kafka | 100,000 | 5ms |
| Elasticsearch | 20,000 | 10ms |
| Object Storage (S3) | 25,000 | 75ms |
| CDN | 500,000 | 15ms |
| Vector DB | 10,000 | 10ms |
| LLM Gateway | 5,000 | 2000ms |
| Embedding Service | 20,000 | 50ms |

All values cross-checked against official docs and benchmarks.

</td>
</tr>
</table>

---

### Traffic Simulation

<div align="center">
  <img src="public/traffic-sim.svg" alt="Animated traffic simulation" width="800"/>
</div>

<br/>

- **Kahn's topological sort** for correct fan-in QPS accumulation
- **Smart traffic splitting** — Load balancers split evenly; other components fan-out 100% to each child
- **Per-node metrics** — QPS, utilization %, latency, status (healthy / warning / critical)
- **Delivered-throughput accounting** — reported throughput is capped at offered load and collapses through saturated nodes (no phantom over-capacity numbers)
- **Disconnected-node aware** — stray nodes never steal traffic from the real request path
- **Async-edge aware** — connections marked async are excluded from user-facing latency
- **Bottleneck detection** with cascading failure visualization
- **Cycle detection** that separates true cycle members from nodes merely downstream of a cycle
- **Configurable load** — 1K to 500K requests/sec

### Connectivity-aware scoring

Scoring evaluates the **wired request path**, not a parts bin — a canvas of disconnected components scores "Needs Work", and every check tells you when a component is placed but not connected. Each of the 5 categories is capped at exactly 20 points.

---

### 5-Category Scoring

<div align="center">
  <img src="public/scoring.svg" alt="Animated scoring engine" width="800"/>
</div>

<br/>

Scored like a real interview — across the 5 dimensions interviewers evaluate:

| Category | What it checks |
|----------|---------------|
| **Scalability** | Load balancing, horizontal scaling, caching, async processing |
| **Availability** | No SPOFs, replica redundancy, monitoring, overload protection |
| **Latency** | CDN usage, cache-before-DB patterns, minimal hop count |
| **Cost Efficiency** | Right-sized components, polyglot persistence, no waste |
| **Trade-offs** | Read/write separation, defense in depth, architecture breadth |

Verdicts: **Needs Work** < 31 | **Decent** < 51 | **Good** < 71 | **Excellent** < 86 | **Architect Level** 86+

---

### Interview Practice Mode

<div align="center">
  <img src="public/interview-flow.svg" alt="6-phase interview flow" width="800"/>
</div>

<br/>

Practice like a real 45-minute interview:

1. **Requirements** (5 min) — Clarify functional and non-functional requirements
2. **Estimation** (5 min) — Back-of-envelope calculations
3. **API Design** (5 min) — Define core REST endpoints
4. **Data Model** (5 min) — Design entities and relationships
5. **High-Level Design** (15 min) — Build the architecture on canvas
6. **Deep Dive** (10 min) — Discuss trade-offs and failure modes

Color-coded timer: green (on track) | yellow (over target) | red (significantly over)

---

### Edge Labels & Protocol Types

Label every connection with its protocol and communication style:

| Protocol | Style | Example |
|----------|-------|---------|
| HTTP | Solid line | App Server -> Database |
| gRPC | Solid + purple badge | Service -> Service |
| WebSocket | Solid + green badge | Client -> WS Server |
| pub/sub | Dashed + amber badge | Queue -> Consumer |
| TCP | Solid + zinc badge | Cache -> App Server |

Click any edge to set protocol, sync/async mode, and a custom label.

---

### Concept Library

Educational content for **every** infrastructure component. Select any component to learn:

- **When to use** — concrete scenarios where this component shines
- **When NOT to use** — common mistakes to avoid
- **Key trade-offs** — engineering considerations
- **Interview tips** — what to say to impress interviewers
- **Common patterns** — Cache-aside, Write-through, etc.
- **Real-world examples** — verified facts from Netflix, Twitter, Uber, etc.

---

### Trade-off Decision Log

23 pre-built trade-off cards with side-by-side comparisons:

SQL vs NoSQL | Push vs Pull | Sync vs Async | Strong vs Eventual Consistency | Monolith vs Microservices | REST vs gRPC | Cache-aside vs Write-through | Vertical vs Horizontal Scaling | Polling vs WebSocket | Single vs Multi-leader | Hash vs Range Partitioning | CDN Push vs Pull | Token Bucket vs Sliding Window | At-least-once vs Exactly-once Processing | Optimistic vs Pessimistic Locking | Long-polling vs SSE vs WebSocket | Kafka vs RabbitMQ | JWT vs Session Tokens | Normalization vs Denormalization | Batch vs Stream Processing | Active-active vs Active-passive | RAG vs Fine-Tuning | Vector Search vs Keyword Search

Log your own decisions with rationale during practice.

---

### Learning Path

Structured progression from beginner to expert:

| Tier | Problems | Focus |
|------|----------|-------|
| **Foundations** | URL Shortener, Rate Limiter, Parking Lot | Core building blocks |
| **Intermediate** | Notification System, Autocomplete, Instagram, Spotify, Distributed Cache | Combining systems |
| **Advanced** | Twitter, Chat, Web Crawler, Dropbox, E-Commerce | Complex distributed systems |
| **Expert** | Uber, YouTube, Payment, Ticketmaster, Google Docs, Slack, Monitoring, Netflix, Zoom, Google Maps, WhatsApp, TikTok, Kafka, RAG Q&A, AI Chat Assistant, etc. | Multi-concern architectures |

Track completion with checkboxes. Concept prerequisites shown per problem.

---

## 37 Design Problems

<details>
<summary><strong>Click to see all 37 problems</strong></summary>

| # | Problem | Difficulty | Key Concepts |
|---|---------|-----------|-------------|
| 1 | URL Shortener | Easy | Hashing, caching, 100:1 read/write |
| 2 | Rate Limiter | Easy | Token bucket, sliding window, Redis |
| 3 | Parking Lot | Easy | IoT events, availability tracking |
| 4 | Twitter / News Feed | Hard | Fan-out, timeline, hybrid approach |
| 5 | Chat System | Hard | WebSocket, presence, message ordering |
| 6 | Uber / Ride Sharing | Hard | Geohash, location streaming, matching |
| 7 | YouTube / Video Streaming | Hard | CDN, transcoding, tiered storage |
| 8 | Notification System | Medium | Priority queues, multi-channel delivery |
| 9 | Typeahead / Autocomplete | Medium | Trie, prefix search, offline aggregation |
| 10 | Web Crawler | Medium | URL frontier, politeness, dedup |
| 11 | Distributed Cache | Medium | Consistent hashing, eviction, hot keys |
| 12 | Payment System | Hard | Idempotency, saga pattern, double-entry ledger |
| 13 | Ticket Booking | Hard | Virtual queue, seat locking, flash sales |
| 14 | Google Docs | Hard | OT/CRDT, WebSocket, version history |
| 15 | Dropbox / File Storage | Hard | Block chunking, delta sync, dedup |
| 16 | Instagram | Medium | Media pipeline, feed gen, CDN strategy |
| 17 | Spotify | Medium | Adaptive bitrate, pre-fetch, collab filtering |
| 18 | Amazon / E-Commerce | Hard | Microservices, inventory, event sourcing |
| 19 | Slack / Team Messaging | Hard | Channel model, search, connection gateway |
| 20 | Metrics / Monitoring | Hard | Time-series ingestion, downsampling, alerting |
| 21 | Netflix | Hard | Recommendation engine, adaptive streaming, DRM |
| 22 | Tinder / Dating App | Medium | Geospatial matching, ELO scoring, Bloom filters |
| 23 | Google Maps | Hard | Map tiles, Dijkstra/A*, real-time traffic |
| 24 | Zoom | Hard | WebRTC/SFU, simulcast, screen sharing |
| 25 | DoorDash / Food Delivery | Hard | Driver dispatch, ETA prediction, order tracking |
| 26 | Reddit | Medium | Ranking algorithms, comment trees, moderation |
| 27 | Airbnb | Hard | Search + booking, pricing, bilateral reviews |
| 28 | WhatsApp | Hard | E2E encryption (Signal Protocol), offline delivery |
| 29 | Google Search | Hard | Inverted index, PageRank, query parsing |
| 30 | Yelp / Location Service | Medium | QuadTree/Geohash, proximity search, reviews |
| 31 | TikTok | Hard | Recommendation (two-tower), video transcoding |
| 32 | Distributed Message Queue | Hard | Partitioning, consumer groups, exactly-once |
| 33 | Digital Wallet / UPI | Hard | P2P transfers, idempotency, compliance |
| 34 | Online Code Editor | Medium | Sandboxed execution, LSP, real-time collab |
| 35 | CI/CD Pipeline | Medium | Build DAGs, artifact storage, canary deploys |
| 36 | RAG Q&A System | Hard | Vector search, chunking, hybrid retrieval, LLM grounding |
| 37 | AI Chat Assistant | Hard | Streaming inference, context windows, model routing, token budgets |

</details>

Each problem includes requirements (QPS, storage, latency), constraints, progressive hints, tags, and a reference architecture.

---

### Mobile & Tablet

Fully usable on touch devices:

- **Tap-to-add** components (HTML5 drag-and-drop doesn't work on touch — tap the `+` or the row instead)
- Left **library drawer** and right **bottom sheet** for panels; canvas stays full-bleed
- Enlarged connection handles and a `connectionRadius` for finger-friendly wiring
- **Remove Connection** button so edges are deletable without a keyboard
- Two-row interview bar with controls always on-screen
- Tap-to-edit text notes and rename custom components; pinch-zoom enabled
- Safe-area insets respected; no horizontal overflow at 375px / 768px / 1024px+

## Quick Start

```bash
git clone https://github.com/vijaygupta18/system-design-simulator.git
cd system-design-simulator
npm install
npm run dev
```

Open **http://localhost:3000**

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Run simulation |
| `Ctrl+Shift+S` | Score design |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |
| `Ctrl+S` | Save design |
| `Ctrl+O` | Load design |
| `Ctrl+E` | Export as PNG |
| `Delete` | Remove selected node or edge |
| `Escape` | Deselect |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + TypeScript |
| Canvas | @xyflow/react (ReactFlow v12) |
| State | Zustand v5 (persisted to localStorage) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Animation | Framer Motion |
| Icons | Lucide React |
| Export | html-to-image |

## Project Structure

```
src/
├── app/                    # Next.js app router
├── components/
│   ├── canvas/             # ReactFlow canvas, nodes (Component + Text), edges
│   ├── dialogs/            # Save/Load dialogs
│   ├── interview/          # Interview mode (bar, phases, guides)
│   ├── layout/             # AppShell, TopBar
│   ├── panel/              # Right panel (props, sim, score, capacity, trade-offs)
│   ├── sidebar/            # Left sidebar (components, problems, learning path)
│   └── ui/                 # shadcn/ui primitives
├── data/
│   ├── components.ts       # 38 system components with verified specs
│   ├── problems.ts         # 37 design problems with reference architectures
│   ├── conceptLibrary.ts   # Educational content for all 38 components
│   ├── interviewData.ts    # Requirements, APIs, data models for all 37 problems
│   ├── tradeoffCards.ts    # 23 pre-built trade-off comparisons
│   └── learningPath.ts     # 4-tier progression with prerequisites
├── engine/
│   └── simulator.ts        # Traffic simulation (Kahn's topological sort)
├── scoring/
│   ├── scorer.ts           # Main scoring orchestrator
│   └── rules/              # 5 scoring rule modules (20 pts each)
├── store/
│   ├── appStore.ts         # UI state (persisted)
│   ├── canvasStore.ts      # Nodes & edges (persisted to localStorage)
│   ├── simulationStore.ts  # Simulation config & results
│   ├── savedDesignsStore.ts# Named design saves
│   ├── interviewStore.ts   # Interview mode & timer
│   └── tradeoffStore.ts    # Trade-off decision log
└── types/                  # TypeScript interfaces
```

---

## ☕ Support

If SystemSim helped you prep for a system design interview, a chai goes a long way to keep it alive and open-source. No pressure — no ads, no paywalls.

[![Buy me a coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-UPI-06B6D4?style=for-the-badge&logo=buymeacoffee&logoColor=white)](#-buy-me-a-coffee)

<h3 id="-buy-me-a-coffee">Buy me a coffee</h3>

<details>
<summary><b>Click to reveal the UPI QR</b></summary>

<br/>

<p align="center">
  <img src="public/support-upi-qr.jpg" alt="UPI QR code — vijaygupta1818@ptyes" width="280"/>
</p>

<p align="center">
  Scan with any UPI app — Paytm · PhonePe · GPay · BHIM<br/>
  UPI ID: <code>vijaygupta1818@ptyes</code>
</p>

</details>

> Prefer the in-app flow? Open the deployed site with <code>?support=1</code> and the support popup opens automatically.

---

## Contributing

Contributions welcome. Please open an issue first to discuss.

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run lint      # Run ESLint
```

## License

[MIT](LICENSE)

---

<div align="center">

Built by [@vijaygupta18](https://github.com/vijaygupta18)

**Star this repo if it helps your interview prep.**

</div>
