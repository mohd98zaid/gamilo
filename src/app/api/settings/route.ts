import { NextResponse } from 'next/server';
import { store } from '@/lib/db';
import { settingsSchema } from '@/lib/validators';
import { requireApiAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  if (auth) {
    const workspace = await prisma.workspace.findUnique({ where: { id: auth.workspaceId }, include: { brandSettings: true, subscription: true } });
    if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    return NextResponse.json({ workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug, plan: workspace.subscription?.plan ?? 'TRIAL', aiCredits: workspace.aiCredits, brandSettings: workspace.brandSettings } });
  }
  return NextResponse.json({
    workspace: {
      id: store.workspace.id,
      name: store.workspace.name,
      slug: store.workspace.slug,
      plan: store.workspace.plan,
      aiCredits: store.workspace.aiCredits,
      brandSettings: store.workspace.brandSettings,
    },
  });
}

export async function POST(req: Request) {
  try {
    const auth = await requireApiAuth();
    if (auth instanceof NextResponse) return auth;
    const parsed = settingsSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }
    const { businessName, industry, tone, description, brandKnowledge } = parsed.data;

    if (auth) {
      const current = await prisma.brandSettings.findUnique({ where: { workspaceId: auth.workspaceId } });
      if (!current) return NextResponse.json({ error: 'Workspace brand settings not found' }, { status: 404 });
      const brandSettings = await prisma.brandSettings.update({ where: { workspaceId: auth.workspaceId }, data: { ...(businessName !== undefined ? { businessName } : {}), ...(industry !== undefined ? { industry } : {}), ...(tone !== undefined ? { tone } : {}), ...(description !== undefined ? { description } : {}), ...(brandKnowledge !== undefined ? { brandKnowledge } : {}) } });
      if (businessName) await prisma.workspace.update({ where: { id: auth.workspaceId }, data: { name: businessName } });
      return NextResponse.json({ success: true, brandSettings });
    }

    if (businessName) {
      store.workspace.brandSettings.businessName = businessName;
      store.workspace.name = businessName;
    }
    if (industry) store.workspace.brandSettings.industry = industry;
    if (tone) store.workspace.brandSettings.tone = tone;
    if (description !== undefined && description !== null) store.workspace.brandSettings.description = description;
    if (brandKnowledge !== undefined && brandKnowledge !== null) store.workspace.brandSettings.brandKnowledge = brandKnowledge;

    return NextResponse.json({
      success: true,
      brandSettings: store.workspace.brandSettings,
    });
  } catch (error) {
    console.error('Settings update failed', { error: error instanceof Error ? error.name : 'unknown' });
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
