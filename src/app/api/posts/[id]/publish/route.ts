import { NextResponse } from 'next/server';
import { store } from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const post = store.posts.find((p) => p.id === params.id);
  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  // Simulate publishing workflow to Meta Graph API
  post.status = 'PUBLISHED';
  post.publishedAt = new Date().toISOString();
  post.metrics = {
    impressions: 1,
    reach: 1,
    likes: 0,
    comments: 0,
    shares: 0,
  };

  return NextResponse.json({
    success: true,
    message: 'Post published successfully to connected channels',
    post,
  });
}
