import { NextResponse } from 'next/server';
import { store, PostEntity } from '@/lib/db';
import { createPostSchema } from '@/lib/validators';
import { requireApiAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  if (auth) {
    const posts = await prisma.post.findMany({
      where: { workspaceId: auth.workspaceId, ...(status ? { status: status.toUpperCase() } : {}) },
      include: { channels: true, metrics: { orderBy: { recordedAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({
      posts: posts.map((post) => ({
        ...post,
        mediaUrls: JSON.parse(post.mediaUrls),
        channelIds: post.channels.map((channel) => channel.channelId),
        metrics: post.metrics[0] ?? undefined,
      })),
      total: posts.length,
    });
  }

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
    const auth = await requireApiAuth();
    if (auth instanceof NextResponse) return auth;
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

    if (auth) {
      const ownedChannels = await prisma.channel.findMany({ where: { id: { in: channelIds }, workspaceId: auth.workspaceId, isActive: true }, select: { id: true } });
      if (ownedChannels.length !== channelIds.length) {
        return NextResponse.json({ error: 'One or more channels are invalid for this workspace' }, { status: 400 });
      }
      const created = await prisma.post.create({
        data: {
          workspaceId: auth.workspaceId,
          caption,
          mediaUrls: JSON.stringify(mediaUrls ?? []),
          status: computedStatus,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          publishedAt: computedStatus === 'PUBLISHED' ? new Date() : undefined,
          channels: { create: channelIds.map((channelId) => ({ channelId })) },
        },
        include: { channels: true },
      });
      return NextResponse.json({ success: true, post: { ...created, mediaUrls: JSON.parse(created.mediaUrls), channelIds: created.channels.map((channel) => channel.channelId) } }, { status: 201 });
    }

    store.posts.unshift(newPost);

    return NextResponse.json({ success: true, post: newPost }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
