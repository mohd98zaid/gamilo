import { describe, expect, it } from 'vitest';
import { createInMemoryPostRepository, mapPrismaPost } from '@/features/posts';

describe('Posts feature repository and mapping boundary', () => {
  it('creates, filters, updates, and deletes a scheduled post', async () => {
    const repository = createInMemoryPostRepository();
    const scheduledAt = new Date(Date.now() + 60_000).toISOString();

    const created = await repository.create('test-workspace', {
      caption: 'Repository boundary test',
      channelIds: ['test-channel-instagram'],
      mediaUrls: [],
      scheduledAt,
      status: 'SCHEDULED',
    });

    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const post = created.post as { id: string; status: string };
    expect(post.status).toBe('SCHEDULED');
    expect((await repository.list({ workspaceId: 'test-workspace', status: 'SCHEDULED' })).some((item) => (item as { id: string }).id === post.id)).toBe(true);

    const updated = await repository.update(
      { workspaceId: 'test-workspace', id: post.id },
      { caption: 'Updated repository boundary test' },
    );
    expect((updated as { caption: string }).caption).toBe('Updated repository boundary test');

    expect(await repository.delete({ workspaceId: 'test-workspace', id: post.id })).toBe(true);
    expect(await repository.findById({ workspaceId: 'test-workspace', id: post.id })).toBeNull();
  });

  it('rejects channels outside the workspace', async () => {
    const repository = createInMemoryPostRepository();
    const result = await repository.create('test-workspace', {
      caption: 'Invalid channel test',
      channelIds: ['channel-from-another-workspace'],
      mediaUrls: [],
      scheduledAt: null,
      status: 'DRAFT',
    });

    expect(result).toEqual({ ok: false, reason: 'INVALID_CHANNELS' });
  });

  it('maps persisted JSON fields without exposing storage format to callers', () => {
    const mapped = mapPrismaPost({
      id: 'post-1',
      workspaceId: 'workspace-1',
      caption: 'Mapped post',
      mediaUrls: '["https://example.test/image.png"]',
      status: 'DRAFT',
      channels: [{ channelId: 'channel-1' }],
      metrics: [{ likes: 2 }],
    });

    expect(mapped.mediaUrls).toEqual(['https://example.test/image.png']);
    expect(mapped.channelIds).toEqual(['channel-1']);
    expect(mapped.metrics).toEqual({ likes: 2 });
  });
});
