import { NextResponse } from 'next/server';
import { store } from '@/lib/db';

export async function GET() {
  const publishedPosts = store.posts.filter((p) => p.status === 'PUBLISHED');

  const totalImpressions = publishedPosts.reduce((acc, p) => acc + (p.metrics?.impressions || 0), 0);
  const totalReach = publishedPosts.reduce((acc, p) => acc + (p.metrics?.reach || 0), 0);
  const totalLikes = publishedPosts.reduce((acc, p) => acc + (p.metrics?.likes || 0), 0);
  const totalComments = publishedPosts.reduce((acc, p) => acc + (p.metrics?.comments || 0), 0);
  const totalShares = publishedPosts.reduce((acc, p) => acc + (p.metrics?.shares || 0), 0);

  const totalEngagement = totalLikes + totalComments + totalShares;
  const engagementRate = totalReach > 0 ? ((totalEngagement / totalReach) * 100).toFixed(1) : '0.0';

  const scheduledCount = store.posts.filter((p) => p.status === 'SCHEDULED').length;
  const draftCount = store.posts.filter((p) => p.status === 'DRAFT').length;

  return NextResponse.json({
    metrics: {
      totalImpressions,
      totalReach,
      totalEngagement,
      engagementRate: `${engagementRate}%`,
      publishedCount: publishedPosts.length,
      scheduledCount,
      draftCount,
      activeChannelsCount: store.channels.filter((c) => c.isActive).length,
      unreadInboxCount: store.threads.filter((t) => !t.isRead).length,
    },
    recentPosts: store.posts.slice(0, 5),
  });
}
