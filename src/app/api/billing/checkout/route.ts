import { NextResponse } from 'next/server';
import { store } from '@/features/testing/store';
import { requireApiAuth } from '@/lib/api-auth';

export async function POST(req: Request) {
  try {
    const auth = await requireApiAuth('ADMIN');
    if (auth instanceof NextResponse) return auth;
    if (auth) {
      return NextResponse.json({ error: 'Billing provider integration is not configured yet' }, { status: 501 });
    }
    const { planId, interval } = await req.json();

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    }

    // Update in-memory plan
    store.workspace.plan = planId.toUpperCase() === 'SCALE' ? 'SCALE' : 'STARTER';
    store.workspace.aiCredits += planId.toUpperCase() === 'SCALE' ? 2500 : 500;

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to ${planId.toUpperCase()} plan!`,
      checkoutUrl: `/dashboard/billing?status=success&plan=${planId}`,
      plan: store.workspace.plan,
      newCredits: store.workspace.aiCredits,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to initiate checkout' }, { status: 500 });
  }
}
