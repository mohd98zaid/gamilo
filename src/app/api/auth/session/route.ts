import { NextResponse } from 'next/server';
import { store } from '@/lib/db';

export async function GET() {
  return NextResponse.json({
    user: {
      id: 'usr_demo_1',
      name: 'Sarah Jenkins',
      email: 'sarah@brewhaven.coffee',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    },
    workspace: {
      id: store.workspace.id,
      name: store.workspace.name,
      slug: store.workspace.slug,
      plan: store.workspace.plan,
      aiCredits: store.workspace.aiCredits,
      trialEndsAt: store.workspace.trialEndsAt,
      brandSettings: store.workspace.brandSettings,
    },
  });
}
