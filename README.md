# Gamilo

Gamilo is a Next.js and Prisma foundation for a multi-tenant marketing workspace that brings together social publishing, a unified inbox, AI-assisted writing, analytics, connected channels, and billing workflows.

> **Release status:** Gamilo is an active engineering build, not a fully verified production SaaS yet. This repository now fails closed for missing production secrets, uses secure session cookies for database-backed accounts, adds Gmail OAuth connection support, protects API routes outside test mode, removes credential leakage from API responses, and includes reproducible build checks. Social publishing, inbox delivery/synchronization, billing, durable background jobs, and full database-backed business repositories still require provider implementations and staging verification before a production launch.

## What is implemented

- Next.js App Router UI with dashboard pages for posts, calendar, inbox, channels, analytics, AI Studio, settings, and billing.
- Prisma schema for users, workspaces, sessions, channels, posts, inbox threads, subscriptions, API keys, and audit logs.
- Password hashing with bcrypt for non-test registration and login.
- Database-backed session records with expiring, HttpOnly, SameSite cookies.
- Logout endpoint that revokes the current session.
- Production configuration validation for secrets and AI configuration.
- AES-256-GCM encryption for provider credentials at rest.
- Gmail OAuth start/callback flow with encrypted access and refresh token storage.
- API authentication boundary outside `NODE_ENV=test`.
- Bounded Zod request validation and explicit update allowlists.
- Provider credentials are never returned in channel API responses.
- NVIDIA NIM client with configured models, request timeout, bounded retry behavior, and safe public errors.
- Security response headers, Docker non-root runtime, production-only dependencies, and a health endpoint.
- Vitest unit and integration coverage for the existing application behavior.

## Known production blockers

These are intentionally documented instead of being represented as working features:

1. Several business routes still use the original in-memory demo store in development/test paths. They must be migrated to Prisma repositories before running multiple production instances.
2. Social publishing and inbox replies are not yet connected to Meta, TikTok, YouTube, WhatsApp, or Gmail message delivery/synchronization APIs.
3. Billing checkout is not connected to a payment provider or signed webhook lifecycle.
4. Scheduled publishing and campaigns need a durable queue/worker implementation.
5. A PostgreSQL deployment, Prisma migrations, backups, and restore drills are required for production.
6. The dependency audit must be resolved by a planned Next.js upgrade and regression run; do not use `npm audit fix --force` blindly.

Do not claim an external post, message, payment, or campaign was completed until the provider confirms it and the result is persisted.

## Technology

- Node.js 20.19.0 (`.nvmrc`)
- Next.js 14 App Router
- React 18
- TypeScript in strict mode
- Prisma 5
- SQLite for local development; PostgreSQL is recommended for production
- Tailwind CSS
- Vitest
- Docker / Docker Compose

## Requirements

- Node.js 20.19.0 or a compatible Node 20 release
- npm 10+
- A database URL supported by Prisma
- NVIDIA NIM credentials for AI features
- Google Cloud OAuth credentials for real Gmail connection
- Docker Desktop only if using the container workflow

## Local setup

```bash
git clone https://github.com/mohd98zaid/gamilo.git
cd gamilo
npm ci
copy .env.example .env
```

On macOS/Linux, use `cp .env.example .env` instead of `copy`.

Generate local secrets. Never commit `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put two different generated values into `APP_SECRET` and `TOKEN_ENCRYPTION_KEY`.

Generate Prisma client and create the local database:

```bash
npm run db:generate
npm run db:validate
npm run db:push
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

See `.env.example` for the complete template. Important values:

| Variable | Required | Purpose |
|---|---:|---|
| `NODE_ENV` | yes | `development`, `test`, or `production` |
| `DATABASE_URL` | yes | Prisma database connection |
| `APP_SECRET` | production | 64-character hexadecimal application secret |
| `TOKEN_ENCRYPTION_KEY` | production | 64-character hexadecimal AES-256 key |
| `NVIDIA_API_KEY` | AI features | NVIDIA NIM API credential |
| `NVIDIA_PRIMARY_MODEL` | AI features | Approved primary model name |
| `NVIDIA_FALLBACK_MODEL` | optional | Explicitly approved fallback model |
| `GOOGLE_CLIENT_ID` | Gmail OAuth | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Gmail OAuth | Google OAuth client secret; inject at runtime |
| `GOOGLE_REDIRECT_URI` | Gmail OAuth | Exact callback URL configured in Google Cloud |
| `COOKIE_SECURE` | production | Use `true` behind HTTPS |

Production startup must fail when required secrets are absent or malformed. Do not add fallback values to source code.

## Connecting Gmail / Google Workspace

Gamilo uses Gmail OAuth for the real Gmail connection flow. Do not paste a Gmail password or OAuth secret into source code, Git, a ticket, or chat.

### 1. Create a Google Cloud project

1. Open Google Cloud Console.
2. Create or select a project.
3. Enable the Gmail API and Google People/Userinfo APIs if Google requests them.
4. Configure the OAuth consent screen.
5. Add the authorized test users while the app is in testing mode.

### 2. Create OAuth credentials

Create an **OAuth client ID** for a web application.

For local development, add this exact authorized redirect URI:

```text
http://localhost:3000/api/integrations/gmail/callback
```

For deployment, use your HTTPS domain:

```text
https://your-domain.example/api/integrations/gmail/callback
```

Set the values in `.env`:

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/gmail/callback
```

Restart the server after changing environment variables.

### 3. Connect the account in Gamilo

1. Register or sign in at `/register` or `/login`.
2. Open **Dashboard → Channels**.
3. Choose **Gmail / Google Workspace**.
4. Continue to Google and approve the requested Gmail permissions.
5. Google redirects back to Gamilo after authorization.
6. Gamilo encrypts the access and refresh tokens before storing them.

If the callback reports that OAuth is not configured, check the three Google variables and make sure the redirect URI matches exactly, including protocol, host, port, path, and trailing slash behavior.

### Important Gmail limitation

The OAuth connection and encrypted token storage are implemented. Gmail send, inbox synchronization, reply detection, push notifications, and campaign delivery still need their provider adapters and durable worker jobs before they should be enabled for real customer operations.

## Available commands

```bash
npm run dev                 # local development server
npm run build               # production build
npm start                   # run the production build
npm run typecheck           # TypeScript validation
npm run lint                # ESLint with warnings treated as failures
npm test                    # all Vitest tests
npm run test:unit           # unit tests only
npm run test:integration    # integration tests only
npm run test:coverage       # coverage report
npm run db:generate        # generate Prisma client
npm run db:validate        # validate Prisma schema
npm run db:push            # local schema push; prefer migrations in production
npm run security:audit     # high/critical dependency audit
```

## Docker

The image runs as the non-root `nextjs` user, installs production dependencies only in the final stage, and exposes `/api/health` for container health checks.

```bash
docker compose build
docker compose up -d
```

The Docker daemon must be running. Inject secrets through the deployment environment or a secret manager. Do not copy `.env` into an image or commit it.

For production, replace the local SQLite default with a managed PostgreSQL `DATABASE_URL`, run reviewed Prisma migrations, configure HTTPS, and store application secrets outside the container image.

## Production deployment checklist

- [ ] Use a managed PostgreSQL database.
- [ ] Add and review Prisma migrations; run `prisma migrate deploy` during release.
- [ ] Set unique `APP_SECRET` and `TOKEN_ENCRYPTION_KEY` values through a secret manager.
- [ ] Configure `COOKIE_SECURE=true` and HTTPS.
- [ ] Configure `GOOGLE_*` OAuth variables and complete Google verification if required.
- [ ] Configure NVIDIA NIM with an approved model and spending limits.
- [ ] Implement and test provider adapters before enabling social, inbox, or campaign actions.
- [ ] Implement billing provider webhooks and idempotent entitlement updates.
- [ ] Add a durable queue/worker for scheduled jobs and retries.
- [ ] Configure backups, restore testing, logs, metrics, error tracking, and alerting.
- [ ] Run the full checks listed below in CI and staging.
- [ ] Run a dependency audit and resolve all release-blocking findings.
- [ ] Rotate any credentials that were ever exposed in local files or previous artifacts.

## Security notes

- `.env` and local database files are ignored by Git.
- Provider credentials are encrypted before storage and omitted from channel responses.
- Production secret validation has no public fallback values.
- API request schemas are strict and bounded.
- API routes require a valid database-backed session outside test mode.
- Test-only demo behavior is isolated behind `NODE_ENV=test` and must not be enabled in production.

## Verification baseline

Run these commands from the repository root:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run security:audit
```

The first four commands are local deterministic checks. The security audit depends on the current dependency advisories and must be treated as a release gate. A passing build does not prove that external provider integrations, payments, queues, or production database operations are live.

## Repository structure

```text
src/app/              Next.js pages and API routes
src/lib/              configuration, auth, encryption, AI, validation, and utilities
prisma/schema.prisma  database schema
tests/unit/            unit tests
tests/integration/     route-level integration tests
Dockerfile             production container build
docker-compose.yml     local container orchestration
```

## License and third-party services

Review the licenses and terms for every third-party package and provider used by your deployment. Google, NVIDIA, Meta, TikTok, YouTube, WhatsApp, and payment providers each impose separate API, consent, quota, and application-review requirements.
