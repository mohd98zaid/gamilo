import { NextResponse } from 'next/server';
import { store } from '@/lib/db';

export async function POST(req: Request) {
  try {
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
