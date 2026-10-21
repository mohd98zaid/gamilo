import { NextResponse } from 'next/server';
import { store } from '@/lib/db';
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
    const thread = await prisma.thread.findFirst({ where: { id, workspaceId: auth.workspaceId }, include: { messages: { orderBy: { sentAt: 'asc' } } } });
    if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    const updated = await prisma.thread.update({ where: { id }, data: { isRead: true } });
    return NextResponse.json({ thread: { ...updated, labels: JSON.parse(updated.labels), messages: thread.messages } });
  }
  const thread = store.threads.find((t) => t.id === id);
  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  }

  // Mark as read upon retrieval
  thread.isRead = true;

  return NextResponse.json({ thread });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await params;
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  if (auth) {
    const body = await req.json();
    const labels = Array.isArray(body.labels) ? body.labels.filter((label: unknown): label is string => typeof label === 'string' && label.length <= 80).slice(0, 20) : undefined;
    const updated = await prisma.thread.updateMany({ where: { id, workspaceId: auth.workspaceId }, data: { ...(typeof body.isRead === 'boolean' ? { isRead: body.isRead } : {}), ...(labels ? { labels: JSON.stringify(labels) } : {}) } });
    if (updated.count === 0) return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    const thread = await prisma.thread.findUnique({ where: { id }, include: { messages: true } });
    return NextResponse.json({ success: true, thread: { ...thread, labels: JSON.parse(thread!.labels) } });
  }
  const thread = store.threads.find((t) => t.id === id);
  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  }

  try {
    const body = await req.json();
    if (typeof body.isRead === 'boolean') {
      thread.isRead = body.isRead;
    }
    if (Array.isArray(body.labels)) {
      thread.labels = body.labels;
    }
    return NextResponse.json({ success: true, thread });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update thread' }, { status: 500 });
  }
}
