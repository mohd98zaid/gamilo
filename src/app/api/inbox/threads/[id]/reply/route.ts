import { NextResponse } from 'next/server';
import { store } from '@/lib/db';
import { sendReplySchema } from '@/lib/validators';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const thread = store.threads.find((t) => t.id === params.id);
  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  }

  try {
    const json = await req.json();
    const parsed = sendReplySchema.safeParse({ ...json, threadId: params.id });

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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send reply' },
      { status: 500 }
    );
  }
}
