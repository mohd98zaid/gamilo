# System Design.md — Scalability, Reliability & Performance

## 1. Capacity Estimation

### User Scale Targets

| Metric | Launch | Year 1 | Year 3 |
|---|---|---|---|
| Registered users | 500 | 5,000 | 50,000 |
| DAU | 100 | 1,000 | 10,000 |
| Connected channels | 1,000 | 15,000 | 150,000 |
| Posts scheduled/day | 500 | 10,000 | 100,000 |
| Inbox messages/day | 2,000 | 50,000 | 500,000 |
| AI requests/day | 300 | 5,000 | 50,000 |
| Media uploads/day | 200 | 5,000 | 50,000 |

### Storage Estimation (Year 1)

| Data Type | Size per Unit | Volume | Total |
|---|---|---|---|
| Post records | ~2 KB | 3.6M/year | ~7 GB |
| Messages | ~1 KB | 18M/year | ~18 GB |
| Media files | ~2 MB avg | 1.8M/year | ~3.6 TB |
| Analytics events | ~0.5 KB | 50M/year | ~25 GB |
| **Total DB** | | | **~50 GB** |
| **Total Media** | | | **~3.6 TB** |

---

## 2. Multi-Tenancy Design

```mermaid
flowchart TD
    REQ["Incoming Request"] --> AUTH["Auth Middleware"]
    AUTH --> |"Extract workspace_id<br/>from token/session"| CTX["Request Context<br/>{userId, workspaceId, plan}"]
    CTX --> RLS["Row-Level Security<br/>WHERE workspace_id = ?"]
    CTX --> LIMITS["Plan Limits Check<br/>(channels, automations, credits)"]
    RLS --> DB["PostgreSQL"]
    LIMITS --> |"Within limits"| SVC["Service Logic"]
    LIMITS --> |"Exceeded"| ERR["402 Plan Limit Exceeded"]
```

### Tenant Isolation Strategy

| Layer | Strategy |
|---|---|
| **Database** | Shared database, shared schema, `workspace_id` on every table, RLS policies |
| **Queue** | Jobs tagged with `workspaceId`, per-tenant rate limiting |
| **Cache** | Redis keys prefixed with `ws:{workspaceId}:` |
| **Storage** | S3/R2 paths: `/{workspaceId}/media/{fileId}` |
| **Rate Limits** | Per-workspace API rate limits based on plan |

### Plan Enforcement Middleware

```typescript
// middleware/planLimits.ts
async function enforcePlanLimits(ctx: RequestContext) {
  const workspace = await getWorkspace(ctx.workspaceId);
  const plan = PLANS[workspace.planId];
  
  const checks = {
    channels: await countChannels(ctx.workspaceId) < plan.maxChannels,
    automations: await countActiveAutomations(ctx.workspaceId) < plan.maxAutomations,
    aiCredits: workspace.aiCredits > 0,
    workspaces: await countWorkspaces(ctx.userId) < plan.maxWorkspaces,
  };
  
  return checks;
}
```

---

## 3. Caching Architecture

```mermaid
flowchart LR
    subgraph "Cache Layers"
        L1["L1: In-Memory<br/>(Node.js LRU)<br/>TTL: 30s"]
        L2["L2: Redis<br/>TTL: 5min–1hr"]
        L3["L3: CDN Edge<br/>(Vercel/CF)<br/>TTL: 1hr–24hr"]
    end

    REQ["Request"] --> L3
    L3 --> |miss| L2
    L2 --> |miss| L1
    L1 --> |miss| DB["PostgreSQL"]
    DB --> L1 --> L2 --> L3
```

### Cache Key Design

```
# Session/Auth
session:{sessionToken}           → UserSession      TTL: 24h
apikey:{keyHash}                 → ApiKeyContext     TTL: 5min

# Workspace
ws:{id}:plan                     → PlanDetails       TTL: 1h
ws:{id}:channels                 → Channel[]         TTL: 5min
ws:{id}:credits                  → CreditBalance     TTL: 1min

# Social
ws:{id}:calendar:{year}-{month}  → Post[]           TTL: 2min
post:{id}:metrics                → PostMetrics       TTL: 15min

# Inbox
ws:{id}:inbox:unread             → count            TTL: 30s
thread:{id}:messages             → Message[]        TTL: 1min
```

### Cache Invalidation Strategy

| Event | Invalidation |
|---|---|
| Post created/updated/deleted | `ws:{id}:calendar:*` |
| New inbox message | `ws:{id}:inbox:unread`, `thread:{id}:messages` |
| Channel connected/disconnected | `ws:{id}:channels` |
| AI credit consumed | `ws:{id}:credits` |
| Subscription changed | `ws:{id}:plan` |

---

## 4. Rate Limiting Design

### API Rate Limits

| Plan | Requests/min | Burst | Publishing/hour |
|---|---|---|---|
| Free Trial | 60 | 10 | 10 |
| Starter | 120 | 20 | 30 |
| Scale | 300 | 50 | 100 |
| API Keys | 600 | 100 | 200 |

### Implementation (Token Bucket via Redis)

```typescript
// Sliding window rate limiter
async function rateLimit(workspaceId: string, limit: number, windowMs: number) {
  const key = `ratelimit:${workspaceId}`;
  const now = Date.now();
  
  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, now - windowMs);
  pipeline.zadd(key, now, `${now}:${crypto.randomUUID()}`);
  pipeline.zcard(key);
  pipeline.expire(key, Math.ceil(windowMs / 1000));
  
  const results = await pipeline.exec();
  const count = results[2][1] as number;
  
  if (count > limit) {
    throw new RateLimitError(limit, windowMs);
  }
}
```

### Platform-Specific Rate Limits

| Platform | Publish Limit | API Rate Limit |
|---|---|---|
| Instagram | 25 posts/day per account | 200 calls/hour |
| Facebook | 50 posts/day per page | 200 calls/hour |
| TikTok | 1 video/day via API | 100 calls/day |
| YouTube | 6 videos/day | 10,000 units/day |
| Gmail | 500 emails/day (free) | 250 quota units/sec |
| WhatsApp | Template-based limits | 80 messages/sec |

---

## 5. Webhook Processing Pipeline

```mermaid
flowchart TD
    WH["Incoming Webhook<br/>(POST /webhooks/:platform)"]
    WH --> VERIFY["Verify Signature<br/>(HMAC / token)"]
    VERIFY --> |"Invalid"| REJECT["403 Rejected"]
    VERIFY --> |"Valid"| ACK["200 OK<br/>(acknowledge immediately)"]
    ACK --> DEDUP["Deduplicate<br/>(Redis SET with TTL)"]
    DEDUP --> |"Duplicate"| DROP["Skip"]
    DEDUP --> |"New"| QUEUE["Enqueue to<br/>webhook:process"]
    QUEUE --> WORKER["Worker Process"]
    WORKER --> NORMALIZE["Normalize Event"]
    NORMALIZE --> |"comment"| THREAD["Create/Update Thread"]
    NORMALIZE --> |"message"| THREAD
    NORMALIZE --> |"follow"| AUTO["Trigger Automation"]
    THREAD --> PUBSUB["Redis PubSub<br/>(real-time push)"]
    THREAD --> SEARCH["Index in Meilisearch"]
```

### Webhook Retry Strategy

```
Attempt 1: Immediate
Attempt 2: 30 seconds
Attempt 3: 2 minutes
Attempt 4: 10 minutes
Attempt 5: 1 hour
→ Move to dead letter queue after 5 failures
```

---

## 6. Real-Time Architecture

```mermaid
flowchart LR
    subgraph "Server"
        API["API Server"]
        REDIS_PS["Redis PubSub"]
        SSE["SSE Endpoint<br/>(/api/realtime/events)"]
    end

    subgraph "Events"
        E1["New inbox message"]
        E2["Post published"]
        E3["AI reply ready"]
        E4["Automation triggered"]
    end

    subgraph "Client"
        HOOK["useEventSource()<br/>React Hook"]
        UI["UI Components"]
    end

    E1 & E2 & E3 & E4 --> REDIS_PS
    REDIS_PS --> SSE
    SSE --> |"EventSource"| HOOK
    HOOK --> UI
```

### Channel Design

```
# Redis PubSub channels
events:ws:{workspaceId}          # All workspace events
events:ws:{workspaceId}:inbox    # Inbox-specific events
events:ws:{workspaceId}:social   # Social-specific events
```

### Event Payload Schema

```typescript
interface RealtimeEvent {
  type: 'inbox.message' | 'post.published' | 'ai.reply_ready' | 'automation.triggered';
  workspaceId: string;
  timestamp: string;
  data: {
    id: string;
    [key: string]: unknown;
  };
}
```

---

## 7. Media Pipeline

```mermaid
flowchart LR
    UPLOAD["Client Upload"]
    UPLOAD --> PRESIGN["Get Presigned URL<br/>(POST /api/media/upload)"]
    PRESIGN --> S3["Direct Upload to R2"]
    S3 --> WEBHOOK["Upload Complete Webhook"]
    WEBHOOK --> QUEUE["media:process queue"]
    
    QUEUE --> RESIZE["Sharp: Resize<br/>(thumbnail + preview + full)"]
    QUEUE --> META["Extract Metadata<br/>(dimensions, format, size)"]
    QUEUE --> VIRUS["Virus Scan<br/>(ClamAV)"]
    
    RESIZE --> CDN["CDN URL Generation"]
    META --> DB["Store in DB"]
    VIRUS --> |"Clean"| DB
    VIRUS --> |"Infected"| DELETE["Delete + Alert"]
```

### Image Size Variants

| Variant | Max Width | Quality | Use Case |
|---|---|---|---|
| `thumb` | 150px | 70% | Grid thumbnails |
| `preview` | 600px | 80% | Feed previews |
| `full` | 1920px | 90% | Full-size display |
| `original` | Unchanged | 100% | Download / publishing |

---

## 8. AI Service Design

```mermaid
flowchart TD
    REQ["AI Request"] --> CREDITS["Check Credits<br/>(workspace.aiCredits > cost)"]
    CREDITS --> |"Insufficient"| ERR["402 Insufficient Credits"]
    CREDITS --> |"OK"| CONTEXT["Build Context"]
    
    CONTEXT --> BRAND["Load Brand Knowledge<br/>(from workspace settings)"]
    CONTEXT --> HISTORY["Load Conversation History<br/>(last 10 messages)"]
    CONTEXT --> TEMPLATE["Select Prompt Template"]
    
    BRAND & HISTORY & TEMPLATE --> LLM["OpenAI API Call<br/>(GPT-4o-mini)"]
    LLM --> |"Success"| DEDUCT["Deduct Credits"]
    LLM --> |"Failure"| FALLBACK["Fallback to Claude"]
    FALLBACK --> DEDUCT
    DEDUCT --> RESPONSE["Return Generated Content"]
```

### Credit Costs

| Action | Credits | Description |
|---|---|---|
| Draft reply | 1 | Generate inbox reply suggestion |
| Generate caption | 1 | Social post caption |
| Rewrite content | 1 | Improve existing text |
| AI assistant action | 2 | Complex multi-step task |
| Lead search | 2 | AI-powered lead enrichment |
| Generate image | 5 | DALL-E image generation |
| Generate video | 10 | AI video generation |

---

## 9. Search Architecture

```mermaid
flowchart LR
    WRITE["New Message / Thread"] --> INDEX["Meilisearch Index"]
    
    subgraph "Indexes"
        I1["threads<br/>(contactName, labels, platform)"]
        I2["messages<br/>(content, full-text)"]
        I3["posts<br/>(caption, status)"]
        I4["contacts<br/>(name, email, company)"]
    end
    
    SEARCH["Search Query"] --> MEILI["Meilisearch"]
    MEILI --> I1 & I2 & I3 & I4
    MEILI --> RESULTS["Ranked Results<br/>(with highlighting)"]
```

### Filterable Attributes

```json
{
  "threads": {
    "filterableAttributes": ["workspaceId", "platform", "labels", "isRead"],
    "sortableAttributes": ["lastMessageAt", "createdAt"],
    "searchableAttributes": ["contactName", "lastMessagePreview"]
  }
}
```

---

## 10. Disaster Recovery & High Availability

| Component | Strategy | RPO | RTO |
|---|---|---|---|
| **Database** | Neon point-in-time recovery + daily snapshots | 1 min | 5 min |
| **Redis** | Upstash with replication | 0 (replicated) | < 1 min |
| **Media Storage** | R2 cross-region replication | 0 | 0 |
| **Application** | Vercel multi-region, Railway auto-restart | N/A | < 2 min |
| **Queue** | BullMQ with Redis persistence + dead letter | 0 | < 1 min |

### Backup Schedule

```
Database:  Continuous WAL archiving + daily full snapshot (30-day retention)
Redis:     RDB snapshots every 5 minutes
Media:     Cross-region replication (automatic)
Configs:   Git-tracked, environment variables in Vercel/Railway
```

### Failover Procedures

1. **Database failure** → Neon auto-promotes read replica, app retries
2. **Redis failure** → Upstash auto-failover, app degrades gracefully (no cache = slower)
3. **API server crash** → Railway auto-restarts, Vercel function cold-starts
4. **External API down** → Queue retries with exponential backoff, user sees "publishing" state
5. **Full region outage** → DNS failover to secondary deployment (manual, < 15 min)
