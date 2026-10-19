# Architecture.md — Automyc-Clone System Architecture

## 1. High-Level Overview

The platform is an **all-in-one marketing automation SaaS** built as a modular monolith with clear service boundaries, designed to evolve into microservices when scale demands.

```mermaid
flowchart TD
    subgraph "Client Layer"
        WEB["Next.js Web App<br/>(SSR + CSR)"]
        PWA["PWA / Mobile"]
        EXT["API Consumers<br/>(Platform API)"]
    end

    subgraph "Edge / CDN"
        CF["CloudFlare / Vercel Edge"]
    end

    subgraph "Application Layer"
        GW["API Gateway<br/>(Rate Limit, Auth, Routing)"]
        
        subgraph "Core Services"
            AUTH["Auth Service"]
            SOCIAL["Social Engine"]
            EMAIL["Email Engine"]
            INBOX["Inbox Aggregator"]
            AI["AI Service"]
            MEDIA["Media Pipeline"]
            WB["Website Builder"]
            FINDER["Lead Finder"]
            CAMP["Campaign Engine"]
            AUTO["Automation Engine"]
            ANALYTICS["Analytics Service"]
            BILLING["Billing Service"]
        end
    end

    subgraph "Data Layer"
        PG["PostgreSQL<br/>(Primary Store)"]
        REDIS["Redis<br/>(Cache, Queue, PubSub)"]
        S3["S3 / R2<br/>(Media Storage)"]
        SEARCH["Meilisearch<br/>(Full-text)"]
    end

    subgraph "External APIs"
        META["Meta Graph API<br/>(IG + FB)"]
        TIKTOK["TikTok API"]
        YT["YouTube Data API"]
        GMAIL["Gmail API"]
        WA["WhatsApp Cloud API"]
        OPENAI["OpenAI / Claude"]
        STRIPE["Stripe"]
        MAPS["Google Maps API"]
    end

    WEB & PWA & EXT --> CF --> GW
    GW --> AUTH & SOCIAL & EMAIL & INBOX & AI & MEDIA & WB & FINDER & CAMP & AUTO & ANALYTICS & BILLING
    AUTH & SOCIAL & EMAIL & INBOX & CAMP --> PG
    AUTH & SOCIAL & EMAIL --> REDIS
    MEDIA --> S3
    INBOX --> SEARCH
    SOCIAL --> META & TIKTOK & YT
    EMAIL --> GMAIL
    INBOX --> WA
    AI --> OPENAI
    BILLING --> STRIPE
    FINDER --> MAPS
```

---

## 2. Monorepo Structure

```
automyc/
├── apps/
│   ├── web/                    # Next.js 15 App Router (frontend + BFF)
│   │   ├── app/
│   │   │   ├── (public)/       # Marketing pages (/, /pricing, /features/*)
│   │   │   ├── (auth)/         # /login, /register
│   │   │   └── (dashboard)/    # Authenticated app (/workspace/*)
│   │   ├── components/
│   │   │   ├── landing/        # Landing page components
│   │   │   ├── dashboard/      # Dashboard components
│   │   │   └── ui/             # Shared UI primitives (shadcn/ui)
│   │   └── lib/
│   │       ├── api-client.ts   # Typed API client
│   │       └── hooks/          # React hooks
│   │
│   └── api/                    # Backend API server (Fastify)
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── social/
│       │   │   ├── email/
│       │   │   ├── inbox/
│       │   │   ├── ai/
│       │   │   ├── media/
│       │   │   ├── website/
│       │   │   ├── finder/
│       │   │   ├── campaigns/
│       │   │   ├── automations/
│       │   │   ├── analytics/
│       │   │   └── billing/
│       │   ├── middleware/
│       │   ├── queue/          # BullMQ workers
│       │   └── webhooks/       # Platform webhook handlers
│       └── prisma/
│           └── schema.prisma
│
├── packages/
│   ├── shared/                 # Shared types, constants, validators
│   ├── db/                     # Prisma client + migrations
│   ├── queue/                  # BullMQ job definitions
│   ├── ai/                     # AI prompt templates + client
│   └── integrations/           # OAuth + API clients per platform
│       ├── meta/
│       ├── tiktok/
│       ├── youtube/
│       ├── gmail/
│       ├── whatsapp/
│       └── stripe/
│
├── infrastructure/
│   ├── docker-compose.yml
│   ├── Dockerfile.api
│   └── k8s/                    # Kubernetes manifests (later)
│
├── turbo.json
├── package.json
└── .env.example
```

---

## 3. Frontend Architecture

### Next.js App Router Layout

```mermaid
flowchart TD
    ROOT["RootLayout<br/>(theme, fonts, analytics)"]
    
    ROOT --> PUB["(public) Layout<br/>(LandingNavbar + Footer)"]
    ROOT --> AUTHL["(auth) Layout<br/>(minimal, centered)"]
    ROOT --> DASH["(dashboard) Layout<br/>(Sidebar + TopBar + Auth Guard)"]
    
    PUB --> HOME["/ (Landing)"]
    PUB --> PRICING["/pricing"]
    PUB --> FEATURES["/features/[slug]"]
    PUB --> BLOG["/blog/[slug]"]
    PUB --> API_DOCS["/developers/api"]
    
    AUTHL --> LOGIN["/login"]
    AUTHL --> REG["/register"]
    
    DASH --> WS["/workspace/[id]"]
    WS --> CALENDAR["/calendar"]
    WS --> INB["/inbox"]
    WS --> CAMP_D["/campaigns"]
    WS --> GRAPHICS["/studio/graphics"]
    WS --> VIDEO["/studio/video"]
    WS --> WEBSITE["/website"]
    WS --> FIND["/finder"]
    WS --> AUTOS["/automations"]
    WS --> ANALY["/analytics"]
    WS --> SETTINGS["/settings"]
```

### Theming System

```css
/* CSS custom properties on :root / [data-mk-theme] */
--mk-bg          /* Page background */
--mk-bg-alt      /* Alternate section background */
--mk-surface     /* Card / panel background */
--mk-surface-2   /* Nested surface */
--mk-text        /* Primary text */
--mk-text-muted  /* Secondary text */
--mk-text-subtle /* Tertiary text */
--mk-border      /* Borders */
--mk-brand       /* Primary brand color (emerald-500) */
--mk-brand-text  /* Brand text */
```

Theme toggle persists to `localStorage('mk-theme')` and applies `dark` class to `<html>` via an inline IIFE script (prevents FOUC).

---

## 4. Backend Service Architecture

### Module Responsibility Map

| Service | Responsibility | Key Dependencies |
|---|---|---|
| **Auth** | Registration, login, OAuth flows, API key management, session handling | PostgreSQL, Redis (sessions) |
| **Social** | Post CRUD, scheduling, publishing to platforms, comment sync | Meta API, TikTok API, YouTube API, BullMQ |
| **Email** | Email sending, thread management, push notification handling | Gmail API, BullMQ |
| **Inbox** | Unified thread aggregation, labeling, assignment, search | PostgreSQL, Meilisearch, Redis PubSub |
| **AI** | Content generation, reply drafting, brand knowledge context | OpenAI/Claude API, credit metering |
| **Media** | Upload, resize, transcode, CDN URL generation | S3/R2, Sharp, FFmpeg |
| **Website** | Page CRUD, block-based editing, publishing, domain management | PostgreSQL, S3 (static hosting) |
| **Finder** | Lead search, business enrichment, dataset building | Google Maps API, web scraping |
| **Campaigns** | Email sequence orchestration, recipient management, tracking | BullMQ, Gmail API |
| **Automations** | Rule engine for comment-to-DM, follow-to-DM, auto-reply | Redis (event bus), BullMQ |
| **Analytics** | Metric aggregation, platform data sync, dashboard queries | PostgreSQL (materialized views) |
| **Billing** | Subscription management, plan enforcement, credit wallet | Stripe API |

### Request Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant GW as API Gateway
    participant AUTH as Auth Middleware
    participant SVC as Service Module
    participant DB as PostgreSQL
    participant Q as BullMQ
    participant EXT as External API

    C->>GW: POST /api/v1/social/posts
    GW->>AUTH: Validate Bearer Token
    AUTH->>DB: Lookup API key + workspace
    AUTH-->>GW: Workspace context
    GW->>SVC: Route to Social.createPost()
    SVC->>DB: Insert post record (status: SCHEDULED)
    SVC->>Q: Enqueue publishJob(postId, scheduledAt)
    SVC-->>C: 201 Created {id, status: "scheduled"}
    
    Note over Q: At scheduled time...
    Q->>SVC: Process publishJob
    SVC->>EXT: Publish to Instagram/TikTok/YouTube/FB
    EXT-->>SVC: Success + platform post ID
    SVC->>DB: Update post (status: PUBLISHED, platformIds)
```

---

## 5. Queue Architecture

```mermaid
flowchart LR
    subgraph "BullMQ Queues"
        Q1["social:publish<br/>(delayed jobs)"]
        Q2["email:send<br/>(rate-limited)"]
        Q3["email:sequence<br/>(campaign steps)"]
        Q4["webhook:process<br/>(incoming events)"]
        Q5["ai:generate<br/>(content + replies)"]
        Q6["media:process<br/>(resize, transcode)"]
        Q7["finder:scan<br/>(lead discovery)"]
        Q8["automation:trigger<br/>(rule execution)"]
        Q9["analytics:sync<br/>(platform metrics)"]
    end

    subgraph "Workers"
        W1["Social Worker<br/>(concurrency: 5)"]
        W2["Email Worker<br/>(concurrency: 3)"]
        W3["Webhook Worker<br/>(concurrency: 10)"]
        W4["AI Worker<br/>(concurrency: 5)"]
        W5["Media Worker<br/>(concurrency: 3)"]
    end

    Q1 --> W1
    Q2 & Q3 --> W2
    Q4 --> W3
    Q5 --> W4
    Q6 --> W5
```

---

## 6. External Integration Architecture

### OAuth Flow (All Platforms)

```mermaid
sequenceDiagram
    participant U as User
    participant APP as Automyc
    participant P as Platform (Meta/Google/TikTok)

    U->>APP: Click "Connect Instagram"
    APP->>P: Redirect to OAuth consent screen
    P->>U: Show permission dialog
    U->>P: Approve
    P->>APP: Redirect with auth code
    APP->>P: Exchange code for access + refresh tokens
    APP->>APP: Encrypt & store tokens in DB
    APP-->>U: "Instagram connected ✓"
```

### Webhook Ingestion

```mermaid
flowchart LR
    META_WH["Meta Webhooks<br/>(comments, DMs)"] --> WH_HANDLER
    WA_WH["WhatsApp Webhooks<br/>(messages)"] --> WH_HANDLER
    GMAIL_WH["Gmail Push<br/>(Pub/Sub)"] --> WH_HANDLER
    
    WH_HANDLER["Webhook Handler<br/>(verify signature)"] --> Q["webhook:process queue"]
    Q --> NORMALIZE["Normalize to Thread/Message"]
    NORMALIZE --> DB["PostgreSQL"]
    NORMALIZE --> SEARCH["Meilisearch Index"]
    NORMALIZE --> PUBSUB["Redis PubSub<br/>(real-time UI)"]
    NORMALIZE --> AUTO["Automation Engine<br/>(trigger rules)"]
```

---

## 7. Infrastructure & Deployment

```mermaid
flowchart TD
    subgraph "Production"
        VERCEL["Vercel<br/>(Next.js frontend)"]
        RAILWAY["Railway / Fly.io<br/>(API server + workers)"]
        NEON["Neon / Supabase<br/>(PostgreSQL)"]
        UPSTASH["Upstash<br/>(Redis)"]
        R2["Cloudflare R2<br/>(Media)"]
        MEILI["Meilisearch Cloud"]
    end
    
    subgraph "CI/CD"
        GH["GitHub Actions"]
        GH --> |"main branch"| VERCEL
        GH --> |"main branch"| RAILWAY
        GH --> |"migrations"| NEON
    end
    
    subgraph "Monitoring"
        SENTRY["Sentry<br/>(Error tracking)"]
        AXIOM["Axiom / Datadog<br/>(Logs + Metrics)"]
        UPTIME["BetterUptime<br/>(Status page)"]
    end
```

### Environment Matrix

| Service | Development | Staging | Production |
|---|---|---|---|
| Frontend | localhost:3000 | staging.automyc.com | automyc.com |
| API | localhost:4000 | api-staging.automyc.com | api.automyc.com |
| Database | Docker PostgreSQL | Neon branch | Neon main |
| Redis | Docker Redis | Upstash staging | Upstash production |
| Storage | Local filesystem | R2 staging bucket | R2 production bucket |

---

## 8. Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Monolith vs Microservices | **Modular monolith** first | Faster iteration, single deploy, split later |
| REST vs GraphQL | **REST** with OpenAPI | Simpler for API consumers, better caching |
| SSR vs SPA | **Hybrid** (RSC + CSR) | Marketing pages SSR for SEO, dashboard CSR for interactivity |
| Queue system | **BullMQ + Redis** | Reliable delayed jobs, rate limiting, retries |
| Database | **PostgreSQL** | Multi-tenant, JSON columns, full-text search fallback |
| ORM | **Prisma** | Type safety, migrations, introspection |
| Auth | **Custom + OAuth** | Full control over token scoping, API key system |
| AI Provider | **OpenAI (primary) + Claude (fallback)** | Best content quality, fallback for availability |
| File storage | **Cloudflare R2** | S3-compatible, no egress fees |
