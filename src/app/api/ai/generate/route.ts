import { NextResponse } from 'next/server';
import { store } from '@/lib/db';
import { AIPrompts } from '@/lib/ai/prompts';
import { nvidiaNim } from '@/lib/ai/nvidia-nim';
import { aiGenerateSchema } from '@/lib/validators';

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = aiGenerateSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    if (store.workspace.aiCredits <= 0) {
      return NextResponse.json({ error: 'Insufficient AI credits' }, { status: 402 });
    }

    const { prompt, type, platform, brandContext } = parsed.data;
    const brand = {
      ...store.workspace.brandSettings,
      ...brandContext,
    };

    let system = '';
    let user = '';

    if (type === 'caption') {
      const res = AIPrompts.buildSocialCaptionPrompt({
        topic: prompt,
        platform,
        brand,
      });
      system = res.system;
      user = res.user;
    } else if (type === 'email_subject') {
      const res = AIPrompts.buildEmailSubjectPrompt({
        topic: prompt,
        targetAudience: 'Prospective clients',
        brand,
      });
      system = res.system;
      user = res.user;
    } else if (type === 'hashtags') {
      const res = AIPrompts.buildHashtagPrompt({
        topic: prompt,
        industry: brand.industry || 'general',
      });
      system = res.system;
      user = res.user;
    } else {
      system = `You are an expert marketing copywriter for ${brand.businessName || 'our business'}.`;
      user = prompt;
    }

    const aiResult = await nvidiaNim.generate({
      systemPrompt: system,
      userPrompt: user,
    });

    store.workspace.aiCredits = Math.max(0, store.workspace.aiCredits - 1);

    return NextResponse.json({
      success: true,
      text: aiResult.text,
      modelUsed: aiResult.modelUsed,
      remainingCredits: store.workspace.aiCredits,
      durationMs: aiResult.durationMs,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI generation error' },
      { status: 500 }
    );
  }
}
