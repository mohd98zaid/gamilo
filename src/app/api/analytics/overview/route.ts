import { NextResponse } from 'next/server';
import { store } from '@/features/testing/store';
import { requireApiAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  if (auth) {
    const [posts, activeChannelsCount, unreadInboxCount] = await Promise.all([
      prisma.post.findMany({ where: { workspaceId: auth.workspaceId }, include: { metrics: { orderBy: { recordedAt: 'desc' }, take: 1 }, channels: true }, orderBy: { createdAt: 'desc' } }),
      prisma.channel.count({ where: { workspaceId: auth.workspaceId, isActive: true } }),
      prisma.thread.count({ where: { workspaceId: auth.workspaceId, isRead: false } }),
    ]);
    const published = posts.filter((post) => post.status === 'PUBLISHED');
    const metrics = published.reduce((sum, post) => { const metric = post.metrics[0]; return { impressions: sum.impressions + (metric?.impressions ?? 0), reach: sum.reach + (metric?.reach ?? 0), likes: sum.likes + (metric?.likes ?? 0), comments: sum.comments + (metric?.comments ?? 0), shares: sum.shares + (metric?.shares ?? 0) }; }, { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0 });
    const engagement = metrics.likes + metrics.comments + metrics.shares;
    return NextResponse.json({ metrics: { totalImpressions: metrics.impressions, totalReach: metrics.reach, totalEngagement: engagement, engagementRate: `${metrics.reach ? ((engagement / metrics.reach) * 100).toFixed(1) : '0.0'}%`, publishedCount: published.length, scheduledCount: posts.filter((post) => post.status === 'SCHEDULED').length, draftCount: posts.filter((post) => post.status === 'DRAFT').length, activeChannelsCount, unreadInboxCount }, recentPosts: posts.slice(0, 5).map((post) => ({ ...post, mediaUrls: JSON.parse(post.mediaUrls), channelIds: post.channels.map((channel) => channel.channelId), metrics: post.metrics[0] ?? undefined })) });
  }
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
