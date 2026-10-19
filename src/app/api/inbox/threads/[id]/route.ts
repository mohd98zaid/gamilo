import { NextResponse } from 'next/server';
import { store } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const thread = store.threads.find((t) => t.id === params.id);
  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  }

  // Mark as read upon retrieval
  thread.isRead = true;

  return NextResponse.json({ thread });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const thread = store.threads.find((t) => t.id === params.id);
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
