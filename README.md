# Gamilo

Gamilo is a multi-tenant marketing workspace built with Next.js, React,
TypeScript, Prisma, and Vitest. The application provides the foundation for
AI-assisted content creation, workspace-scoped marketing data, connected
channels, scheduled posts, analytics, inbox workflows, and subscription
management.

> **Project status:** Gamilo is an active engineering build. It is not yet a
> fully verified production SaaS. Unsupported provider operations intentionally
> return an explicit unavailable response instead of pretending that a post,
> message, payment, or campaign succeeded.

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
- [API behavior](#api-behavior)
- [Testing and verification](#testing-and-verification)
- [Docker](#docker)
- [Future Supabase/PostgreSQL move](#future-supabasepostgresql-move)
- [Production checklist](#production-checklist)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## What exists today

### Application and dashboard

- Next.js App Router marketing pages and authenticated dashboard pages.
- Dashboard areas for overview, calendar, posts, channels, inbox, analytics,
  AI Studio, settings, and billing.
- Shared dashboard navigation through `DashboardSidebar` and
  `DashboardTopbar`.
- Honest empty, unavailable, and failure states instead of production-facing
  demo records.

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
- Scheduled posts.
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

The following routes intentionally return `501 Not Implemented` for persisted
workspaces until real adapters exist:

- `POST /api/posts/:id/publish`
- `POST /api/inbox/threads/:id/reply`
- `POST /api/inbox/threads/:id/ai`
- `POST /api/billing/checkout`
- Manual persisted channel credential creation outside a verified provider flow

Do not advertise these operations as live until a provider response is
confirmed and persisted.

## Technology

| Area | Current choice |
|---|---|
| Runtime | Node.js 20+ |
| Web framework | Next.js 16 App Router |
| UI | React 19, Tailwind CSS, lucide-react |
| Language | TypeScript with strict mode |
| ORM | Prisma 5 |
| Local database | SQLite at `prisma/dev.db` |
| Cloud database target | PostgreSQL, planned for staging/production |
| AI provider | NVIDIA NIM |
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
    ├── encryption.ts        AES-256-GCM credential encryption
    ├── errors.ts            Error taxonomy and retry helper
    ├── prisma.ts            Prisma singleton
    ├── rate-limiter.ts      Local sliding-window limiter
    └── utils.ts             Shared UI/date utilities

prisma/
├── schema.prisma            Current local SQLite Prisma schema
├── dev.db                   Ignored local development database
└── migrations/               Reviewable future PostgreSQL migration artifacts

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

## Local development

### Prerequisites

- Node.js 20 or newer.
- npm 10 or newer.
- Git.
- Docker Desktop only if you want to use the container workflow.

### Clone and install

```bash
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

## Environment variables

The complete template is in `.env.example`.

| Variable | Local | Staging/production | Purpose |
|---|---:|---:|---|
| `NODE_ENV` | yes | yes | `development`, `test`, or `production` |
| `DATABASE_URL` | yes | yes | SQLite locally; PostgreSQL after the cloud move |
| `APP_SECRET` | recommended | required | Session/application secret; 64 hex characters in production |
| `TOKEN_ENCRYPTION_KEY` | recommended | required | AES-256 credential-encryption key; 64 hex characters in production |
| `NVIDIA_API_KEY` | optional | required for AI | NVIDIA NIM API credential |
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

The repository contains reviewable PostgreSQL migration artifacts under:

```text
prisma/migrations/
```

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

## AI generation

AI generation is configured through NVIDIA NIM settings. The request flow is:

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

The OAuth connection and encrypted token storage exist. Gmail inbox sync,
message send, reply detection, push notifications, and campaign delivery are
not yet complete.

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
`PUBLISHED` merely by submitting a request. Publication requires a real
provider adapter and confirmed provider result.

### Channels

```text
GET    /api/channels
POST   /api/channels
DELETE /api/channels/:id
```

Persisted production channel connections must use a verified provider OAuth
flow. Arbitrary submitted credentials are not treated as proof of a working
connection.

### Inbox

```text
GET   /api/inbox/threads
GET   /api/inbox/threads/:id
PATCH /api/inbox/threads/:id
POST  /api/inbox/threads/:id/reply
POST  /api/inbox/threads/:id/ai
```

Thread reads and labels are persisted/scoped where implemented. Delivery and
persisted inbox AI routes remain unavailable until their adapters exist.

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
```

## Testing and verification

### Available commands

```bash
npm run typecheck           # Next route type generation and TypeScript
npm run lint                # ESLint with warnings treated as failures
npm test                    # All Vitest tests
npm run test:unit           # Unit tests only
npm run test:integration    # Route-level integration tests
npm run test:coverage       # Coverage report
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
- Local fixture-backed channels, inbox, settings, analytics, and billing UI
  route behavior.

The current integration suite calls route handlers directly. It is not a
substitute for browser tests, running-server tests, PostgreSQL integration
tests, provider sandbox tests, or staging verification.

### Last verified local baseline

The latest refactor verification completed with:

```text
TypeScript: passed
ESLint: passed with zero warnings/errors
Vitest: 11 files, 55 tests passed
Next.js production build: passed
Prisma SQLite schema validation: passed
```

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

Check the server output. Common causes are:

- The database URL points to an unreachable database.
- The user does not exist in the selected database.
- The password is incorrect.
- The user has no workspace membership.
- Prisma schema and database are out of sync.

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

Review licenses, terms, quotas, consent requirements, and application-review
requirements for every package and external provider used by a deployment.
Google, NVIDIA, Meta, TikTok, YouTube, WhatsApp, Supabase, and payment
providers each impose separate operational and compliance requirements.
