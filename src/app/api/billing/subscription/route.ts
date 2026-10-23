import { NextResponse } from 'next/server';
import { store } from '@/features/testing/store';
import { requireApiAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  if (auth) {
    const workspace = await prisma.workspace.findUnique({ where: { id: auth.workspaceId }, include: { subscription: true, _count: { select: { channels: true } } } });
    if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    const trialEnds = new Date(workspace.trialEndsAt);
    const daysRemaining = Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / 86400000));
    return NextResponse.json({ subscription: { plan: workspace.subscription?.plan ?? 'TRIAL', status: workspace.subscription?.status ?? 'trialing', trialEndsAt: workspace.trialEndsAt, daysRemaining, aiCredits: workspace.aiCredits, maxChannels: workspace.subscription?.plan === 'SCALE' ? 15 : 5, currentChannels: workspace._count.channels }, plans: [] });
  }
  const trialEnds = new Date(store.workspace.trialEndsAt);
  const now = new Date();
  const daysRemaining = Math.max(0, Math.ceil((trialEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return NextResponse.json({
    subscription: {
      plan: store.workspace.plan,
      status: 'active',
      trialEndsAt: store.workspace.trialEndsAt,
      daysRemaining,
      aiCredits: store.workspace.aiCredits,
      maxChannels: 5,
      currentChannels: store.channels.length,
    },
    plans: [
      {
        id: 'starter',
        name: 'Starter',
        priceMonthly: 29,
        priceAnnual: 24,
        features: [
          'Up to 5 Social Channels',
          'Unlimited Scheduled Posts',
          'Unified Inbox (IG & FB)',
          '500 AI Generation Credits/mo',
          'Standard Support',
        ],
      },
      {
        id: 'scale',
        name: 'Scale (Popular)',
        priceMonthly: 79,
        priceAnnual: 65,
        features: [
          'Up to 15 Social Channels',
          'Autopilot AI Comment & DM Replies',
          'Multi-channel Inbox + WhatsApp',
          '2,500 AI Generation Credits/mo',
          'Priority Support & Analytics',
        ],
      },
    ],
  });
}
