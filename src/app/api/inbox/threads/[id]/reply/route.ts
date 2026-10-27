import { NextResponse } from 'next/server';
import { store } from '@/features/testing/store';
import { sendReplySchema } from '@/features/inbox/schemas';
import { requireApiAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email/sender';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await params;
  const auth = await requireApiAuth('EDITOR');
  if (auth instanceof NextResponse) return auth;

  try {
    const json = await req.json();
    const parsed = sendReplySchema.safeParse({ ...json, threadId: id });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    if (auth) {
      const thread = await prisma.thread.findUnique({
        where: { id },
        include: { messages: true },
      });

      if (!thread || thread.workspaceId !== auth.workspaceId) {
        return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
      }

      // Email replies must be delivered before they are recorded as outbound.
      if (thread.platform === 'GMAIL' || thread.platform === 'EMAIL') {
        const recipientEmail = thread.platformThreadId.includes('@')
          ? thread.platformThreadId
          : thread.contactName.includes('@')
          ? thread.contactName
          : null;
        if (!recipientEmail) {
          return NextResponse.json(
            { error: 'This email thread does not have a deliverable recipient address' },
            { status: 422 },
          );
        }

        try {
          await sendEmail({
            workspaceId: auth.workspaceId,
            to: recipientEmail,
            subject: `Re: Conversation with ${auth.workspace.name}`,
            text: parsed.data.content,
          });
        } catch (error) {
          console.error('Inbox email reply failed', { error: error instanceof Error ? error.name : 'unknown' });
          return NextResponse.json(
            { error: 'Email reply could not be delivered; no outbound message was recorded' },
            { status: 502 },
          );
        }
      } else {
        return NextResponse.json(
          { error: `Replies for ${thread.platform} threads are not available yet` },
          { status: 501 },
        );
      }

      const newMsg = await prisma.message.create({
        data: {
          threadId: thread.id,
          direction: 'OUTBOUND',
          content: parsed.data.content,
        },
      });

      await prisma.thread.update({
        where: { id: thread.id },
        data: {
          lastMessageAt: new Date(),
          isRead: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: {
          ...newMsg,
          senderName: auth.workspace.name,
        },
      });
    }

    // In-memory store fallback for demo/test mode
    const thread = store.threads.find((t) => t.id === id);
    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
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
