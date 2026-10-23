import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireApiAuth: vi.fn(),
  prisma: {
    post: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    channel: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/api-auth', () => ({ requireApiAuth: mocks.requireApiAuth }));
vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));

import { GET as getPost, PATCH as updatePost } from '@/app/api/posts/[id]/route';
import { POST as createWorkspacePost } from '@/app/api/posts/route';
import { POST as updateSettings } from '@/app/api/settings/route';

const authUser = {
  id: 'user-a',
  email: 'a@example.test',
  name: 'User A',
  avatarUrl: null,
  workspaceId: 'workspace-a',
  role: 'EDITOR',
  workspace: { id: 'workspace-a', name: 'Workspace A' },
};

describe('authorization and workspace tenant isolation at route boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireApiAuth.mockResolvedValue(authUser);
  });

  it('does not return a post from another workspace', async () => {
    mocks.prisma.post.findFirst.mockImplementation(async ({ where }: { where: { id: string; workspaceId: string } }) => {
      expect(where).toEqual({ id: 'post-from-b', workspaceId: 'workspace-a' });
      return null;
    });

    const response = await getPost(
      new Request('http://localhost/api/posts/post-from-b'),
      { params: { id: 'post-from-b' } },
    );

    expect(response.status).toBe(404);
  });

  it('rejects a post that references channels outside the current workspace', async () => {
    mocks.prisma.channel.findMany.mockImplementation(async ({ where }: { where: { workspaceId: string } }) => {
      expect(where.workspaceId).toBe('workspace-a');
      return [{ id: 'channel-a' }];
    });

    const response = await createWorkspacePost(
      new Request('http://localhost/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: 'Tenant isolation check',
          channelIds: ['channel-a', 'channel-from-b'],
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.prisma.post.create).not.toHaveBeenCalled();
  });

  it('uses the editor authorization boundary for persisted post mutations', async () => {
    mocks.requireApiAuth.mockResolvedValue(NextResponse.json({ error: 'Insufficient workspace permissions' }, { status: 403 }));

    const response = await updatePost(
      new Request('http://localhost/api/posts/post-1', { method: 'PATCH', body: '{}' }),
      { params: { id: 'post-1' } },
    );

    expect(response.status).toBe(403);
    expect(mocks.requireApiAuth).toHaveBeenCalledWith('EDITOR');
    expect(mocks.prisma.post.findFirst).not.toHaveBeenCalled();
  });

  it('uses the admin authorization boundary for workspace settings mutations', async () => {
    mocks.requireApiAuth.mockResolvedValue(NextResponse.json({ error: 'Insufficient workspace permissions' }, { status: 403 }));

    const response = await updateSettings(
      new Request('http://localhost/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName: 'Should not update' }),
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.requireApiAuth).toHaveBeenCalledWith('ADMIN');
  });
});
