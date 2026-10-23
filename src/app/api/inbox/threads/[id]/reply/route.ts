import { NextResponse } from 'next/server';
import { store } from '@/features/testing/store';
import { sendReplySchema } from '@/features/inbox/schemas';
import { requireApiAuth } from '@/lib/api-auth';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await params;
  const auth = await requireApiAuth('EDITOR');
  if (auth instanceof NextResponse) return auth;
  if (auth) return NextResponse.json({ error: 'Inbox delivery provider integration is not configured yet' }, { status: 501 });
  const thread = store.threads.find((t) => t.id === id);
  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  }

  try {
    const json = await req.json();
    const parsed = sendReplySchema.safeParse({ ...json, threadId: id });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const newMsg = {
      id: `msg_${Date.now()}`,
      threadId: thread.id,
      direction: 'OUTBOUND' as const,
      senderName: store.workspace.brandSettings.businessName,
      content: parsed.data.content,
      sentAt: new Date().toISOString(),
    };

    thread.messages.push(newMsg);
    thread.lastMessageAt = newMsg.sentAt;
    thread.isRead = true;

    return NextResponse.json({ success: true, message: newMsg });
  } catch (error) {
    console.error('Inbox reply failed', { error: error instanceof Error ? error.name : 'unknown' });
    return NextResponse.json(
      { error: 'Failed to send reply' },
      { status: 500 }
    );
  }
}
