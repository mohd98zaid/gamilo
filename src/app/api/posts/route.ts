import { NextResponse } from 'next/server';
import { store, PostEntity } from '@/lib/db';
import { createPostSchema } from '@/lib/validators';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  let filtered = store.posts;
  if (status) {
    filtered = filtered.filter((p) => p.status.toUpperCase() === status.toUpperCase());
  }

  return NextResponse.json({
    posts: filtered,
    total: filtered.length,
  });
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = createPostSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { caption, channelIds, mediaUrls, scheduledAt, status } = parsed.data;

    let computedStatus: PostEntity['status'] = 'DRAFT';
    if (status === 'PUBLISHED') {
      computedStatus = 'PUBLISHED';
    } else if (scheduledAt || status === 'SCHEDULED') {
      computedStatus = 'SCHEDULED';
    }

    const newPost: PostEntity = {
      id: `post_${Date.now()}`,
      workspaceId: store.workspace.id,
      caption,
      channelIds,
      mediaUrls: mediaUrls || [],
      status: computedStatus,
      scheduledAt: scheduledAt || undefined,
      publishedAt: computedStatus === 'PUBLISHED' ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
    };

    store.posts.unshift(newPost);

    return NextResponse.json({ success: true, post: newPost }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
