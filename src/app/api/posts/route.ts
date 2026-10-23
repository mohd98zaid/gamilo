import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/api-auth';
import { createPostSchema, getPostRepository } from '@/features/posts';

export async function GET(req: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const workspaceId = auth?.workspaceId ?? '';
  const posts = await getPostRepository().list({ workspaceId, status });
  return NextResponse.json({ posts, total: posts.length });
}

export async function POST(req: Request) {
  try {
    const auth = await requireApiAuth('EDITOR');
    if (auth instanceof NextResponse) return auth;
    const json = await req.json();
    const parsed = createPostSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const input = parsed.data;
    const workspaceId = auth?.workspaceId ?? 'test-workspace';
    const result = await getPostRepository().create(workspaceId, input);
    if (!result.ok) {
      return NextResponse.json({ error: 'One or more channels are invalid for this workspace' }, { status: 400 });
    }
    return NextResponse.json({ success: true, post: result.post }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
