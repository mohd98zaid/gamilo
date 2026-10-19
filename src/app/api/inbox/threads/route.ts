import { NextResponse } from 'next/server';
import { store } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get('platform');
  const unreadOnly = searchParams.get('unread') === 'true';

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
