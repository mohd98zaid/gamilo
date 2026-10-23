import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/api-auth';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await params;
  const auth = await requireApiAuth('EDITOR');
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ error: 'Publishing provider integration is not configured yet' }, { status: 501 });
}
