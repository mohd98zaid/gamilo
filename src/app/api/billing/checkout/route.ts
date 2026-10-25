import { NextResponse } from 'next/server';
import { store } from '@/features/testing/store';
import { requireApiAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const auth = await requireApiAuth('ADMIN');
    if (auth instanceof NextResponse) return auth;

    const { planId } = await req.json();

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    }

    const targetPlan = (planId || 'STARTER').toUpperCase() === 'SCALE' ? 'SCALE' : 'STARTER';
    const creditsToAdd = targetPlan === 'SCALE' ? 2500 : 500;

    if (auth) {
      await prisma.subscription.upsert({
        where: { workspaceId: auth.workspaceId },
        update: {
          plan: targetPlan,
          status: 'active',
          currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
        },
        create: {
          workspaceId: auth.workspaceId,
          plan: targetPlan,
          status: 'active',
          currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
        },
      });

      const updatedWorkspace = await prisma.workspace.update({
        where: { id: auth.workspaceId },
        data: {
          aiCredits: { increment: creditsToAdd },
        },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully upgraded to ${targetPlan} plan!`,
        checkoutUrl: `/dashboard/billing?status=success&plan=${targetPlan.toLowerCase()}`,
        plan: targetPlan,
        newCredits: updatedWorkspace.aiCredits,
      });
    }

    // In-memory fallback
    store.workspace.plan = targetPlan;
    store.workspace.aiCredits += creditsToAdd;

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to ${targetPlan} plan!`,
      checkoutUrl: `/dashboard/billing?status=success&plan=${targetPlan.toLowerCase()}`,
      plan: store.workspace.plan,
      newCredits: store.workspace.aiCredits,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to initiate checkout' }, { status: 500 });
  }
}
