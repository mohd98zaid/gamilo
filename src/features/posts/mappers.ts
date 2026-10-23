export interface PostResponse {
  id: string;
  workspaceId: string;
  caption: string;
  mediaUrls: string[];
  status: string;
  channelIds: string[];
  [key: string]: unknown;
}

interface PrismaPostLike {
  id: string;
  workspaceId: string;
  caption: string;
  mediaUrls: string;
  status: string;
  channels?: Array<{ channelId: string }>;
  metrics?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

function parseMediaUrls(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : [];
  } catch {
    return [];
  }
}

export function mapPrismaPost(post: PrismaPostLike): PostResponse {
  return {
    ...post,
    mediaUrls: parseMediaUrls(post.mediaUrls),
    channelIds: post.channels?.map((channel) => channel.channelId) ?? [],
    metrics: post.metrics?.[0],
  };
}

export function mapPostList(posts: unknown[]): unknown[] {
  return posts;
}
