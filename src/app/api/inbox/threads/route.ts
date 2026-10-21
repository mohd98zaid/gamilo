import { NextResponse } from 'next/server';
import { store } from '@/lib/db';
import { requireApiAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get('platform');
  const unreadOnly = searchParams.get('unread') === 'true';

  if (auth) {
    const threads = await prisma.thread.findMany({ where: { workspaceId: auth.workspaceId, ...(platform ? { platform: platform.toUpperCase() } : {}), ...(unreadOnly ? { isRead: false } : {}) }, include: { messages: { orderBy: { sentAt: 'asc' } } }, orderBy: { lastMessageAt: 'desc' } });
    return NextResponse.json({ threads: threads.map((thread) => ({ ...thread, labels: JSON.parse(thread.labels), messages: thread.messages.map((message) => ({ ...message, senderName: message.direction === 'OUTBOUND' ? auth.workspace.name : thread.contactName })) })), total: threads.length, unreadCount: await prisma.thread.count({ where: { workspaceId: auth.workspaceId, isRead: false } }) });
  }

  let filtered = store.threads;
  if (platform) {
    filtered = filtered.filter((t) => t.platform.toUpperCase() === platform.toUpperCase());
  }
  if (unreadOnly) {
    filtered = filtered.filter((t) => !t.isRead);
  }

  // Sort by last message descending
  filtered.sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );

  return NextResponse.json({
    threads: filtered,
    total: filtered.length,
    unreadCount: store.threads.filter((t) => !t.isRead).length,
  });
}
