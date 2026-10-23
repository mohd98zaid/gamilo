import { describe, it, expect } from 'vitest';
import { createPostSchema, loginSchema, sendReplySchema, updatePostSchema } from '@/lib/validators';

describe('Zod Input Validators (8-Security.md Section 4)', () => {
  it('validates a correct post payload', () => {
    const validPost = {
      caption: 'Delicious espresso roast available now!',
      channelIds: ['test-channel-instagram'],
      mediaUrls: ['https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb'],
      status: 'DRAFT' as const,
    };

    const res = createPostSchema.safeParse(validPost);
    expect(res.success).toBe(true);
  });

  it('rejects post payload with missing channel selection', () => {
    const invalidPost = {
      caption: 'Missing channels',
      channelIds: [],
    };

    const res = createPostSchema.safeParse(invalidPost);
    expect(res.success).toBe(false);
  });

  it('validates reply payload correctly', () => {
    const validReply = {
      threadId: 'test-thread-1',
      content: 'Hello, our cinnamon buns are fresh every morning!',
    };

    const res = sendReplySchema.safeParse(validReply);
    expect(res.success).toBe(true);
  });

  it('rejects unsupported published status and incomplete scheduled updates', () => {
    expect(createPostSchema.safeParse({
      caption: 'Provider verification required',
      channelIds: ['test-channel-instagram'],
      status: 'PUBLISHED',
    }).success).toBe(false);

    expect(updatePostSchema.safeParse({ status: 'SCHEDULED' }).success).toBe(false);
  });
});
