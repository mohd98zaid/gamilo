import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireApiAuth: vi.fn(),
  prisma: {
    campaign: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    campaignRecipient: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
    post: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    postMetric: {
      create: vi.fn(),
    },
    subscription: {
      upsert: vi.fn(),
    },
    workspace: {
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/api-auth', () => ({ requireApiAuth: mocks.requireApiAuth }));
vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('@/lib/email/sender', () => ({
  sendBulkEmails: vi.fn().mockResolvedValue({
    total: 2,
    sent: 2,
    failed: 0,
    results: [
      { email: 'a@test.com', success: true },
      { email: 'b@test.com', success: true },
    ],
  }),
}));

import { GET as getCampaigns, POST as createCampaign } from '@/app/api/campaigns/route';
import { POST as addRecipients, PATCH as retryRecipients } from '@/app/api/campaigns/[id]/recipients/route';
import { POST as sendCampaign } from '@/app/api/campaigns/[id]/send/route';
import { POST as publishPost } from '@/app/api/posts/[id]/publish/route';
import { POST as checkoutBilling } from '@/app/api/billing/checkout/route';

const adminUser = {
  id: 'admin-1',
  email: 'admin@example.test',
  name: 'Admin User',
  workspaceId: 'workspace-main',
  role: 'ADMIN',
  workspace: { id: 'workspace-main', name: 'Main Workspace' },
};

describe('Campaigns & Publishing & Billing Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireApiAuth.mockResolvedValue(adminUser);
  });

  it('lists campaigns for workspace', async () => {
    mocks.prisma.campaign.findMany.mockResolvedValue([
      {
        id: 'camp-1',
        name: 'Spring Outreach',
        subject: 'Quick question for {{company}}',
        body: 'Hi {{name}}...',
        status: 'DRAFT',
        fromChannelId: null,
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
        totalSent: 0,
        totalFailed: 0,
        recipients: [],
        steps: [],
      },
    ]);

    const res = await getCampaigns();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.campaigns).toHaveLength(1);
    expect(data.campaigns[0].name).toBe('Spring Outreach');
  });

  it('creates a new outreach campaign', async () => {
    mocks.prisma.campaign.create.mockResolvedValue({
      id: 'camp-2',
      workspaceId: 'workspace-main',
      name: 'New Product Announcement',
      subject: 'Announcing our new feature',
      body: 'Hi {{name}}, we launched something cool...',
      status: 'DRAFT',
      type: 'EMAIL',
    });

    const req = new Request('http://localhost:3000/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'New Product Announcement',
        subject: 'Announcing our new feature',
        body: 'Hi {{name}}, we launched something cool...',
      }),
    });

    const res = await createCampaign(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.campaign.name).toBe('New Product Announcement');
  });

  it('adds recipients to a campaign', async () => {
    mocks.prisma.campaign.findFirst.mockResolvedValue({
      id: 'camp-1',
      workspaceId: 'workspace-main',
    });
    mocks.prisma.campaignRecipient.upsert.mockResolvedValue({ id: 'rec-1' });

    const req = new Request('http://localhost:3000/api/campaigns/camp-1/recipients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipients: [
          { email: 'alex@example.test', name: 'Alex', company: 'Acme' },
          { email: 'sarah@example.test', name: 'Sarah', company: 'Tech' },
        ],
      }),
    });

    const res = await addRecipients(req, { params: Promise.resolve({ id: 'camp-1' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.addedCount).toBe(2);
  });

  it('resets failed recipients to PENDING via PATCH', async () => {
    mocks.prisma.campaign.findFirst.mockResolvedValue({
      id: 'camp-1',
      workspaceId: 'workspace-main',
      status: 'COMPLETED',
      totalFailed: 2,
    });
    mocks.prisma.campaignRecipient.updateMany.mockResolvedValue({ count: 2 });
    mocks.prisma.campaign.update.mockResolvedValue({
      id: 'camp-1',
      status: 'PAUSED',
      totalFailed: 0,
    });

    const req = new Request('http://localhost:3000/api/campaigns/camp-1/recipients', {
      method: 'PATCH',
    });

    const res = await retryRecipients(req, { params: Promise.resolve({ id: 'camp-1' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.retriedCount).toBe(2);
    expect(mocks.prisma.campaignRecipient.updateMany).toHaveBeenCalledWith({
      where: { campaignId: 'camp-1', status: 'FAILED' },
      data: { status: 'PENDING', errorMessage: null },
    });
    expect(mocks.prisma.campaign.update).toHaveBeenCalledWith({
      where: { id: 'camp-1' },
      data: { status: 'PAUSED', totalFailed: 0 },
    });
  });

  it('sends campaign to pending recipients', async () => {
    mocks.prisma.campaign.findFirst.mockResolvedValue({
      id: 'camp-1',
      workspaceId: 'workspace-main',
      subject: 'Hello {{name}}',
      body: 'Check out our offer for {{company}}',
      fromChannelId: 'ch-1',
      recipients: [
        { id: 'rec-1', email: 'a@test.com', name: 'A', company: 'Co A' },
        { id: 'rec-2', email: 'b@test.com', name: 'B', company: 'Co B' },
      ],
    });
    mocks.prisma.campaign.update.mockResolvedValue({
      id: 'camp-1',
      status: 'COMPLETED',
      totalSent: 2,
    });

    const req = new Request('http://localhost:3000/api/campaigns/camp-1/send', {
      method: 'POST',
    });

    const res = await sendCampaign(req, { params: Promise.resolve({ id: 'camp-1' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sent).toBe(2);
  });

  it('retries dispatch for a single recipient via POST with recipientId', async () => {
    mocks.prisma.campaign.findFirst.mockResolvedValue({
      id: 'camp-1',
      workspaceId: 'workspace-main',
      subject: 'Hello {{name}}',
      body: 'Check out our offer for {{company}}',
      fromChannelId: 'ch-1',
      totalFailed: 1,
      recipients: [
        { id: 'rec-1', email: 'a@test.com', name: 'A', company: 'Co A', status: 'FAILED' },
      ],
    });
    mocks.prisma.campaign.update.mockResolvedValue({
      id: 'camp-1',
      totalSent: 1,
      totalFailed: 0,
    });

    const req = new Request('http://localhost:3000/api/campaigns/camp-1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId: 'rec-1' }),
    });

    const res = await sendCampaign(req, { params: Promise.resolve({ id: 'camp-1' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mocks.prisma.campaignRecipient.updateMany).toHaveBeenCalled();
  });

  it('publishes a post and records metrics when publishing is enabled', async () => {
    process.env.ENABLE_SIMULATED_PUBLISHING = 'true';
    mocks.prisma.post.findFirst.mockResolvedValue({
      id: 'post-1',
      workspaceId: 'workspace-main',
      status: 'DRAFT',
      channels: [{ channelId: 'ch-1' }],
      metrics: [],
    });
    mocks.prisma.post.update.mockResolvedValue({
      id: 'post-1',
      status: 'PUBLISHED',
      channels: [{ channelId: 'ch-1' }],
      metrics: [],
    });

    const req = new Request('http://localhost:3000/api/posts/post-1/publish', {
      method: 'POST',
    });

    const res = await publishPost(req, { params: Promise.resolve({ id: 'post-1' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mocks.prisma.postMetric.create).toHaveBeenCalled();
    delete process.env.ENABLE_SIMULATED_PUBLISHING;
  });

  it('upgrades billing plan and awards credits', async () => {
    mocks.prisma.workspace.update.mockResolvedValue({
      id: 'workspace-main',
      aiCredits: 3500,
    });

    const req = new Request('http://localhost:3000/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: 'scale' }),
    });

    const res = await checkoutBilling(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.plan).toBe('SCALE');
    expect(mocks.prisma.subscription.upsert).toHaveBeenCalled();
  });
});
