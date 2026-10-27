import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/api-auth';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await params;
  const auth = await requireApiAuth('EDITOR');
  if (auth instanceof NextResponse) return auth;

  // Do not treat a token or a feature flag as proof of provider support.
  // A real adapter must be implemented before this route mutates post state.
  return NextResponse.json(
    {
      error: 'Social publishing is not available yet. No provider request was made and the post was not changed.',
    },
    { status: 501 },
  );
}
