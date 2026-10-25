import { NextResponse } from 'next/server';
import { store } from '@/features/testing/store';
import { AIPrompts } from '@/lib/ai/prompts';
import { nvidiaNim } from '@/lib/ai/nvidia-nim';
import { requireApiAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await params;
  const auth = await requireApiAuth('EDITOR');
  if (auth instanceof NextResponse) return auth;

  try {
    if (auth) {
      const thread = await prisma.thread.findUnique({
        where: { id },
        include: { messages: { orderBy: { sentAt: 'asc' } } },
      });

      if (!thread || thread.workspaceId !== auth.workspaceId) {
        return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
      }

      const workspace = await prisma.workspace.findUnique({
        where: { id: auth.workspaceId },
        include: { brandSettings: true },
      });

      if (!workspace || workspace.aiCredits <= 0) {
        return NextResponse.json({ error: 'Insufficient AI credits' }, { status: 402 });
      }

      const brand = {
        businessName: workspace.brandSettings?.businessName || workspace.name,
        industry: workspace.brandSettings?.industry || 'General',
        tone: workspace.brandSettings?.tone || 'friendly',
        description: workspace.brandSettings?.description ?? undefined,
        brandKnowledge: workspace.brandSettings?.brandKnowledge ?? undefined,
      };

      const messages = thread.messages.map((m) => ({
        direction: m.direction as 'INBOUND' | 'OUTBOUND',
        senderName: m.direction === 'OUTBOUND' ? workspace.name : thread.contactName,
        content: m.content,
      }));

      const { system, user } = AIPrompts.buildInboxReplyPrompt({
        brand,
        platform: thread.platform,
        messages,
      });

      const aiResult = await nvidiaNim.generate({
        systemPrompt: system,
        userPrompt: user,
      });

      // Deduct 1 credit
      await prisma.workspace.update({
        where: { id: auth.workspaceId },
        data: { aiCredits: Math.max(0, workspace.aiCredits - 1) },
      });

      return NextResponse.json({
        success: true,
        suggestion: aiResult.text,
        modelUsed: aiResult.modelUsed,
        remainingCredits: workspace.aiCredits - 1,
        durationMs: aiResult.durationMs,
      });
    }

    // Fallback store
    const thread = store.threads.find((t) => t.id === id);
    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    if (store.workspace.aiCredits <= 0) {
      return NextResponse.json({ error: 'Insufficient AI credits' }, { status: 402 });
    }

    const messages = thread.messages.map((m) => ({
      direction: m.direction,
      senderName: m.senderName,
      content: m.content,
    }));

    const { system, user } = AIPrompts.buildInboxReplyPrompt({
      brand: store.workspace.brandSettings,
      platform: thread.platform,
      messages,
    });

    const aiResult = await nvidiaNim.generate({
      systemPrompt: system,
      userPrompt: user,
    });

    store.workspace.aiCredits = Math.max(0, store.workspace.aiCredits - 1);

    return NextResponse.json({
      success: true,
      suggestion: aiResult.text,
      modelUsed: aiResult.modelUsed,
      remainingCredits: store.workspace.aiCredits,
      durationMs: aiResult.durationMs,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI generation failed' },
      { status: 500 }
    );
  }
}
