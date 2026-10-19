# MVP Tech Doc.md — Minimum Viable Product Technical Specification

## 1. MVP Definition

> **Goal:** Launch a working marketing automation platform that lets a user connect social accounts, schedule posts, receive messages in a unified inbox, and use AI to draft replies — in **8 weeks**.

### What's IN the MVP

| Feature | Scope |
|---|---|
| **Auth & Onboarding** | Email/password registration, Google OAuth login, workspace creation |
| **Channel Connection** | Instagram + Facebook via Meta OAuth (1 platform pair) |
| **Social Publishing** | Create post with caption + image, schedule for future, publish to IG + FB |
| **Content Calendar** | Monthly calendar view, drag-to-reschedule, post status indicators |
| **Unified Inbox** | Instagram comments + DMs + Facebook comments aggregated into threads |
| **AI Reply Drafting** | Generate reply suggestions using OpenAI, 1-click send |
| **Basic Analytics** | Post reach, engagement count per post (from platform API) |
| **Billing** | Free trial (30 days), single paid plan via Stripe Checkout |
| **Landing Page** | Homepage, pricing page, login/register |

### What's OUT of MVP

| Feature | Phase |
|---|---|
| TikTok, YouTube publishing | Phase 2 |
| Email outreach & campaigns | Phase 2 |
| WhatsApp integration | Phase 2 |
| Graphics studio | Phase 3 |
| Video studio | Phase 3 |
| Website builder | Phase 3 |
| AI Finder (lead discovery) | Phase 3 |
| Automations (comment-to-DM, follow-to-DM) | Phase 2 |
| API keys / Platform API | Phase 3 |
| Multi-workspace | Phase 2 |
| Mobile app | Phase 4 |

---

## 2. Tech Stack (MVP)

| Layer | Technology | Justification |
|---|---|---|
| **Frontend** | Next.js 15 (App Router) | SSR for marketing, CSR for dashboard |
| **UI Library** | shadcn/ui + Tailwind CSS 4 | Rapid development, consistent design |
| **Backend** | Next.js API Routes + tRPC | Type-safe, no separate server for MVP |
| **Database** | PostgreSQL (Neon) | Serverless, branching for dev |
| **ORM** | Prisma | Migrations, type generation |
| **Auth** | NextAuth.js v5 | Google OAuth + credentials provider |
| **Queue** | Inngest | Serverless functions, scheduled jobs, no Redis needed for MVP |
| **Storage** | Cloudflare R2 | Media uploads via presigned URLs |
| **AI** | OpenAI GPT-4o-mini | Cost-effective content generation |
| **Payments** | Stripe Checkout + Webhooks | Subscriptions, trial management |
| **Hosting** | Vercel | Deploy entire Next.js app |
| **Monitoring** | Sentry + Vercel Analytics | Error tracking + performance |

---

## 3. MVP API Contract

### Auth Endpoints

```
POST   /api/auth/register          # Email + password signup
POST   /api/auth/login             # Email + password login
GET    /api/auth/session            # Current session
DELETE /api/auth/session            # Logout
```

### Channel Endpoints

```
GET    /api/channels                # List connected channels
POST   /api/channels/connect/meta   # Start Meta OAuth flow
GET    /api/channels/callback/meta   # Meta OAuth callback
DELETE /api/channels/:id             # Disconnect channel
```

### Social Post Endpoints

```
GET    /api/posts                   # List posts (with filters)
POST   /api/posts                   # Create post (draft or scheduled)
GET    /api/posts/:id               # Get post details
PATCH  /api/posts/:id               # Update post (caption, schedule)
DELETE /api/posts/:id               # Delete post
POST   /api/posts/:id/publish       # Publish immediately
```

### Inbox Endpoints

```
GET    /api/inbox/threads           # List threads (paginated)
GET    /api/inbox/threads/:id       # Get thread with messages
POST   /api/inbox/threads/:id/reply # Send reply
POST   /api/inbox/threads/:id/ai    # Generate AI reply suggestion
PATCH  /api/inbox/threads/:id       # Update labels, assignment
```

### Analytics Endpoints

```
GET    /api/analytics/overview      # Dashboard metrics
GET    /api/analytics/posts/:id     # Per-post metrics
```

### Billing Endpoints

```
GET    /api/billing/subscription    # Current plan & trial status
POST   /api/billing/checkout        # Create Stripe Checkout session
POST   /api/billing/portal          # Create Stripe Billing Portal session
POST   /api/webhooks/stripe         # Stripe webhook handler
```

---

## 4. MVP Frontend Pages

| Route | Page | Auth Required |
|---|---|---|
| `/` | Landing page (hero + features + CTA) | No |
| `/pricing` | Pricing page (single plan + trial info) | No |
| `/login` | Sign in form | No |
| `/register` | Sign up form | No |
| `/dashboard` | Redirect to workspace | Yes |
| `/dashboard/calendar` | Content calendar | Yes |
| `/dashboard/posts/new` | Create/edit post | Yes |
| `/dashboard/inbox` | Unified inbox | Yes |
| `/dashboard/inbox/:threadId` | Thread detail | Yes |
| `/dashboard/analytics` | Analytics overview | Yes |
| `/dashboard/channels` | Connected channels management | Yes |
| `/dashboard/settings` | Account settings | Yes |
| `/dashboard/billing` | Subscription management | Yes |

---

## 5. MVP Data Models

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String?
  name          String?
  avatarUrl     String?
  workspace     Workspace?
  createdAt     DateTime  @default(now())
}

model Workspace {
  id            String    @id @default(cuid())
  name          String
  userId        String    @unique
  user          User      @relation(fields: [userId], references: [id])
  channels      Channel[]
  posts         Post[]
  threads       Thread[]
  subscription  Subscription?
  trialEndsAt   DateTime
  aiCredits     Int       @default(100)
  createdAt     DateTime  @default(now())
}

model Channel {
  id            String    @id @default(cuid())
  workspaceId   String
  workspace     Workspace @relation(fields: [workspaceId], references: [id])
  platform      Platform  // INSTAGRAM, FACEBOOK
  platformId    String    // Platform account ID
  name          String    // Display name
  accessToken   String    // Encrypted
  refreshToken  String?   // Encrypted
  tokenExpiry   DateTime?
  avatarUrl     String?
  isActive      Boolean   @default(true)
  posts         PostChannel[]
  createdAt     DateTime  @default(now())
}

model Post {
  id            String    @id @default(cuid())
  workspaceId   String
  workspace     Workspace @relation(fields: [workspaceId], references: [id])
  caption       String
  mediaUrls     String[]  // Array of media URLs
  status        PostStatus // DRAFT, SCHEDULED, PUBLISHING, PUBLISHED, FAILED
  scheduledAt   DateTime?
  publishedAt   DateTime?
  channels      PostChannel[]
  metrics       PostMetric[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model PostChannel {
  id            String    @id @default(cuid())
  postId        String
  post          Post      @relation(fields: [postId], references: [id])
  channelId     String
  channel       Channel   @relation(fields: [channelId], references: [id])
  platformPostId String?  // ID from platform after publishing
  status        PostStatus
  error         String?
}

model Thread {
  id            String    @id @default(cuid())
  workspaceId   String
  workspace     Workspace @relation(fields: [workspaceId], references: [id])
  platform      Platform
  platformThreadId String
  contactName   String
  contactAvatar String?
  lastMessageAt DateTime
  isRead        Boolean   @default(false)
  labels        String[]
  messages      Message[]
}

model Message {
  id            String    @id @default(cuid())
  threadId      String
  thread        Thread    @relation(fields: [threadId], references: [id])
  direction     Direction // INBOUND, OUTBOUND
  content       String
  platformMsgId String?
  sentAt        DateTime  @default(now())
}

enum Platform { INSTAGRAM, FACEBOOK }
enum PostStatus { DRAFT, SCHEDULED, PUBLISHING, PUBLISHED, FAILED }
enum Direction { INBOUND, OUTBOUND }
```

---

## 6. MVP Sprint Plan (8 Weeks)

| Week | Focus | Deliverables |
|---|---|---|
| **1** | Project setup + Auth | Monorepo, DB schema, NextAuth, register/login pages |
| **2** | Channel connection | Meta OAuth flow, token storage, channel management UI |
| **3** | Post creation + Media | Post form, media upload to R2, caption editor |
| **4** | Calendar + Scheduling | Calendar component, drag-to-reschedule, Inngest scheduled jobs |
| **5** | Publishing engine | Publish to Instagram + Facebook via APIs, status tracking |
| **6** | Unified Inbox | Webhook ingestion, thread aggregation, inbox UI |
| **7** | AI replies + Analytics | OpenAI integration, reply drafting, basic post metrics |
| **8** | Billing + Landing + Polish | Stripe integration, marketing pages, bug fixes, deploy |

---

## 7. MVP Launch Criteria

- [ ] User can register and log in
- [ ] User can connect Instagram and Facebook accounts
- [ ] User can create a post with image and caption
- [ ] User can schedule a post for a future time
- [ ] Scheduled posts publish automatically at the correct time
- [ ] Published posts show on the calendar with correct status
- [ ] Instagram comments and DMs appear in the unified inbox
- [ ] User can reply to inbox threads
- [ ] AI can generate reply suggestions
- [ ] Basic post metrics (reach, likes) display on analytics page
- [ ] 30-day free trial activates on registration
- [ ] User can subscribe via Stripe Checkout
- [ ] Landing page and pricing page are live

---

## 8. Post-MVP Scaling Triggers

| Trigger | Action |
|---|---|
| > 100 concurrent users | Move queue from Inngest to BullMQ + Redis |
| > 1000 threads in inbox | Add Meilisearch for full-text search |
| > 50 scheduled posts/minute | Separate API server from Next.js (Fastify) |
| > 5 channel types | Extract integration layer to separate package |
| Customer requests for TikTok/YouTube | Begin Phase 2 development |
