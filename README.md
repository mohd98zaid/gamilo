# Gamilo

Gamilo is a multi-tenant marketing workspace built with Next.js, React,
TypeScript, Prisma, and Vitest. The application provides the foundation for
AI-assisted content creation, workspace-scoped marketing data, connected
channels, scheduled posts, analytics, inbox workflows, and subscription
management.

> **Project status:** Gamilo is an active engineering build. It is not yet a
> fully verified production SaaS. Local application data uses SQLite. Email
> campaigns can make real SMTP requests when configured; social publishing and
> billing are unavailable until provider integrations exist. Read the
> limitations below before interpreting a success response as external
> provider confirmation.

Repository: [mohd98zaid/gamilo](https://github.com/mohd98zaid/gamilo).
Some filenames, package metadata, and UI labels retain the earlier name `gmailo`.

## Contents

- [What exists today](#what-exists-today)
- [What is not production-ready](#what-is-not-production-ready)
- [Technology](#technology)
- [Repository architecture](#repository-architecture)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Database workflow](#database-workflow)
- [Authentication and security](#authentication-and-security)
- [AI generation](#ai-generation)
- [Gmail OAuth](#gmail-oauth)
- [Email campaigns and recipient management](#email-campaigns-and-recipient-management)
- [API behavior](#api-behavior)
- [Testing and verification](#testing-and-verification)
- [Docker](#docker)
- [Future Supabase/PostgreSQL move](#future-supabasepostgresql-move)
- [Backup and recovery](#backup-and-recovery)
- [Production checklist](#production-checklist)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## What exists today

### Application and dashboard

- Next.js App Router marketing pages and authenticated dashboard pages.
- Dashboard areas for overview, calendar, posts, channels, campaigns, inbox, analytics,
  AI Studio, settings, and billing.
- Shared dashboard navigation through `DashboardSidebar` and
  `DashboardTopbar`.
- Workspace-backed views, with test-fixture behavior isolated from production as
  described below.

### Authentication and workspaces

- Database-backed users and workspaces.
- Password hashing with bcrypt for normal registration and login.
- Database-backed sessions with hashed random tokens.
- Expiring HTTP-only, SameSite cookies.
- Logout that revokes the current session.
- Workspace membership roles:
  - `OWNER`
  - `ADMIN`
  - `EDITOR`
  - `VIEWER`
- Workspace-scoped reads and writes in the persisted Prisma route paths.
- Explicit test-only authentication bypass guarded by both test environment and
  test bypass configuration.

### Content and posts

- Draft posts.
- Scheduled post records; automatic execution still requires a durable worker.
- Channel ownership validation before post creation.
- Post update and deletion scoped to the current workspace.
- Centralized post mapping for JSON media URLs, channel IDs, and latest metrics.
- A modular Posts feature under `src/features/posts/` with repository and
  in-memory test adapters.

### AI generation

- NVIDIA NIM client using an OpenAI-compatible API.
- Configured primary model and optional explicitly configured fallback model.
- Request timeout handling.
- Bounded retry behavior.
- Prompt builders for captions, email subjects, hashtags, outreach, and inbox
  assistance.
- Workspace AI credit reservation and refund behavior in the persisted route.
- Safe client-facing errors that do not return provider credentials or raw
  provider diagnostics.

### Connected channels and Gmail OAuth

- Workspace channel records in Prisma.
- Provider credentials encrypted with AES-256-GCM before storage.
- Channel API responses omit access and refresh tokens.
- Gmail OAuth start and callback routes.
- OAuth state stored in a short-lived HTTP-only cookie.
- Gmail profile identity checked before a channel is stored.
- Manual Gmail app-password channel storage and Nodemailer SMTP dispatch.

### Email campaigns

- Create, edit, and delete campaigns with a sender account, subject, and body.
- Import email addresses and simple comma-separated contact rows.
- Infer names and companies, with optional NVIDIA-assisted enrichment.
- Personalize templates with merge variables, text alternatives, and links.
- Send pending recipients, retry individual recipients, and reset failed ones.
- Explicit **Resend All** and per-recipient **Remove** controls.
- Persist recipient results, timestamps, and error messages.

### Engineering safeguards

- Strict and bounded Zod request schemas.
- Security response headers in `next.config.mjs`.
- Non-root Docker runtime user.
- Health endpoint at `/api/health`.
- Prisma schema validation and client generation scripts.
- Unit, route-level integration, authorization, encryption, and feature tests.

## What is not production-ready

The following features are present as UI or route boundaries but are not yet
verified as complete production integrations:

- Social publishing through Meta, TikTok, YouTube, or WhatsApp.
- Provider-confirmed publication state transitions and reconciliation.
- Gmail message synchronization, inbound ingestion, reply delivery, and push
  notifications.
- Billing checkout, signed payment webhooks, idempotent subscription updates,
  and server-side entitlement enforcement.
- Durable scheduling, background workers, retries, recovery, concurrency
  control, and dead-letter handling.
- Shared multi-instance rate limiting. The current limiter is process-local.
- Complete multi-workspace account selection and workspace switching.
- PostgreSQL staging/production deployment and migration rehearsal.
- Backups, restore drills, monitoring, alerting, rollback, and incident
  response operations.

### Current behavior that must not be mistaken for production integration

| Area | Actual implementation and limitation |
|---|---|
| Social publishing | Always returns `501` until a real provider adapter is implemented. Tokens and feature flags are not treated as proof of live publication, and post state/metrics are not changed. |
| Billing checkout | Always returns `501` until a payment provider and signed webhook flow exist. No payment is collected and no subscription or credits are changed. |
| Inbox replies | Test fixtures support synthetic replies. Persisted email replies require an SMTP send to resolve before recording an outbound message; SMTP failure returns `502` and non-email provider replies return `501`. |
| Inbox AI | Calls NVIDIA for persisted threads, but its credit update is not the atomic reservation used by the general AI endpoint. |
| Channel creation | Stores manual credentials and marks channels active without verifying SMTP login. Non-email channel credentials may be generated placeholders. |
| Email credentials | Malformed encrypted credentials fail closed. Legacy plaintext credentials remain supported for deliberate local migration, and empty credentials are rejected. |
| Campaign jobs | Execute inside the HTTP request, with no durable queue, send lock, or idempotency key. Restarts and overlapping requests can cause incomplete or duplicate sends. |

Unsubscribe/suppression lists, bounce webhooks, consent tracking, and delivery
reconciliation are also incomplete. These are release blockers, not capabilities
provided by the current SMTP loop. Local hosting does not prevent configured
email and AI actions from contacting external services.

## Technology

| Area | Current choice |
|---|---|
| Runtime | Node.js 20.19.0 pinned in `.nvmrc`; use a compatible runtime |
| Web framework | Next.js 16 App Router |
| UI | React 19, Tailwind CSS, lucide-react |
| Language | TypeScript with strict mode |
| ORM | Prisma 5 |
| Local database | SQLite at `prisma/dev.db` |
| Cloud database target | PostgreSQL, planned for staging/production |
| AI provider | NVIDIA NIM |
| Outbound email | Nodemailer with Gmail SMTP |
| Authentication | Custom Prisma-backed sessions and bcrypt passwords |
| Validation | Zod |
| Testing | Vitest |
| Containerization | Docker and Docker Compose |

## Repository architecture

```text
src/
├── app/
│   ├── api/                 HTTP route handlers
│   ├── dashboard/           Authenticated dashboard pages
│   ├── login/               Login page
│   ├── register/            Registration page
│   └── pricing/             Public pricing page
├── components/              Shared dashboard and marketing components
├── features/
│   ├── ai/                  AI request schemas
│   ├── api-keys/            API key request schemas
│   ├── auth/                Registration and login schemas
│   ├── channels/            Channel request schemas
│   ├── inbox/               Inbox request schemas
│   ├── posts/               Post schemas, types, mappers, repositories
│   ├── settings/            Workspace settings schemas
│   ├── shared/              Shared feature schema helpers
│   └── testing/             Test-only in-memory store and fixtures
└── lib/
    ├── api-auth.ts          Authentication and role enforcement
    ├── api-keys.ts          API key generation and hashing
    ├── auth.ts              Sessions, cookies, and current-user lookup
    ├── config.ts            Environment parsing and fail-closed validation
    ├── db.ts                Compatibility barrel for test store imports
    ├── ai/                  NVIDIA client and prompt builders
    ├── email/               SMTP sender, template formatting, contact inference
    ├── encryption.ts        AES-256-GCM credential encryption
    ├── errors.ts            Error taxonomy and retry helper
    ├── prisma.ts            Prisma singleton
    ├── rate-limiter.ts      Local sliding-window limiter
    ├── validators.ts        Compatibility exports for feature schemas
    └── utils.ts             Shared UI/date utilities

prisma/
├── schema.prisma            Current local SQLite Prisma schema
├── dev.db                   Ignored local development database
└── migrations/              Historical PostgreSQL migration artifacts

tests/
├── unit/                    Unit and feature-boundary tests
└── integration/             Direct route-handler integration tests
```

### Modularization conventions

Feature code should own feature-specific concerns:

```text
src/features/<feature>/
├── schemas.ts       Request validation
├── types.ts         Feature contracts and domain types
├── repository.ts    Persistence boundary where needed
├── mappers.ts       Storage-to-API conversion
└── index.ts         Public feature exports
```

The Posts feature is the current reference implementation. Existing
compatibility barrels remain in place so older imports do not break while new
code moves toward feature-owned modules.

Modularization is partial: campaigns still keep orchestration in
`src/app/api/campaigns/`, their UI in `src/app/dashboard/campaigns/page.tsx`,
and delivery helpers in `src/lib/email/`. Many other routes still query Prisma
directly. Feature directories containing only `schemas.ts` are validation
boundaries, not complete service layers.

## Local development

### Prerequisites

- Node.js compatible with `.nvmrc` (20.19.0).
- npm 10 or newer.
- Git.
- Docker Desktop only if you want to use the container workflow.

### Clone and install

```bash
git clone https://github.com/mohd98zaid/gamilo.git
cd gamilo
npm ci
cp .env.example .env
```

On Windows:

```bat
copy .env.example .env
```

### Configure local secrets

Generate a 32-byte hexadecimal value:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Generate two different values and place them in:

```env
APP_SECRET=64_hex_characters
TOKEN_ENCRYPTION_KEY=another_64_hex_characters
```

Never commit `.env`. Never paste passwords, database URLs, API keys, OAuth
secrets, or encryption keys into source files, issues, logs, or chat.

Set `NVIDIA_PRIMARY_MODEL` to your chosen model; it is required by the shared
configuration parser even when you are not generating text. For unused optional
credentials, remove their assignments rather than leaving empty strings. The
example model names and `replace_me` values are configuration examples, not
working credentials. Remove `NVIDIA_FALLBACK_MODEL` unless you want a fallback.

The publish endpoint currently reports unavailable regardless of token or feature
flag because no real social provider adapter is implemented. Do not add tokens
to make a local request appear successful.

### Local database

Local development uses SQLite:

```env
DATABASE_URL="file:./dev.db"
```

The database file is located at:

```text
prisma/dev.db
```

Prepare the local database:

```bash
npm run db:generate
npm run db:validate
npm run db:push
```

`launch.bat` is the recommended Windows launcher. It explicitly sets the
local SQLite URL and development environment so cloud values accidentally left
in `.env` do not block local development.

Start the application:

```bash
npm run dev
```

Or on Windows:

```text
launch.bat
```

Open:

```text
http://localhost:3000
```

Use `/register` to create a local account. The local SQLite account data is
not automatically present in a future Supabase/PostgreSQL database.

There is no bundled default admin password. A fresh clone needs registration.
Use the development server for the SQLite workflow: `npm run build` checks
compilation, but `npm start` runs in production mode, where configuration
validation requires PostgreSQL. A successful build does not resolve that mismatch.

## Environment variables

The complete template is in `.env.example`.

| Variable | Local | Staging/production | Purpose |
|---|---:|---:|---|
| `NODE_ENV` | yes | yes | `development`, `test`, or `production` |
| `DATABASE_URL` | yes | yes | SQLite locally; PostgreSQL after the cloud move |
| `APP_SECRET` | recommended | required | Session/application secret; 64 hex characters in production |
| `TOKEN_ENCRYPTION_KEY` | recommended | required | AES-256 credential-encryption key; 64 hex characters in production |
| `NVIDIA_API_KEY` | required for AI | required by production validation | NVIDIA NIM API credential |
| `NVIDIA_BASE_URL` | optional | optional | NVIDIA-compatible API base URL |
| `NVIDIA_PRIMARY_MODEL` | required by config | required | Approved primary model name |
| `NVIDIA_FALLBACK_MODEL` | optional | optional | Explicitly approved fallback model |
| `NVIDIA_MAX_OUTPUT_TOKENS` | optional | optional | Maximum generated output tokens |
| `NVIDIA_TEMPERATURE` | optional | optional | Model temperature |
| `SESSION_TTL_DAYS` | optional | optional | Session lifetime in days |
| `COOKIE_SECURE` | `false` locally | `true` behind HTTPS | Secure cookie setting |
| `GOOGLE_CLIENT_ID` | optional | required for Gmail OAuth | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | optional | required for Gmail OAuth | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | optional | required for Gmail OAuth | Exact Google OAuth callback URL |
| `ENABLE_SIMULATED_PUBLISHING` | unsupported | unsupported | Retained only as a legacy environment name; it does not enable publishing |
| `META_ACCESS_TOKEN` | unsupported | unsupported | A token alone does not enable publishing; implement and verify a provider adapter first |
| `GMAILO_TEST_AUTH_BYPASS` | omit during normal development | never enable | Together with `NODE_ENV=test`, enables fixture authentication |

Defaults from `src/lib/config.ts`: output tokens `2048` (maximum `8192`),
temperature `0.1` (range `0–2`), session lifetime `30` days (maximum `90`), and
NVIDIA base URL `https://integrate.api.nvidia.com/v1`. Configuration is cached;
restart the server after editing `.env`. Keep secrets server-side: variables
prefixed `NEXT_PUBLIC_` can be included in browser code.

### Supabase client variables

The current application uses Prisma directly and does not currently use a
Supabase JavaScript client. If Supabase client functionality is added later,
these browser-safe variables may be introduced separately:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

These values do not replace Prisma's `DATABASE_URL`. A publishable Supabase
key is not a database password.

## Database workflow

### Current local workflow

The checked-out local schema uses SQLite:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

Use `db push` for local iteration:

```bash
npm run db:push
```

Do not use local SQLite data as a production database.

### Future PostgreSQL workflow

The repository contains historical PostgreSQL migration artifacts under:

```text
prisma/migrations/
```

The migration lock targets PostgreSQL while the active schema targets SQLite.
Do not run `db:migrate:deploy` as a local setup step. The initial SQL predates
campaign recipients/steps and other recent changes; reconcile it with the current
schema before any cloud deployment. `db push` neither applies nor validates
those historical migrations.

The future cloud move requires a deliberate schema/configuration change:

1. Switch the Prisma datasource provider from `sqlite` to `postgresql`.
2. Add the PostgreSQL runtime URL and migration direct URL configuration.
3. Review the migration SQL against the final Prisma schema.
4. Provision a staging database first.
5. Run the migration in staging.
6. Verify registration, login, workspace creation, sessions, posts, channels,
   and authorization behavior.
7. Perform backup and restore checks.
8. Apply the reviewed migration to production during a controlled release.

For Supabase poolers, the intended pattern is:

```env
# Transaction pooler for application runtime
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@POOLER_HOST:6543/postgres?pgbouncer=true"

# Session pooler for Prisma migration operations
DIRECT_URL="postgresql://postgres.PROJECT_REF:PASSWORD@POOLER_HOST:5432/postgres"
```

Replace `PASSWORD` only in a local ignored `.env` file or secret manager. URL
encode special characters in the password. Do not run the future PostgreSQL
migration against `prisma/dev.db`.

## Authentication and security

### Sessions

- Raw session tokens are generated with cryptographically secure randomness.
- Only a SHA-256 hash of the session token is stored in the database.
- Sessions have finite expiration times.
- Expired or invalid-membership sessions are removed.
- Cookies are HTTP-only and use SameSite protection.
- Secure cookies are enabled for production or when `COOKIE_SECURE=true`.

### Authorization

Route handlers call `requireApiAuth()` with the minimum role required for the
operation. The role hierarchy is:

```text
OWNER > ADMIN > EDITOR > VIEWER
```

Authorization must remain server-side even when a UI control is hidden.
Resource queries must include the authenticated workspace ID. Changing a URL
resource ID must never expose another workspace's post, channel, thread,
settings, or API key.

### Credentials and encryption

- Provider credentials are encrypted with AES-256-GCM before storage.
- Nonces and authentication tags are validated during decryption.
- Malformed ciphertext fails closed.
- Legacy plaintext credentials remain supported for deliberate local migration;
  empty credentials and malformed encrypted values fail closed.
- Channel responses omit access and refresh tokens.
- Raw API keys are shown only once when generated; hashes are stored.
- Secrets must be supplied through ignored environment files or a secret
  manager.

### Test isolation

Test fixtures are in:

```text
src/features/testing/store.ts
```

The test authentication bypass requires explicit test settings and must never
be enabled in production. The compatibility module `src/lib/db.ts` only
re-exports the test store for older imports.

`tests/setup.ts` configures `NODE_ENV=test` and
`GMAILO_TEST_AUTH_BYPASS=true`. Normal local development uses real SQLite users
and sessions. Fixture behavior is not proof of provider functionality; campaign
route tests mock Prisma and the email sender.

## AI generation

AI generation is configured through NVIDIA NIM settings. The general
`POST /api/ai/generate` persisted-workspace request flow is:

1. Authenticate the user.
2. Resolve the workspace and brand context.
3. Validate the request with the AI feature schema.
4. Reserve one workspace AI credit atomically.
5. Call the configured NIM model with a timeout and bounded retries.
6. Return only the generated result and safe metadata.
7. Refund the reserved credit if generation fails.

The application does not return sample AI text when generation fails. A failed
provider request is reported as an unavailable operation.

Production AI work still needs a durable usage ledger, plan-entitlement
enforcement, stronger idempotency handling, and staging tests against the
real provider.

Inbox suggestions and contact enrichment use separate code paths. Enrichment
currently has no matching credit reservation and can report zero updates when
provider output cannot be parsed. The campaign draft UI currently reads `result`
while the general AI endpoint returns `text`; draft population needs correction.

## Gmail OAuth

### Required Google configuration

Create a Google Cloud OAuth web application and configure the exact redirect
URI.

Local development:

```text
http://localhost:3000/api/integrations/gmail/callback
```

Production example:

```text
https://your-domain.example/api/integrations/gmail/callback
```

Set:

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/gmail/callback
```

### Flow

1. An authenticated administrator starts the OAuth flow.
2. Gamilo creates a short-lived state value.
3. The state is stored in an HTTP-only cookie.
4. Google redirects back with an authorization code.
5. Gamilo checks the state before exchanging the code.
6. The Gmail profile is read to verify the connected account identity.
7. Access and refresh tokens are encrypted before storage.

OAuth token storage exists, but the SMTP sender currently authenticates using
`user` and `pass`, not OAuth2 access-token/refresh-token authentication. An OAuth
connection alone is therefore not sufficient for campaign SMTP sending. Inbox
sync, reply detection, and push notifications remain incomplete.

## Email campaigns and recipient management

### Connect a sender for local development

1. Open **Dashboard → Channels** and choose Gmail.
2. Use your Gmail address and a Google App Password, where your account supports
   app passwords. Google generally requires two-step verification first; managed
   accounts may restrict availability.
3. Supply the credential through the channel form, not a source file. Persisted
   channel credentials are encrypted using your configured encryption key.
4. Save the channel, then select it when creating a campaign.
5. Test with an address you control before using a larger list.

Saving a channel does not verify the credentials. The current `EMAIL` transport
also uses `smtp.gmail.com:587`; custom SMTP/IMAP values entered in the UI are not
persisted or honored by this transport. There is no implemented inbound IMAP
sync. When the selected channel cannot be resolved, the sender attempts another
active email channel in the same workspace, so check the actual sender account.

### Create a campaign

Open **Dashboard → Email Campaigns** (`/dashboard/campaigns`), click
**New Campaign**, and set:

- **Campaign name:** internal label, 2–100 characters.
- **Sender account:** connected Gmail/email channel.
- **Subject:** 2–250 characters; supports merge variables.
- **Body:** at least 5 characters; supports variables, text alternatives, and links.

Saving creates a draft. Editing changes the stored template used by subsequent
sends and resends; it cannot alter messages already sent.

### Add and review recipients

Use **Manage Recipients → Add Contacts** to paste one address per line or simple
comma-separated rows:

```text
alex@example.test
jordan@example.test, Jordan Lee, Example Company
Taylor Reed, taylor@example.test, Example Organization
```

These are documentation examples, not deliverable test addresses. Replace them
with addresses you control when testing real delivery.

The UI extracts the first email from each line, normalizes it to lowercase, and
deduplicates the pasted input. It accepts `email,name,company` and
`name,email,company` forms. This is a simple comma splitter, not a full quoted-CSV
parser or a file-upload pipeline. The API accepts 1–2,000 recipients per request.

Recipients are unique by campaign and email. Re-importing an existing address
updates its inferred name/company without resetting its send status. The
`addedCount` response counts processed upserts, not only new rows.

Missing names and companies are inferred from address patterns. Treat inferred
values as guesses. **AI Refine Names** sends up to 30 addresses with missing
fields to NVIDIA per request and fills missing values; review those suggestions
before using them in personalized email.

### Templates and previews

| Syntax | Meaning |
|---|---|
| `{{name}}` | Recipient name; fallback is `there` |
| `{{company}}` | Company; fallback is `your team` for missing/generic values |
| `{{email}}` | Recipient email |
| `{Hello|Hi}` | Randomly selects a text alternative for each send |
| `[Website](https://example.com)` | Clickable link in the HTML version |

Example body:

```text
{Hello|Hi} {{name}},

Here is the information requested by {{company}}.
[View details](https://example.com/details)

Thank you
```

The sender creates HTML and plain-text versions. **Preview Variation** uses
sample contact values, not the selected recipient. Text alternatives and send
delays do not guarantee deliverability or bypass provider limits.

### Sending, retries, and removal

| Control | Current behavior |
|---|---|
| **Send Campaign** | Sends only recipients currently marked `PENDING`. |
| Row **Send / Retry / Resend** | Sends to that one recipient regardless of its previous status. |
| **Retry Failed** | Resets `FAILED` recipients to `PENDING` and clears errors. It does **not** send them; click Send Campaign afterward. |
| **Resend All** | After confirmation, sends the current template to every recipient in the campaign, including previously sent contacts. |
| Row trash/remove button | After confirmation, deletes that recipient from this campaign and refreshes the list. |

**Resend All** appears on campaign cards with `totalSent > 0` and in the
recipient modal when at least one loaded recipient is `SENT`. It is independent
of search/status filters: filtering the table does not limit the resend audience.
The server selects all campaign recipients, including any `BOUNCED` records;
there is currently no suppression filter.

Removal is campaign-specific. It does not delete the contact from other
campaigns, recall delivered email, or create a global unsubscribe record.
Deleting a `SENT` or `FAILED` row also reduces its stored campaign counter by one,
clamped at zero. Avoid removal during a send: the dispatch loop uses a previously
loaded recipient list, so removing a row is not guaranteed to cancel an in-flight
email. Re-importing a removed address creates a new pending recipient.

### Status and counter semantics

- `PENDING`: eligible for a normal campaign send.
- `SENT`: the SMTP call resolved successfully; not proof of inbox delivery,
  opening, or reading.
- `FAILED`: SMTP threw an error; the error is stored on the recipient.
- `BOUNCED`: listed in the data model, but automated bounce processing is absent.

A full run marks the campaign `SENDING`, then `COMPLETED` even if some recipients
failed. A top-level exception attempts to mark it `PAUSED`. Inspect the returned
`sent` and `failed` counts, not just `success: true` or the campaign status.

`totalSent` increments on successful sends and resends, so it can exceed the
number of recipients. Modal status tabs count current rows instead. These are
operational counters, not an immutable delivery ledger; deletion and retries
also adjust them.

### Execution limits

Sending runs sequentially inside the API request, with a nominal 500 ms delay
and randomized variation between recipients. Keep the app running during the
request. Large runs can exceed hosting timeouts. Results are written after the
bulk loop returns, so interruption may leave already-sent messages marked
pending. Inspect the sender mailbox before retrying an interrupted run.

Overlapping send/resend requests are not serialized server-side. There is no
durable recovery, automatic deduplication, unsubscribe enforcement, or reliable
delivery-event tracking yet. Use controlled local tests; this workflow is not
yet verified for production bulk delivery.

## API behavior

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/session
```

### Posts

```text
GET    /api/posts
POST   /api/posts
GET    /api/posts/:id
PATCH  /api/posts/:id
DELETE /api/posts/:id
POST   /api/posts/:id/publish
```

Post creation supports `DRAFT` and `SCHEDULED`. A post cannot be marked
`PUBLISHED` through the creation schema. The separate publish route currently
returns `501` and does not mutate the post because no social provider adapter is
implemented. `SCHEDULED` is stored state, not an operational background scheduler.

### Channels

```text
GET    /api/channels
POST   /api/channels
DELETE /api/channels/:id
```

Manual credential submission currently creates active channel records without
provider validation. An active record is not proof of a functioning connection.

### Inbox

```text
GET   /api/inbox/threads
GET   /api/inbox/threads/:id
PATCH /api/inbox/threads/:id
POST  /api/inbox/threads/:id/reply
POST  /api/inbox/threads/:id/ai
```

Thread reads and labels are persisted/scoped where implemented. Inbox AI calls
NVIDIA, and email replies attempt SMTP dispatch. The reply endpoint may still
record success after a send failure; see the implementation limitations above.

### Campaigns

All routes use the current session workspace. Reads require at least `VIEWER`;
campaign mutations, recipient changes, enrichment, and sending require `EDITOR`.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/campaigns` | List campaigns and summary counters |
| `POST` | `/api/campaigns` | Create a draft |
| `GET` | `/api/campaigns/:id` | Read a campaign, recipients, and steps |
| `PATCH` | `/api/campaigns/:id` | Update stored campaign fields |
| `DELETE` | `/api/campaigns/:id` | Delete a campaign and its related records |
| `POST` | `/api/campaigns/:id/recipients` | Import/upsert recipients |
| `PATCH` | `/api/campaigns/:id/recipients` | Reset failed recipients to pending |
| `DELETE` | `/api/campaigns/:id/recipients?recipientId=…` | Remove one recipient |
| `POST` | `/api/campaigns/:id/recipients/ai-enrich` | Infer missing contact fields through NVIDIA |
| `POST` | `/api/campaigns/:id/send` | Dispatch pending, single, or all recipients |

Example campaign creation body:

```json
{
  "name": "Requested product information",
  "subject": "Information for {{company}}",
  "body": "Hello {{name}}, here are the details you requested.",
  "fromChannelId": "<connected-channel-id>"
}
```

Example recipient import body:

```json
{
  "recipients": [
    { "email": "alex@example.test", "name": "Alex", "company": "Example" }
  ]
}
```

Send request modes:

```text
POST /api/campaigns/:id/send
No body                         → pending recipients only
{"recipientId":"<recipient-id>"} → one recipient
{"resendAll":true}               → every recipient in the campaign
```

Do not combine `recipientId` and `resendAll`; the route rejects that combination
with `400`. It currently treats malformed JSON like an empty body, so API callers
must supply valid JSON and `Content-Type: application/json` for explicit modes.

Successful dispatch responses include `success`, `sent`, `failed`, `total`,
`campaign`, and the first result as `result`. A `200` can include failures;
read the counts. Recipient deletion returns a success message or `400` for a
missing ID, `404` for a missing/out-of-workspace resource, or `500` on failure.

These are session-cookie APIs, not a documented bearer-key API. API-key
generation alone does not establish API-key authentication for these routes.

### Other API groups

```text
POST /api/ai/generate
GET  /api/analytics/overview
GET  /api/settings
POST /api/settings
GET  /api/billing/subscription
POST /api/billing/checkout
GET  /api/api-keys
POST /api/api-keys
DELETE /api/api-keys?id=<key-id>
GET  /api/health
GET  /api/integrations/gmail/start
GET  /api/integrations/gmail/callback
```

Authentication normally returns `401` without a valid session and `403` for an
insufficient role. Validation failures usually return `400`; error shapes vary
by route. `/api/health` is a liveness response, not a database/SMTP readiness test.

## Testing and verification

### Available commands

```bash
npm run typecheck           # Next route type generation and TypeScript
npm run dev                 # Local development server
npm start                   # Production server; requires production setup
npm run lint                # ESLint with warnings treated as failures
npm test                    # All Vitest tests
npm run test:unit           # Unit tests only
npm run test:integration    # Route-level integration tests
npm run test:coverage       # Coverage report
npm run test:watch          # Interactive Vitest watch mode
npm run db:generate         # Generate Prisma client
npm run db:validate         # Validate the current Prisma schema
npm run db:push             # Sync local SQLite schema
npm run db:migrate:deploy   # Future reviewed PostgreSQL migration command
npm run build               # Production Next.js build
npm run security:audit      # High/critical production dependency audit
```

### Test coverage areas

Current tests cover:

- Request validation and bounded payloads.
- API key generation and hashing.
- AES-GCM encryption, tampering, and malformed ciphertext.
- Authentication bypass prevention and session hardening.
- Workspace role hierarchy.
- Route-level tenant isolation checks.
- NVIDIA client configuration behavior.
- Prompt construction.
- Retry/error behavior.
- In-memory Posts repository behavior.
- Posts route integration behavior.
- Campaign dispatch (mocked SMTP), resend-all selection, and recipient removal.
- Contact inference, email template formatting, and Gmail integration boundaries.
- Local fixture-backed channels, inbox, settings, analytics, and billing UI
  route behavior.

The current integration suite calls route handlers directly. It is not a
substitute for browser tests, running-server tests, PostgreSQL integration
tests, provider sandbox tests, or staging verification.

### Reproduce verification

Run the commands above against your checked-out revision rather than relying on
a historical test count. Run `npm run db:generate` before checking a fresh clone.
For SQLite validation, set `DATABASE_URL=file:./dev.db` in the shell or `.env`.

For campaign changes, run the focused route tests with:

```bash
npx vitest run tests/unit/campaigns.test.ts
```

Passing mocked tests does not establish SMTP connectivity or recipient delivery.
A controlled manual smoke test should register a local account, create a
campaign, import a mailbox you control, send once, inspect the actual mailbox,
exercise resend/removal, and verify the stored state after a server restart.

## Docker

The Dockerfile uses a multi-stage build and a non-root runtime user. It is
intended for a configured production/staging environment, not for replacing
the local SQLite workflow.

```bash
docker compose build
docker compose up -d
```

The container workflow requires the Docker daemon to be running and requires
runtime environment values to be supplied outside the image.

The current Dockerfile needs a fresh-image verification of Prisma generation,
runtime generated-client files, and build-time model configuration. It does not
run database migrations, provision PostgreSQL, or provide a SQLite data volume.
Treat the commands above as an infrastructure workflow to validate, not a
one-command production deployment.

Important: the current local Prisma datasource is SQLite while the Compose
configuration is written for the future PostgreSQL production path. Do not use
the Compose production workflow as evidence that the PostgreSQL deployment is
ready. Switch and validate the Prisma datasource deliberately before deploying
the container against PostgreSQL.

The image is designed to:

- Install dependencies reproducibly from `package-lock.json`.
- Build in a separate stage.
- Install production dependencies in the runtime image.
- Run as the non-root `nextjs` user.
- Expose port `3000`.
- Provide `/api/health` for health checks.

## Future Supabase/PostgreSQL move

The local development path intentionally remains SQLite for now. When moving
to Supabase or another managed PostgreSQL service:

1. Provision a separate staging database.
2. Review the final Prisma datasource and migration files.
3. Configure `DATABASE_URL` for runtime pooling.
4. Configure `DIRECT_URL` for migration operations.
5. Run `npm run db:validate` with the PostgreSQL configuration.
6. Run `npm run db:generate`.
7. Apply migrations in staging with `npm run db:migrate:deploy`.
8. Run authentication, tenant-isolation, post, channel, and session checks.
9. Create or migrate users in the cloud database. Local SQLite users do not
   appear automatically in Supabase.
10. Configure backups, restore testing, monitoring, alerts, and rollback.

Never run a PostgreSQL migration against `prisma/dev.db`. Never place a
database password in `.env.example`, source control, Docker images, or chat.

Schema migration creates tables; it does not transfer SQLite records. A data
transfer needs an explicit export/import preserving IDs, memberships, and
relations, followed by count and integrity checks. Provider credentials remain
encrypted with the original encryption key; securely retain that key or plan a
deliberate re-encryption/reconnection procedure.

## Backup and recovery

### Local SQLite

Before schema changes, stop the development server and any process writing to
the database. Back up `prisma/dev.db` to a private location outside Git. For an
online database, use SQLite's backup facility rather than copying a live file;
WAL/journal files can contain uncheckpointed writes.

Back up the encryption key separately in a secure location. A database copy
alone cannot recover encrypted provider credentials without the matching key.
To rehearse recovery, restore into a separate local database, point a development
process at it, and verify login, membership, campaign recipients, and counts
without sending emails. Preserve the original backup before attempting repairs.

`launch.bat` always selects `prisma/dev.db`. To use a separate restored file,
run the development server directly with the intended `DATABASE_URL`.

### Future managed PostgreSQL

Configure provider backups and point-in-time recovery where available, agree on
acceptable data-loss/recovery windows, and rehearse restoration into staging.
Before each release, record the application revision and migration state.
Rollback may require a compatible application version or a forward repair;
Prisma migrations do not automatically provide safe down-migrations.

## Production checklist

### Infrastructure

- [ ] Provision managed PostgreSQL.
- [ ] Review and apply migrations in staging.
- [ ] Configure backups and test restoration.
- [ ] Configure HTTPS and secure cookies.
- [ ] Configure a shared rate limiter.
- [ ] Configure durable job/worker infrastructure.
- [ ] Configure monitoring, metrics, error tracking, and alerts.
- [ ] Define deployment rollback and incident-response procedures.

### Security

- [ ] Set unique production `APP_SECRET` and `TOKEN_ENCRYPTION_KEY` values in
      a secret manager.
- [ ] Verify all protected routes and resource queries are workspace-scoped.
- [ ] Add multi-workspace selection before supporting users in multiple
      workspaces.
- [ ] Run cross-tenant access tests against PostgreSQL.
- [ ] Rotate any credential that was ever exposed.
- [ ] Verify no secrets appear in logs, API responses, browser bundles, or
      generated artifacts.

### Integrations

- [ ] Verify NVIDIA NIM access, model approvals, quotas, and spend limits.
- [ ] Complete Google OAuth review where required.
- [ ] Implement and sandbox-test social publishing adapters.
- [ ] Implement token refresh, revocation, rate-limit, and reconciliation
      behavior.
- [ ] Implement Gmail synchronization and reply delivery.
- [ ] Implement billing checkout and signed idempotent webhooks.
- [ ] Replace unavailable publication and billing paths with provider-confirmed
      operations and signed payment/webhook flows.
- [x] Make SMTP credential decryption and reply-delivery errors fail closed for
      the currently supported email path.
- [ ] Add campaign send locking, idempotency, durable recovery, suppression lists,
      unsubscribe handling, and bounce/delivery-event processing.

### Release validation

- [ ] `npm ci`
- [ ] `npm run db:generate`
- [ ] `npm run db:validate`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run security:audit`
- [ ] Staging smoke test with real configured services.
- [ ] Backup and restore drill completed.

## Troubleshooting

### Launcher says `DATABASE_URL must be a PostgreSQL URL`

That message belongs to an older cloud-oriented launcher configuration. The
current local launcher should force SQLite. If it appears, verify that the
working directory is the repository root and that `launch.bat` contains:

```bat
set "DATABASE_URL=file:./dev.db"
set "NODE_ENV=development"
```

### Prisma validation fails with a PostgreSQL URL locally

The local workflow expects SQLite. Use:

```env
DATABASE_URL="file:./dev.db"
```

Then run:

```bash
npm run db:generate
npm run db:validate
npm run db:push
```

### Login fails with a generic `Login failed`

Use the browser Network panel to distinguish responses from `/api/auth/login`:

- `500` with `Login failed`: an exception, such as database connectivity, schema
  mismatch, or invalid runtime configuration. The route currently hides the
  underlying error and does not log it, so independently validate configuration
  and database access.
- `401` with `Invalid email or password`: unknown account or incorrect password.
- `403` with `No workspace membership found`: account lacks membership.

Restart a server launched with old cloud settings. `launch.bat` applies a local
SQLite override; `npm run dev` uses your actual shell/`.env` settings.

Local SQLite accounts and future cloud PostgreSQL accounts are separate data.

### AI generation fails

Check that:

- `NVIDIA_API_KEY` is configured.
- `NVIDIA_PRIMARY_MODEL` is configured.
- The configured base URL is reachable.
- The workspace has available AI credits.
- The request passes the AI schema limits.

The app intentionally returns an error instead of sample output when the
provider is unavailable.

### Resend All is missing or does nothing

The campaign card shows it only when `totalSent > 0`; the recipient modal shows
it when a loaded row is `SENT`. Refresh/reopen the list after a send. If every
recipient failed, use **Retry Failed**, then **Send Campaign**. A stale modal
summary can also prevent the handler from proceeding; close and reopen it from
the refreshed campaign card.

### Retry Failed did not send anything

It only resets failed rows to pending. Send the campaign afterward, or use a
row's **Retry** action to dispatch immediately.

### SMTP authentication fails

Check the selected channel address, app-password availability, and the current
Google App Password. An ordinary account password or OAuth access token is not
the app password expected by the current SMTP transport. A channel being marked
active does not mean authentication has been verified. Retain the original
encryption key when reusing a local database with stored credentials.

### Send succeeded but the recipient did not receive the email

SMTP acceptance is not inbox delivery. Check the sender mailbox, recipient spam
folder, provider quota, and any bounce received by the sender. The app does not
track those events automatically. A disconnected browser or request timeout is
ambiguous: inspect the mailbox and persisted state before resending.

### Removing a recipient did not stop an email

Removal deletes the list row, not an already delivered or in-flight message. A
running send may already have loaded that recipient. Manage the list before
starting dispatch; send cancellation is not implemented.

### Local schema sync warns about possible data loss

Stop and back up the database, inspect the proposed constraint/schema change,
and resolve incompatible records before proceeding. The launcher does not
automatically accept Prisma's data-loss warnings. Do not delete `prisma/dev.db`
as a routine fix: that removes local accounts, channels, and campaigns.

### Docker cannot start

Check that:

- Docker Desktop is running.
- Required environment variables are available to Compose.
- The configured database is reachable from the container.
- The container's Prisma datasource matches the database provider.

## Contributing

Before submitting a change:

1. Read the current implementation and its callers.
2. Keep route contracts and persisted data formats compatible unless a migration
   is explicitly planned.
3. Put feature-specific schemas, types, repositories, and mappers under the
   owning `src/features/<feature>/` directory.
4. Keep test fixtures under `src/features/testing/` or test setup files.
5. Do not add fake provider success responses.
6. Add focused tests for changed behavior and security boundaries.
7. Run the relevant checks, then the full baseline before reporting success.
8. Never commit `.env`, credentials, database files, generated secrets, or
   private customer data.

## License and third-party services

`private: true` in `package.json` prevents accidental npm publishing; it does
not grant a software license. Check the repository's license terms before reuse.

Review licenses, terms, quotas, consent requirements, and application-review
requirements for every package and external provider used by a deployment.
Google, NVIDIA, Meta, TikTok, YouTube, WhatsApp, Supabase, and payment
providers each impose separate operational and compliance requirements.
