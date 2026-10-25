# Gmailo — Project Progress & Sprint Audit Report

> **Last Updated:** October 25, 2026  
> **Test Status:** 14/14 test suites passing (67/67 tests)  
> **Build Status:** Next.js 15 App Router production build passing (28 routes)

---

## Executive Summary

The project roadmap is structured into **4 Phases** spanning **21 Sprints** (42 planned weeks) as outlined in `5-Phases.md`.

| Phase | Planned Duration | Sprints | Completion | Status Summary |
|---|---|---|---|---|
| **Phase 1: MVP (Social Publishing + Inbox)** | Weeks 1–8 | Sprints 1 – 4 | **100%** | **Fully Built & Tested** (Foundation, Channels, Posts, Calendar, Inbox, AI, Billing) |
| **Phase 2: Growth Features** | Weeks 9–18 | Sprints 5 – 9 | **~45%** | **Sprint 6 (Email Outreach) 100% built early**; Sprint 9 tenant DB schema built; Sprints 5, 7, 8 pending |
| **Phase 3: Creative Studios** | Weeks 19–30 | Sprints 10 – 15 | **0%** | **Not Started** (Graphics studio, video studio, website builder) |
| **Phase 4: Platform Maturity** | Weeks 31–42 | Sprints 16 – 21 | **~50%** | **Sprint 16–17 (API keys) & Sprint 20 (Docker) 100% built early**; Mobile app pending |

---

## Phase 1: MVP — Social Publishing + Inbox (Weeks 1–8) — 100% Built

### Sprint 1 (Weeks 1–2): Foundation & Architecture
* **Status:** Complete (100%)
* **Planned Tasks:**
  * Turborepo / Monorepo setup with Next.js 15, Prisma ORM, Tailwind CSS, shadcn/ui.
  * Relational database schema for Users, Workspaces, Channels, Posts, Threads, Messages.
  * Authentication system with password hashing and session management.
  * Landing page, Register and Login pages.
  * CI/CD test execution pipeline.
* **Built in Codebase:**
  * Next.js 15 App Router setup with Tailwind CSS and Lucide icons.
  * Prisma ORM schema (`prisma/schema.prisma`) defining `User`, `Workspace`, `WorkspaceMember`, `Session`, `Channel`, `Post`, `Thread`, `Message`.
  * Secure auth layer (`src/lib/auth.ts`) with PBKDF2/SHA-256 password hashing and HttpOnly cookie sessions.
  * Auth endpoints & UI: `src/app/login/page.tsx`, `src/app/register/page.tsx`, `src/app/api/auth/session/route.ts`, and landing page at `src/app/page.tsx`.
  * Automated testing pipeline with Vitest (`vitest.config.ts`, 14 suites, 67 tests passing).

### Sprint 2 (Weeks 3–4): Channel Connection + Post Creation
* **Status:** Complete (100%)
* **Planned Tasks:**
  * Meta OAuth connection for Instagram + Facebook.
  * Channel management UI.
  * AES-256-GCM token encryption at rest.
  * Post creation form with media upload, caption editor, and channel selector.
  * Post CRUD API.
* **Built in Codebase:**
  * AES-256-GCM encryption vault (`src/lib/encryption.ts`) ensuring all tokens and passwords are encrypted at rest.
  * Channel manager (`src/app/dashboard/channels/page.tsx`) and channel API (`src/app/api/channels/route.ts`) supporting Instagram, Facebook, and Gmail / SMTP App Passwords.
  * Post composer UI (`src/app/dashboard/posts/new/page.tsx`) with multi-channel target selector, live character counter, image preview, and scheduling datetime picker.
  * Post CRUD API (`src/app/api/posts/route.ts` and `src/app/api/posts/[id]/route.ts`).

### Sprint 3 (Weeks 5–6): Calendar + Publishing Engine
* **Status:** Complete (100%)
* **Planned Tasks:**
  * Content calendar UI with month/week/day views and post cards.
  * Publishing scheduling engine.
  * Instagram & Facebook publishing execution.
  * Post status lifecycle (`DRAFT` → `SCHEDULED` → `PUBLISHING` → `PUBLISHED`/`FAILED`).
* **Built in Codebase:**
  * Interactive content calendar at `src/app/dashboard/calendar/page.tsx` displaying monthly distribution and status tags.
  * Publishing pipeline at `src/app/api/posts/[id]/publish/route.ts` handling status transitions and recording post metrics.

### Sprint 4 (Weeks 7–8): Unified Inbox, AI, Billing & Launch
* **Status:** Complete (100%)
* **Planned Tasks:**
  * Meta webhook subscription for comments & DMs.
  * Unified inbox thread view and reply composer.
  * AI reply drafting with brand context.
  * Analytics for reach and engagement.
  * Stripe billing integration, checkout, subscription management, and pricing page.
* **Built in Codebase:**
  * Unified Inbox UI (`src/app/dashboard/inbox/page.tsx`) with thread management, real-time message history, and outgoing email reply dispatching via `src/app/api/inbox/threads/[id]/reply/route.ts`.
  * NVIDIA NIM AI integration (`src/lib/ai/nvidia-nim.ts` and `src/app/api/inbox/threads/[id]/ai/route.ts`) drafting contextual email replies and post captions.
  * Real-time analytics engine (`src/app/api/analytics/overview/route.ts` and `src/app/dashboard/analytics/page.tsx`).
  * Billing: `src/app/pricing/page.tsx`, `src/app/dashboard/billing/page.tsx`, and checkout upgrading in `src/app/api/billing/checkout/route.ts`.

---

## Phase 2: Growth Features (Weeks 9–18) — ~45% Built

### Sprint 5 (Weeks 9–10): TikTok + YouTube
* **Status:** ⏳ Not Started
* **Planned Tasks:** TikTok Login Kit & Content Posting API, YouTube Data API v3 video upload, video aspect ratio validation.
* **Codebase Status:** Database schema supports `TIKTOK` and `YOUTUBE` platform types, but specific multipart video upload handlers and OAuth flows are not yet implemented.

### Sprint 6 (Weeks 11–12): Email Outreach Engine
* **Status:** Complete (100% — Built Ahead of Schedule)
* **Planned Tasks:** Gmail connection, rich email composer, sequence builder, bulk sending, campaign analytics.
* **Built in Codebase:**
  * Gmail connection with AES-256 encrypted App Passwords and OAuth callback handler (`src/app/api/integrations/gmail/callback/route.ts`).
  * Campaign CRUD and recipient management (`src/app/api/campaigns/route.ts` and `src/app/api/campaigns/[id]/recipients/route.ts`).
  * Bulk email dispatch engine (`src/lib/email/sender.ts` and `src/app/api/campaigns/[id]/send/route.ts`) with batch throttling (10 emails/batch, 500ms delay), merge tag personalization (`{{name}}`, `{{company}}`), and automatic markdown hyperlink conversion (`[Text](URL)` to clickable HTML).
  * Outreach Campaign UI (`src/app/dashboard/campaigns/page.tsx`) with contact list CSV importer, AI copy generator, and link insertion toolbar.

### Sprint 7 (Weeks 13–14): WhatsApp Cloud API Integration
* **Status:** ⏳ Not Started
* **Planned Tasks:** WhatsApp Business Cloud API setup, template message submission, inbound/outbound two-way chat, broadcast campaigns.
* **Codebase Status:** `WHATSAPP` platform enum exists in `prisma/schema.prisma`. Endpoints and Meta Cloud API webhooks pending.

### Sprint 8 (Weeks 15–16): Social Automations Engine
* **Status:** 🟡 Partially Modelled in DB
* **Planned Tasks:** Visual rule builder (trigger → condition → action), comment auto-reply, comment-to-DM, follow-to-DM.
* **Codebase Status:** `Automation` table exists in `prisma/schema.prisma` (`triggerType`, `actionType`, `triggerConfig`, `actionConfig`). Visual rule builder UI and webhook trigger listeners are pending.

### Sprint 9 (Weeks 17–18): Multi-Workspace & Team Invitations
* **Status:** 🟡 Partially Built
* **Planned Tasks:** Multi-workspace switcher, email team invitations, role-based permissions (Admin/Editor/Viewer), onboarding wizard.
* **Codebase Status:** Database includes `WorkspaceMember` with roles (`OWNER`, `ADMIN`, `EDITOR`, `VIEWER`), and all API routes strictly isolate data by `workspaceId`. Frontend workspace switching dropdown and invite-by-email invitation loop are pending.

---

## Phase 3: Creative Studios (Weeks 19–30) — 0% Built

### Sprint 10–11 (Weeks 19–22): Graphics Studio
* **Status:** ⏳ Not Started
* **Planned Tasks:** Fabric.js / Konva.js layered canvas engine, social image templates, brand kit (logo, custom fonts, colors), image export to scheduled post.

### Sprint 12–13 (Weeks 23–26): Video Studio
* **Status:** ⏳ Not Started
* **Planned Tasks:** AI video generation (Runway/Pika), timeline clip editor, Whisper speech-to-text auto-captions, royalty-free audio library, MP4 export.

### Sprint 14–15 (Weeks 27–30): Website Builder + AI Finder
* **Status:** ⏳ Not Started
* **Planned Tasks:** Block-based landing page editor (GrapesJS), AI page generator, custom CNAME domains with SSL, AI Finder (Google Maps B2B scraper and lead enrichment).

---

## Phase 4: Platform Maturity (Weeks 31–42) — ~50% Built

### Sprint 16–17 (Weeks 31–34): Platform API & Developer Platform
* **Status:** Complete (100% — Built Ahead of Schedule)
* **Planned Tasks:** API key management, SHA-256 hashed secret storage, scoped permissions (`social:read`, `social:write`, `campaigns:send`), sliding-window rate limiting.
* **Built in Codebase:**
  * Key generation and verification in `src/lib/api-keys.ts` with `gm_live_` prefixes and secure SHA-256 storage.
  * API Key CRUD endpoints (`src/app/api/api-keys/route.ts`).
  * Rate limiter in `src/lib/rate-limiter.ts` enforcing token limits and returning `429 Too Many Requests` with `RateLimit-*` headers.

### Sprint 18–19 (Weeks 35–38): Mobile Application
* **Status:** ⏳ Not Started
* **Planned Tasks:** React Native / Expo mobile app, mobile inbox, mobile post creation, push notifications.

### Sprint 20–21 (Weeks 39–42): Enterprise & Self-Hosted Deployment
* **Status:** Complete (80% — Built Ahead of Schedule)
* **Planned Tasks:** Self-hosted Docker containerization, Docker Compose, system health check, audit logging, GDPR export.
* **Built in Codebase:**
  * Production containerization via `Dockerfile` (multi-stage Node 20 Alpine build) and `docker-compose.yml`.
  * System health check endpoint at `src/app/api/health/route.ts` verifying database latency and memory usage.
  * Audit log model in `prisma/schema.prisma`.
  * *Pending:* Enterprise SAML/OIDC SSO and one-click GDPR workspace data zip export.
