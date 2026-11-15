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
      deleteMany: vi.fn(),
    },
    campaignRecipient: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      create: vi.fn(),
    },
    thread: {
      findUnique: vi.fn(),
    },
    message: {
      create: vi.fn(),
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
      $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/api-auth', () => ({ requireApiAuth: mocks.requireApiAuth }));
vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('@/lib/email/sender', () => ({
  sendEmail: vi.fn(),
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
import { POST as addRecipients, PATCH as retryRecipients, DELETE as removeRecipient } from '@/app/api/campaigns/[id]/recipients/route';
import { POST as duplicateCampaign } from '@/app/api/campaigns/[id]/duplicate/route';
import { POST as splitCampaign } from '@/app/api/campaigns/[id]/split/route';
import { POST as mergeCampaigns } from '@/app/api/campaigns/merge/route';
import { POST as sendCampaign } from '@/app/api/campaigns/[id]/send/route';
import { POST as publishPost } from '@/app/api/posts/[id]/publish/route';
import { POST as checkoutBilling } from '@/app/api/billing/checkout/route';
import { POST as replyToThread } from '@/app/api/inbox/threads/[id]/reply/route';
import { GET as exportEmailIds } from '@/app/api/campaigns/[id]/recipients/export/route';

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

  it('resends a campaign to all recipients when explicitly requested', async () => {
    mocks.prisma.campaign.findFirst.mockResolvedValue({
      id: 'camp-1',
      workspaceId: 'workspace-main',
      subject: 'Hello {{name}}',
      body: 'Resend this message',
      fromChannelId: 'ch-1',
      recipients: [
        { id: 'rec-1', email: 'a@test.com', status: 'SENT' },
        { id: 'rec-2', email: 'b@test.com', status: 'FAILED' },
      ],
    });
    mocks.prisma.campaign.update.mockResolvedValue({ id: 'camp-1', status: 'COMPLETED' });

    const res = await sendCampaign(
      new Request('http://localhost:3000/api/campaigns/camp-1/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resendAll: true }),
      }),
      { params: Promise.resolve({ id: 'camp-1' }) },
    );

    expect(res.status).toBe(200);
    expect(mocks.prisma.campaign.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      include: { recipients: true },
    }));
  });

  it('removes a recipient only from its workspace campaign', async () => {
    mocks.prisma.campaign.findFirst.mockResolvedValue({
      id: 'camp-1',
      workspaceId: 'workspace-main',
      totalSent: 2,
      totalFailed: 0,
    });
    mocks.prisma.campaignRecipient.findFirst.mockResolvedValue({ id: 'rec-1', status: 'SENT' });
    mocks.prisma.$transaction.mockResolvedValue([]);

    const res = await removeRecipient(
      new Request('http://localhost:3000/api/campaigns/camp-1/recipients?recipientId=rec-1', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'camp-1' }) },
    );

    expect(res.status).toBe(200);
    expect(mocks.prisma.$transaction).toHaveBeenCalled();
    expect(mocks.prisma.campaignRecipient.delete).toHaveBeenCalledWith({ where: { id: 'rec-1' } });
  });

  it('exports workspace-scoped campaign email IDs as a downloadable JSON response', async () => {
    mocks.prisma.campaign.findFirst.mockResolvedValue({
      id: 'camp-1',
      name: 'Spring Outreach / Batch 1',
    });
    mocks.prisma.campaignRecipient.findMany.mockResolvedValue([
      { email: 'alice@example.com' },
      { email: 'bob@example.com' },
    ]);

    const res = await exportEmailIds(
      new Request('http://localhost:3000/api/campaigns/camp-1/recipients/export'),
      { params: Promise.resolve({ id: 'camp-1' }) },
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toBe(
      'attachment; filename="spring-outreach-batch-1-email-ids.json"',
    );
    const data = await res.json();
    expect(data.emailIds).toEqual(['alice@example.com', 'bob@example.com']);
    expect(data.total).toBe(2);
    expect(mocks.prisma.campaign.findFirst).toHaveBeenCalledWith({
      where: { id: 'camp-1', workspaceId: 'workspace-main' },
      select: { id: true, name: true },
    });
    expect(mocks.prisma.campaignRecipient.findMany).toHaveBeenCalledWith({
      where: { campaignId: 'camp-1' },
      select: { email: true },
      orderBy: { email: 'asc' },
    });
  });

  it('duplicates a campaign with both email content and recipients', async () => {
    mocks.prisma.campaign.findFirst.mockResolvedValue({
      id: 'camp-1',
      workspaceId: 'workspace-main',
      name: 'Mohammad Zaid',
      subject: 'Agentic AI Engineer pitch',
      body: 'Hi {{name}}, I have 5.7 years...',
      fromChannelId: 'ch-1',
      recipients: [
        { id: 'rec-1', email: 'alice@company.com', name: 'Alice', company: 'Acme' },
        { id: 'rec-2', email: 'bob@enterprise.org', name: 'Bob', company: 'Enterprise' },
      ],
    });
    mocks.prisma.campaign.create.mockResolvedValue({
      id: 'camp-copy-1',
      workspaceId: 'workspace-main',
      name: 'Mohammad Zaid (Batch 2)',
      subject: 'Agentic AI Engineer pitch',
      body: 'Hi {{name}}, I have 5.7 years...',
      fromChannelId: 'ch-1',
      type: 'EMAIL',
      status: 'DRAFT',
    });
    mocks.prisma.campaignRecipient.createMany.mockResolvedValue({ count: 2 });

    const req = new Request('http://localhost:3000/api/campaigns/camp-1/duplicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Mohammad Zaid (Batch 2)',
        copyEmail: true,
        copyRecipients: true,
      }),
    });

    const res = await duplicateCampaign(req, { params: Promise.resolve({ id: 'camp-1' }) });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.campaign.name).toBe('Mohammad Zaid (Batch 2)');
    expect(data.recipientsCopied).toBe(2);
    expect(mocks.prisma.campaignRecipient.createMany).toHaveBeenCalledWith({
      data: [
        { campaignId: 'camp-copy-1', email: 'alice@company.com', name: 'Alice', company: 'Acme', status: 'PENDING' },
        { campaignId: 'camp-copy-1', email: 'bob@enterprise.org', name: 'Bob', company: 'Enterprise', status: 'PENDING' },
      ],
    });
  });

  it('duplicates a campaign with email content only', async () => {
    mocks.prisma.campaign.findFirst.mockResolvedValue({
      id: 'camp-1',
      workspaceId: 'workspace-main',
      name: 'Mohammad Zaid',
      subject: 'Agentic AI Engineer pitch',
      body: 'Hi {{name}}, I have 5.7 years...',
      fromChannelId: 'ch-1',
      recipients: [
        { id: 'rec-1', email: 'alice@company.com', name: 'Alice', company: 'Acme' },
      ],
    });
    mocks.prisma.campaign.create.mockResolvedValue({
      id: 'camp-copy-2',
      workspaceId: 'workspace-main',
      name: 'Mohammad Zaid (Email Only)',
      subject: 'Agentic AI Engineer pitch',
      body: 'Hi {{name}}, I have 5.7 years...',
      fromChannelId: 'ch-1',
      type: 'EMAIL',
      status: 'DRAFT',
    });

    const req = new Request('http://localhost:3000/api/campaigns/camp-1/duplicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Mohammad Zaid (Email Only)',
        copyEmail: true,
        copyRecipients: false,
      }),
    });

    const res = await duplicateCampaign(req, { params: Promise.resolve({ id: 'camp-1' }) });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.recipientsCopied).toBe(0);
    expect(mocks.prisma.campaignRecipient.createMany).not.toHaveBeenCalled();
  });

  it('duplicates a campaign with recipients only', async () => {
    mocks.prisma.campaign.findFirst.mockResolvedValue({
      id: 'camp-1',
      workspaceId: 'workspace-main',
      name: 'Mohammad Zaid',
      subject: 'Old Pitch',
      body: 'Old Body',
      fromChannelId: 'ch-1',
      recipients: [
        { id: 'rec-1', email: 'alice@company.com', name: 'Alice', company: 'Acme' },
      ],
    });
    mocks.prisma.campaign.create.mockResolvedValue({
      id: 'camp-copy-3',
      workspaceId: 'workspace-main',
      name: 'New Pitch to Same Contacts',
      subject: 'Subject - New Pitch to Same Contacts',
      body: 'Hi {{name}},\n\n...',
      fromChannelId: undefined,
      type: 'EMAIL',
      status: 'DRAFT',
    });
    mocks.prisma.campaignRecipient.createMany.mockResolvedValue({ count: 1 });

    const req = new Request('http://localhost:3000/api/campaigns/camp-1/duplicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'New Pitch to Same Contacts',
        copyEmail: false,
        copyRecipients: true,
      }),
    });

    const res = await duplicateCampaign(req, { params: Promise.resolve({ id: 'camp-1' }) });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.recipientsCopied).toBe(1);
    expect(mocks.prisma.campaignRecipient.createMany).toHaveBeenCalled();
  });

  it('splits a campaign into batches by recipient count', async () => {
    mocks.prisma.campaign.findFirst.mockResolvedValue({
      id: 'camp-1',
      workspaceId: 'workspace-main',
      name: 'Mohammad Zaid',
      subject: 'Outreach Subject',
      body: 'Body text',
      fromChannelId: 'ch-1',
      recipients: [
        { id: 'r-1', email: 'user1@test.com', name: 'User 1', company: 'Co 1', status: 'PENDING' },
        { id: 'r-2', email: 'user2@test.com', name: 'User 2', company: 'Co 2', status: 'PENDING' },
        { id: 'r-3', email: 'user3@test.com', name: 'User 3', company: 'Co 3', status: 'PENDING' },
        { id: 'r-4', email: 'user4@test.com', name: 'User 4', company: 'Co 4', status: 'PENDING' },
        { id: 'r-5', email: 'user5@test.com', name: 'User 5', company: 'Co 5', status: 'PENDING' },
      ],
    });
    mocks.prisma.campaign.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: `split-${data.name}`, ...data })
    );
    mocks.prisma.campaignRecipient.createMany.mockResolvedValue({ count: 2 });

    const req = new Request('http://localhost:3000/api/campaigns/camp-1/split', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'BATCH_SIZE',
        batchSize: 2,
        copyEmail: true,
      }),
    });

    const res = await splitCampaign(req, { params: Promise.resolve({ id: 'camp-1' }) });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.totalCreated).toBe(3); // 2 + 2 + 1 = 3 batches
    expect(data.totalRecipientsSplit).toBe(5);
    expect(data.createdCampaigns[0].name).toBe('Mohammad Zaid - Part 1');
    expect(data.createdCampaigns[1].name).toBe('Mohammad Zaid - Part 2');
    expect(data.createdCampaigns[2].name).toBe('Mohammad Zaid - Part 3');
  });

  it('splits a campaign on basis of recipient status', async () => {
    mocks.prisma.campaign.findFirst.mockResolvedValue({
      id: 'camp-1',
      workspaceId: 'workspace-main',
      name: 'Mohammad Zaid',
      subject: 'Outreach Subject',
      body: 'Body text',
      recipients: [
        { id: 'r-1', email: 'sent1@test.com', name: 'S1', company: null, status: 'SENT' },
        { id: 'r-2', email: 'sent2@test.com', name: 'S2', company: null, status: 'SENT' },
        { id: 'r-3', email: 'pend1@test.com', name: 'P1', company: null, status: 'PENDING' },
        { id: 'r-4', email: 'fail1@test.com', name: 'F1', company: null, status: 'FAILED' },
      ],
    });
    mocks.prisma.campaign.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: `split-${data.name}`, ...data })
    );

    const req = new Request('http://localhost:3000/api/campaigns/camp-1/split', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'STATUS',
        statuses: ['PENDING', 'FAILED'],
      }),
    });

    const res = await splitCampaign(req, { params: Promise.resolve({ id: 'camp-1' }) });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.totalCreated).toBe(2);
    expect(data.createdCampaigns.some((c: any) => c.name.includes('Pending'))).toBe(true);
    expect(data.createdCampaigns.some((c: any) => c.name.includes('Failed'))).toBe(true);
  });

  it('merges multiple campaigns into a new campaign, deduplicating recipients', async () => {
    mocks.prisma.campaign.findMany.mockResolvedValue([
      {
        id: 'camp-1',
        workspaceId: 'workspace-main',
        name: 'Batch 1',
        subject: 'Batch 1 Subject',
        body: 'Body 1',
        fromChannelId: 'ch-1',
        recipients: [
          { email: 'shared@test.com', name: 'Shared', company: 'Co', status: 'SENT' },
          { email: 'only1@test.com', name: 'Only 1', company: 'Co', status: 'SENT' },
        ],
      },
      {
        id: 'camp-2',
        workspaceId: 'workspace-main',
        name: 'Batch 2',
        subject: 'Batch 2 Subject',
        body: 'Body 2',
        fromChannelId: 'ch-1',
        recipients: [
          { email: 'shared@test.com', name: 'Shared Duplicate', company: 'Co', status: 'PENDING' },
          { email: 'only2@test.com', name: 'Only 2', company: 'Co', status: 'PENDING' },
        ],
      },
    ]);
    mocks.prisma.campaign.create.mockResolvedValue({
      id: 'merged-camp',
      workspaceId: 'workspace-main',
      name: 'Combined Campaign',
      subject: 'Batch 1 Subject',
      body: 'Body 1',
    });
    mocks.prisma.campaignRecipient.createMany.mockResolvedValue({ count: 3 });

    const req = new Request('http://localhost:3000/api/campaigns/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceCampaignIds: ['camp-1', 'camp-2'],
        newCampaignName: 'Combined Campaign',
        resetStatusToPending: true,
      }),
    });

    const res = await mergeCampaigns(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.totalRecipients).toBe(3); // 'shared', 'only1', 'only2'
    expect(data.duplicatesRemoved).toBe(1);
    expect(mocks.prisma.campaignRecipient.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ email: 'shared@test.com', status: 'PENDING' }),
        expect.objectContaining({ email: 'only1@test.com', status: 'PENDING' }),
        expect.objectContaining({ email: 'only2@test.com', status: 'PENDING' }),
      ]),
    });
  });

  it('merges campaigns into an existing target campaign and deduplicates against target', async () => {
    mocks.prisma.campaign.findMany.mockResolvedValue([
      {
        id: 'target-1',
        workspaceId: 'workspace-main',
        name: 'Main Target',
        recipients: [],
      },
      {
        id: 'source-2',
        workspaceId: 'workspace-main',
        name: 'Source 2',
        recipients: [
          { email: 'existing@target.com', name: 'Ex', company: null, status: 'PENDING' },
          { email: 'new@target.com', name: 'New', company: null, status: 'PENDING' },
        ],
      },
    ]);
    mocks.prisma.campaign.findFirst.mockResolvedValue({
      id: 'target-1',
      workspaceId: 'workspace-main',
      name: 'Main Target',
      recipients: [{ email: 'existing@target.com' }],
    });
    mocks.prisma.campaignRecipient.createMany.mockResolvedValue({ count: 1 });

    const req = new Request('http://localhost:3000/api/campaigns/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceCampaignIds: ['target-1', 'source-2'],
        targetCampaignId: 'target-1',
      }),
    });

    const res = await mergeCampaigns(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.duplicatesRemoved).toBe(1); // 'existing@target.com' already in target
    expect(mocks.prisma.campaignRecipient.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ email: 'new@target.com', campaignId: 'target-1' }),
      ],
    });
  });

  it('does not claim social publication when only a simulation flag is enabled', async () => {
    process.env.ENABLE_SIMULATED_PUBLISHING = 'true';

    const req = new Request('http://localhost:3000/api/posts/post-1/publish', {
      method: 'POST',
    });

    const res = await publishPost(req, { params: Promise.resolve({ id: 'post-1' }) });
    expect(res.status).toBe(501);
    const data = await res.json();
    expect(data.error).toContain('not available');
    expect(mocks.prisma.post.update).not.toHaveBeenCalled();
    expect(mocks.prisma.postMetric.create).not.toHaveBeenCalled();
    delete process.env.ENABLE_SIMULATED_PUBLISHING;
  });

  it('does not grant billing entitlements without a payment provider', async () => {
    const req = new Request('http://localhost:3000/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: 'scale' }),
    });

    const res = await checkoutBilling(req);
    expect(res.status).toBe(501);
    const data = await res.json();
    expect(data.error).toContain('No payment was processed');
    expect(mocks.prisma.subscription.upsert).not.toHaveBeenCalled();
    expect(mocks.prisma.workspace.update).not.toHaveBeenCalled();
  });

  it('does not record an inbox reply when SMTP delivery fails', async () => {
    mocks.prisma.thread.findUnique.mockResolvedValue({
      id: 'thread-email',
      workspaceId: 'workspace-main',
      platform: 'EMAIL',
      platformThreadId: 'customer@example.test',
      contactName: 'Customer',
      messages: [],
    });
    const sender = await import('@/lib/email/sender');
    vi.mocked(sender.sendEmail).mockRejectedValueOnce(new Error('SMTP rejected message'));

    const req = new Request('http://localhost:3000/api/inbox/threads/thread-email/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Reply content' }),
    });

    const res = await replyToThread(req, { params: Promise.resolve({ id: 'thread-email' }) });
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toContain('no outbound message was recorded');
    expect(mocks.prisma.message.create).not.toHaveBeenCalled();
  });
});
