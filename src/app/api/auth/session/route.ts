import { NextResponse } from 'next/server';
import { store } from '@/features/testing/store';
import { getCurrentUser, isTestEnvironment } from '@/lib/auth';

export async function GET() {
  if (!isTestEnvironment()) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl }, workspace: user.workspace });
  }

  return NextResponse.json({
    user: {
      id: 'test-user',
      name: 'Test User',
      email: 'test@example.test',
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
