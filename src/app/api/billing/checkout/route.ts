import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/api-auth';

export async function POST(req: Request) {
  try {
    const auth = await requireApiAuth('ADMIN');
    if (auth instanceof NextResponse) return auth;

    const { planId } = await req.json();

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    }

    void auth;
    return NextResponse.json(
      {
        error: 'Billing checkout is not available yet. No payment was processed and no subscription or credits were changed.',
      },
      { status: 501 },
    );
  } catch (error) {
    return NextResponse.json({ error: 'Failed to initiate checkout' }, { status: 500 });
  }
}
