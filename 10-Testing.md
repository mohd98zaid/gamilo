# Testing.md — Testing Strategy & Implementation Guide

## 1. Testing Pyramid

```mermaid
flowchart TD
    E2E["E2E Tests (Playwright)<br/>~20 tests · 10 min<br/>Critical user flows"]
    INT["Integration Tests<br/>~100 tests · 3 min<br/>API routes + DB + services"]
    UNIT["Unit Tests (Vitest)<br/>~300 tests · 30 sec<br/>Pure functions, utilities, validation"]
    
    style E2E fill:#f59e0b,color:#000
    style INT fill:#3b82f6,color:#fff
    style UNIT fill:#10b981,color:#fff
    
    E2E --> INT --> UNIT
```

| Layer | Tool | Coverage Target | Run When |
|---|---|---|---|
| **Unit** | Vitest | 80%+ | Every commit |
| **Integration** | Vitest + Prisma (test DB) | 70%+ | Every PR |
| **E2E** | Playwright | Critical paths | Pre-deploy |
| **Performance** | k6 | Baselines defined | Weekly |
| **Security** | npm audit + custom checks | 0 critical | Every PR |

---

## 2. Project Test Structure

```
tests/
├── unit/
│   ├── lib/
│   │   ├── encryption.test.ts
│   │   ├── rate-limiter.test.ts
│   │   ├── credit-calculator.test.ts
│   │   └── validators.test.ts
│   ├── services/
│   │   ├── social/
│   │   │   ├── caption-generator.test.ts
│   │   │   ├── post-scheduler.test.ts
│   │   │   └── platform-adapter.test.ts
│   │   ├── email/
│   │   │   ├── template-renderer.test.ts
│   │   │   └── sequence-engine.test.ts
│   │   └── ai/
│   │       ├── prompt-builder.test.ts
│   │       └── credit-deduction.test.ts
│   └── components/
│       ├── Calendar.test.tsx
│       ├── PostForm.test.tsx
│       └── InboxThread.test.tsx
│
├── integration/
│   ├── api/
│   │   ├── auth.test.ts
│   │   ├── posts.test.ts
│   │   ├── channels.test.ts
│   │   ├── inbox.test.ts
│   │   ├── campaigns.test.ts
│   │   ├── billing.test.ts
│   │   └── api-keys.test.ts
│   ├── services/
│   │   ├── publishing-pipeline.test.ts
│   │   ├── webhook-processing.test.ts
│   │   └── automation-engine.test.ts
│   └── setup/
│       ├── test-db.ts
│       ├── factories.ts
│       └── mocks.ts
│
├── e2e/
│   ├── auth.spec.ts
│   ├── social-publishing.spec.ts
│   ├── inbox.spec.ts
│   ├── billing.spec.ts
│   └── fixtures/
│       ├── auth.fixture.ts
│       └── workspace.fixture.ts
│
├── performance/
│   ├── api-load.k6.ts
│   ├── publishing-throughput.k6.ts
│   └── inbox-search.k6.ts
│
└── vitest.config.ts
```

---

## 3. Unit Tests

### Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules', 'tests', '*.config.*'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
    setupFiles: ['tests/unit/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

### Example Unit Tests

```typescript
// tests/unit/lib/encryption.test.ts
import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '@/lib/encryption';

describe('Token Encryption', () => {
  it('encrypts and decrypts a string correctly', () => {
    const plaintext = 'ya29.access_token_here';
    const encrypted = encrypt(plaintext);
    
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted).toContain(':'); // iv:tag:data format
    expect(decrypt(encrypted)).toBe(plaintext);
  });
  
  it('produces different ciphertexts for the same input', () => {
    const plaintext = 'same_token';
    const encrypted1 = encrypt(plaintext);
    const encrypted2 = encrypt(plaintext);
    
    expect(encrypted1).not.toBe(encrypted2); // Random IV
  });
  
  it('throws on tampered ciphertext', () => {
    const encrypted = encrypt('test');
    const tampered = encrypted.slice(0, -1) + 'X';
    
    expect(() => decrypt(tampered)).toThrow();
  });
});

// tests/unit/lib/credit-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { getCreditCost } from '@/lib/credits';

describe('Credit Calculator', () => {
  it.each([
    ['draft_reply', 1],
    ['generate_caption', 1],
    ['assistant_action', 2],
    ['lead_search', 2],
    ['generate_image', 5],
    ['generate_video', 10],
  ])('returns %i credits for %s action', (action, expected) => {
    expect(getCreditCost(action)).toBe(expected);
  });
  
  it('throws for unknown action type', () => {
    expect(() => getCreditCost('unknown_action')).toThrow('Unknown AI action');
  });
});

// tests/unit/lib/validators.test.ts
import { describe, it, expect } from 'vitest';
import { createPostSchema } from '@/lib/validators';

describe('Post Validation', () => {
  it('rejects caption exceeding 2200 chars', () => {
    const result = createPostSchema.safeParse({
      caption: 'a'.repeat(2201),
      channelIds: ['cuid_123'],
    });
    
    expect(result.success).toBe(false);
  });
  
  it('rejects scheduledAt in the past', () => {
    const result = createPostSchema.safeParse({
      caption: 'Hello world',
      channelIds: ['cuid_123'],
      scheduledAt: '2020-01-01T00:00:00Z',
    });
    
    expect(result.success).toBe(false);
  });
  
  it('strips HTML from caption', () => {
    const result = createPostSchema.safeParse({
      caption: '<script>alert("xss")</script>Hello',
      channelIds: ['cuid_123'],
    });
    
    expect(result.success).toBe(true);
    expect(result.data!.caption).toBe('Hello');
  });
});
```

---

## 4. Integration Tests

### Database Setup

```typescript
// tests/integration/setup/test-db.ts
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL!;

export const prisma = new PrismaClient({
  datasources: { db: { url: TEST_DATABASE_URL } },
});

export async function resetDatabase() {
  // Truncate all tables in correct order
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;
  
  for (const { tablename } of tables) {
    if (tablename !== '_prisma_migrations') {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE`);
    }
  }
}

// beforeEach hook
beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

### Test Data Factories

```typescript
// tests/integration/setup/factories.ts
import { faker } from '@faker-js/faker';
import { prisma } from './test-db';

export async function createUser(overrides = {}) {
  return prisma.user.create({
    data: {
      email: faker.internet.email(),
      name: faker.person.fullName(),
      passwordHash: '$2b$12$hash', // Pre-computed bcrypt hash for "password123"
      ...overrides,
    },
  });
}

export async function createWorkspace(userId: string, overrides = {}) {
  const workspace = await prisma.workspace.create({
    data: {
      name: faker.company.name(),
      slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      aiCredits: 100,
      ...overrides,
    },
  });
  
  await prisma.workspaceMember.create({
    data: {
      workspaceId: workspace.id,
      userId,
      role: 'OWNER',
    },
  });
  
  return workspace;
}

export async function createChannel(workspaceId: string, overrides = {}) {
  return prisma.channel.create({
    data: {
      workspaceId,
      platform: 'INSTAGRAM',
      platformAccountId: faker.string.numeric(15),
      name: `@${faker.internet.username()}`,
      accessToken: 'encrypted_test_token',
      ...overrides,
    },
  });
}

export async function createPost(workspaceId: string, overrides = {}) {
  return prisma.post.create({
    data: {
      workspaceId,
      caption: faker.lorem.sentence(),
      status: 'DRAFT',
      ...overrides,
    },
  });
}
```

### API Integration Tests

```typescript
// tests/integration/api/posts.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '@/app';
import { createUser, createWorkspace, createChannel, createPost } from '../setup/factories';
import { getAuthToken } from '../setup/auth-helper';

describe('POST /api/v1/posts', () => {
  let authToken: string;
  let workspaceId: string;
  let channelId: string;
  
  beforeEach(async () => {
    const user = await createUser();
    const workspace = await createWorkspace(user.id);
    const channel = await createChannel(workspace.id);
    
    workspaceId = workspace.id;
    channelId = channel.id;
    authToken = await getAuthToken(user.id);
  });
  
  it('creates a draft post', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/posts',
      headers: { Authorization: `Bearer ${authToken}` },
      body: {
        caption: 'Hello world! #test',
        channelIds: [channelId],
      },
    });
    
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeDefined();
    expect(body.status).toBe('DRAFT');
    expect(body.caption).toBe('Hello world! #test');
  });
  
  it('creates a scheduled post', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/posts',
      headers: { Authorization: `Bearer ${authToken}` },
      body: {
        caption: 'Scheduled post',
        channelIds: [channelId],
        scheduledAt: futureDate,
      },
    });
    
    expect(res.statusCode).toBe(201);
    expect(res.json().status).toBe('SCHEDULED');
  });
  
  it('rejects empty caption', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/posts',
      headers: { Authorization: `Bearer ${authToken}` },
      body: { caption: '', channelIds: [channelId] },
    });
    
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });
  
  it('rejects without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/posts',
      body: { caption: 'No auth', channelIds: [channelId] },
    });
    
    expect(res.statusCode).toBe(401);
  });
  
  it('enforces plan channel limits', async () => {
    // Create 6 channels (Starter limit)
    for (let i = 0; i < 6; i++) {
      await createChannel(workspaceId);
    }
    
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/channels/connect/meta',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    
    expect(res.statusCode).toBe(402);
    expect(res.json().error.code).toBe('PLAN_LIMIT_EXCEEDED');
  });
});
```

---

## 5. External Service Mocking (MSW)

```typescript
// tests/integration/setup/mocks.ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const mockServer = setupServer(
  // Meta Graph API
  http.post('https://graph.facebook.com/v20.0/:accountId/media', () => {
    return HttpResponse.json({ id: 'mock_container_123' });
  }),
  
  http.post('https://graph.facebook.com/v20.0/:accountId/media_publish', () => {
    return HttpResponse.json({ id: 'mock_post_456' });
  }),
  
  // OpenAI
  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({
      choices: [{ message: { content: 'AI-generated caption here' } }],
      usage: { total_tokens: 150 },
    });
  }),
  
  // Stripe
  http.post('https://api.stripe.com/v1/checkout/sessions', () => {
    return HttpResponse.json({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/test',
    });
  }),
);

// Setup in vitest
beforeAll(() => mockServer.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => mockServer.resetHandlers());
afterAll(() => mockServer.close());
```

---

## 6. E2E Tests (Playwright)

```typescript
// tests/e2e/social-publishing.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsTestUser, createTestWorkspace } from './fixtures/auth.fixture';

test.describe('Social Publishing Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });
  
  test('creates and schedules a post', async ({ page }) => {
    // Navigate to post creation
    await page.goto('/dashboard/posts/new');
    
    // Fill caption
    await page.fill('[data-testid="caption-input"]', 'E2E test post #testing');
    
    // Upload an image
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/e2e/fixtures/test-image.jpg');
    await expect(page.locator('[data-testid="media-preview"]')).toBeVisible();
    
    // Select a channel
    await page.click('[data-testid="channel-select-instagram"]');
    
    // Set schedule
    await page.click('[data-testid="schedule-toggle"]');
    await page.fill('[data-testid="schedule-datetime"]', '2026-12-25T10:00');
    
    // Submit
    await page.click('[data-testid="create-post-btn"]');
    
    // Verify redirect to calendar
    await expect(page).toHaveURL(/\/dashboard\/calendar/);
    
    // Verify post appears on calendar
    await expect(page.locator('[data-testid="calendar-post"]')).toContainText('E2E test post');
  });
  
  test('publishes a post immediately', async ({ page }) => {
    await page.goto('/dashboard/posts/new');
    await page.fill('[data-testid="caption-input"]', 'Publish now test');
    await page.click('[data-testid="channel-select-instagram"]');
    await page.click('[data-testid="publish-now-btn"]');
    
    // Verify success toast
    await expect(page.locator('[data-testid="toast"]')).toContainText('Published');
  });
});
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
  retries: 2,
  workers: 2,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'mobile', use: { ...devices['iPhone 14'] } },
  ],
});
```

---

## 7. Performance Tests (k6)

```javascript
// tests/performance/api-load.k6.ts
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up
    { duration: '1m', target: 50 },    // Sustained load
    { duration: '30s', target: 100 },  // Peak
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

const API_KEY = __ENV.TEST_API_KEY;
const BASE_URL = __ENV.BASE_URL || 'https://api-staging.automyc.com';

export default function () {
  // List posts
  const postsRes = http.get(`${BASE_URL}/api/v1/posts`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  check(postsRes, { 'posts 200': (r) => r.status === 200 });
  
  // List inbox threads
  const inboxRes = http.get(`${BASE_URL}/api/v1/inbox/threads`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  check(inboxRes, { 'inbox 200': (r) => r.status === 200 });
  
  sleep(1);
}
```

---

## 8. CI Pipeline

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc' }
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v4

  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
      redis:
        image: redis:7
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc' }
      - run: npm ci
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
      - run: npm run test:integration
        env:
          TEST_DATABASE_URL: postgresql://test:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379

  e2e:
    runs-on: ubuntu-latest
    needs: [unit, integration]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc' }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

---

## 9. Test Commands

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:coverage": "vitest run --coverage",
    "test:perf": "k6 run tests/performance/api-load.k6.ts",
    "test:watch": "vitest --watch"
  }
}
```
