import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireApiAuth: vi.fn(),
  prisma: {
    channel: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/api-auth', () => ({ requireApiAuth: mocks.requireApiAuth }));
vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));

import { GET as startGmailIntegration } from '@/app/api/integrations/gmail/start/route';
import { POST as createChannel } from '@/app/api/channels/route';

const adminUser = {
  id: 'admin-1',
  email: 'admin@example.test',
  name: 'Admin User',
  workspaceId: 'workspace-main',
  role: 'ADMIN',
  workspace: { id: 'workspace-main', name: 'Main Workspace' },
};

describe('Gmail & Channel Integration Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireApiAuth.mockResolvedValue(adminUser);
  });

  it('safely redirects to channels page with error when Google OAuth is not configured', async () => {
    const req = new Request('http://localhost:3000/api/integrations/gmail/start', {
      method: 'GET',
      headers: {
        accept: 'text/html',
      },
    });

    const response = await startGmailIntegration(req);
    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('/dashboard/channels?error=google_oauth_not_configured');
  });

  it('returns 503 JSON when Google OAuth is not configured and JSON is requested', async () => {
    const req = new Request('http://localhost:3000/api/integrations/gmail/start', {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
    });

    const response = await startGmailIntegration(req);
    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data.error).toContain('Google OAuth is not configured');
  });

  it('connects a Gmail channel with App Password for an authenticated user and saves to prisma', async () => {
    mocks.prisma.channel.create.mockResolvedValue({
      id: 'ch_test_123',
      workspaceId: 'workspace-main',
      platform: 'GMAIL',
      platformId: 'test@gmail.com',
      name: 'Test Gmail (test@gmail.com)',
      accessToken: 'enc:v1:mock_encrypted_secret',
      avatarUrl: undefined,
      isActive: true,
      createdAt: new Date(),
    });

    const req = new Request('http://localhost:3000/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'GMAIL',
        name: 'Test Gmail',
        email: 'test@gmail.com',
        accessToken: 'abcd efgh ijkl mnop',
        authType: 'APP_PASSWORD',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 465,
        imapHost: 'imap.gmail.com',
        imapPort: 993,
      }),
    });

    const response = await createChannel(req);
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.channel.platform).toBe('GMAIL');
    expect(mocks.prisma.channel.create).toHaveBeenCalled();
  });
});
