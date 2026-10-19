import { NextResponse } from 'next/server';
import { store } from '@/lib/db';

export async function GET() {
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
    const body = await req.json();
    const { businessName, industry, tone, description, brandKnowledge } = body;

    if (businessName) {
      store.workspace.brandSettings.businessName = businessName;
      store.workspace.name = businessName;
    }
    if (industry) store.workspace.brandSettings.industry = industry;
    if (tone) store.workspace.brandSettings.tone = tone;
    if (description !== undefined) store.workspace.brandSettings.description = description;
    if (brandKnowledge !== undefined) store.workspace.brandSettings.brandKnowledge = brandKnowledge;

    return NextResponse.json({
      success: true,
      brandSettings: store.workspace.brandSettings,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: 500 }
    );
  }
}
