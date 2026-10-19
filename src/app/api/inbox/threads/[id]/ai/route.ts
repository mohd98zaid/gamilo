import { NextResponse } from 'next/server';
import { store } from '@/lib/db';
import { AIPrompts } from '@/lib/ai/prompts';
import { nvidiaNim } from '@/lib/ai/nvidia-nim';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const thread = store.threads.find((t) => t.id === params.id);
  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  }

  if (store.workspace.aiCredits <= 0) {
    return NextResponse.json({ error: 'Insufficient AI credits' }, { status: 402 });
  }

  try {
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

    // Deduct 1 AI credit
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
