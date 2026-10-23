import { NextResponse } from 'next/server';
import { store } from '@/features/testing/store';
import { AIPrompts } from '@/lib/ai/prompts';
import { nvidiaNim } from '@/lib/ai/nvidia-nim';
import { aiGenerateSchema } from '@/features/ai/schemas';
import { requireApiAuth } from '@/lib/api-auth';
import { isTestEnvironment } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const auth = await requireApiAuth('EDITOR');
    if (auth instanceof NextResponse) return auth;
    const persistedWorkspace = auth ? await prisma.workspace.findUnique({ where: { id: auth.workspaceId }, include: { brandSettings: true } }) : null;
    if (auth && !persistedWorkspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    const json = await req.json();
    const parsed = aiGenerateSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const availableCredits = auth ? persistedWorkspace?.aiCredits ?? 0 : store.workspace.aiCredits;
    if (availableCredits <= 0) {
      return NextResponse.json({ error: 'Insufficient AI credits' }, { status: 402 });
    }

    const { prompt, type, platform, brandContext } = parsed.data;
    const persistedBrand = persistedWorkspace?.brandSettings;
    const brand = auth
      ? {
          businessName: persistedBrand?.businessName ?? '',
          industry: persistedBrand?.industry ?? '',
          tone: persistedBrand?.tone ?? '',
          description: persistedBrand?.description ?? '',
          brandKnowledge: persistedBrand?.brandKnowledge ?? '',
          ...brandContext,
        }
      : {
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

    if (auth) {
      const reserved = await prisma.workspace.updateMany({ where: { id: auth.workspaceId, aiCredits: { gt: 0 } }, data: { aiCredits: { decrement: 1 } } });
      if (reserved.count === 0) return NextResponse.json({ error: 'Insufficient AI credits' }, { status: 402 });
      try {
        const aiResult = await nvidiaNim.generate({ systemPrompt: system, userPrompt: user });
        const remaining = await prisma.workspace.findUnique({ where: { id: auth.workspaceId }, select: { aiCredits: true } });
        return NextResponse.json({ success: true, text: aiResult.text, modelUsed: aiResult.modelUsed, remainingCredits: remaining?.aiCredits ?? 0, durationMs: aiResult.durationMs });
      } catch (error) {
        await prisma.workspace.update({ where: { id: auth.workspaceId }, data: { aiCredits: { increment: 1 } } });
        throw error;
      }
    }

    if (!isTestEnvironment()) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const aiResult = await nvidiaNim.generate({ systemPrompt: system, userPrompt: user });

    store.workspace.aiCredits = Math.max(0, store.workspace.aiCredits - 1);

    return NextResponse.json({
      success: true,
      text: aiResult.text,
      modelUsed: aiResult.modelUsed,
      remainingCredits: store.workspace.aiCredits,
      durationMs: aiResult.durationMs,
    });
  } catch (error) {
    console.error('AI generation failed', { error: error instanceof Error ? error.name : 'unknown' });
    return NextResponse.json(
      { error: 'AI generation is temporarily unavailable' },
      { status: 500 }
    );
  }
}
