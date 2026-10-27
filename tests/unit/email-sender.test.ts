import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  prisma: {
    channel: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));

import { getEmailTransporter } from '@/lib/email/sender';

describe('email sender credential handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fails closed for malformed encrypted credentials', async () => {
    mocks.prisma.channel.findFirst.mockResolvedValue({
      id: 'channel-1',
      workspaceId: 'workspace-1',
      platform: 'GMAIL',
      platformId: 'sender@example.test',
      name: 'Sender',
      accessToken: 'enc:v1:malformed',
      isActive: true,
    });

    await expect(getEmailTransporter('workspace-1')).rejects.toThrow(
      'Stored email credential could not be decrypted',
    );
  });

  it('rejects empty credentials before creating a transporter', async () => {
    mocks.prisma.channel.findFirst.mockResolvedValue({
      id: 'channel-1',
      workspaceId: 'workspace-1',
      platform: 'GMAIL',
      platformId: 'sender@example.test',
      name: 'Sender',
      accessToken: '   ',
      isActive: true,
    });

    await expect(getEmailTransporter('workspace-1')).rejects.toThrow(
      'Stored email credential is empty',
    );
  });
});
