import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/api-auth';
import { getPostRepository, updatePostSchema } from '@/features/posts';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await params;
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const workspaceId = auth?.workspaceId ?? 'test-workspace';
  const post = await getPostRepository().findById({ workspaceId, id });
  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }
  return NextResponse.json({ post });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await params;
  const auth = await requireApiAuth('EDITOR');
  if (auth instanceof NextResponse) return auth;
  const workspaceId = auth?.workspaceId ?? 'test-workspace';
  try {
    const parsed = updatePostSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }
    const updated = await getPostRepository().update({ workspaceId, id }, parsed.data);
    if (!updated) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    return NextResponse.json({ success: true, post: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await params;
  const auth = await requireApiAuth('EDITOR');
  if (auth instanceof NextResponse) return auth;
  const workspaceId = auth?.workspaceId ?? 'test-workspace';
  const deleted = await getPostRepository().delete({ workspaceId, id });
  if (!deleted) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, message: 'Post deleted' });
}
