import { NextResponse } from 'next/server';
import { store } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const post = store.posts.find((p) => p.id === params.id);
  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }
  return NextResponse.json({ post });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const post = store.posts.find((p) => p.id === params.id);
  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  try {
    const updates = await req.json();
    Object.assign(post, updates);
    return NextResponse.json({ success: true, post });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const index = store.posts.findIndex((p) => p.id === params.id);
  if (index === -1) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  store.posts.splice(index, 1);
  return NextResponse.json({ success: true, message: 'Post deleted' });
}
