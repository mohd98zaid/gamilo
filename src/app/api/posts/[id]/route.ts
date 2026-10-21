import { NextResponse } from 'next/server';
import { store } from '@/lib/db';
import { updatePostSchema } from '@/lib/validators';
import { requireApiAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await params;
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  if (auth) {
    const post = await prisma.post.findFirst({ where: { id, workspaceId: auth.workspaceId }, include: { channels: true, metrics: { orderBy: { recordedAt: 'desc' }, take: 1 } } });
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    return NextResponse.json({ post: { ...post, mediaUrls: JSON.parse(post.mediaUrls), channelIds: post.channels.map((channel) => channel.channelId), metrics: post.metrics[0] ?? undefined } });
  }
  const post = store.posts.find((p) => p.id === id);
  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }
  return NextResponse.json({ post });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await params;
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  if (auth) {
    const parsed = updatePostSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    const data = parsed.data;
    const updated = await prisma.post.updateMany({ where: { id, workspaceId: auth.workspaceId }, data: { ...(data.caption !== undefined ? { caption: data.caption } : {}), ...(data.status !== undefined ? { status: data.status } : {}), ...(data.scheduledAt !== undefined ? { scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null } : {}), ...(data.mediaUrls !== undefined ? { mediaUrls: JSON.stringify(data.mediaUrls) } : {}) } });
    if (updated.count === 0) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    const post = await prisma.post.findUnique({ where: { id }, include: { channels: true } });
    return NextResponse.json({ success: true, post: { ...post, mediaUrls: JSON.parse(post!.mediaUrls), channelIds: post!.channels.map((channel) => channel.channelId) } });
  }
  const post = store.posts.find((p) => p.id === id);
  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  try {
    const parsed = updatePostSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }
    Object.assign(post, parsed.data);
    return NextResponse.json({ success: true, post });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await params;
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  if (auth) {
    const deleted = await prisma.post.deleteMany({ where: { id, workspaceId: auth.workspaceId } });
    if (deleted.count === 0) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Post deleted' });
  }
  const index = store.posts.findIndex((p) => p.id === id);
  if (index === -1) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  store.posts.splice(index, 1);
  return NextResponse.json({ success: true, message: 'Post deleted' });
}
