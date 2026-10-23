'use client';

import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Eye,
  MessageSquare,
  Share2,
  Heart,
  BarChart2,
  Calendar,
  ArrowUpRight,
} from 'lucide-react';
import { DashboardTopbar } from '@/components/DashboardTopbar';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/analytics/overview')
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(() => {});
  }, []);

  const metrics = data?.metrics || {
    totalImpressions: 0,
    totalReach: 0,
    totalEngagement: 0,
    engagementRate: '0.0%',
  };

  const topPosts = (data?.recentPosts || []).filter((post: any) => post.metrics).map((post: any) => ({
    title: post.caption,
    platform: post.channelIds?.join(', ') || 'Connected channels',
    likes: post.metrics.likes || 0,
    comments: post.metrics.comments || 0,
    shares: post.metrics.shares || 0,
    reach: post.metrics.reach || 0,
  }));

  return (
    <>
      <DashboardTopbar
        title="Marketing Analytics"
        subtitle="Audience reach, engagement rate, and per-post performance across connected channels"
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-surface border border-border">
            <div className="flex items-center justify-between text-xs text-foreground-muted mb-2">
              <span>Total Reach</span>
              <Eye className="w-4 h-4 text-brand" />
            </div>
            <div className="text-2xl font-extrabold text-foreground">{metrics.totalReach.toLocaleString()}</div>
            <div className="text-[11px] text-brand font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Provider-derived data
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-border">
            <div className="flex items-center justify-between text-xs text-foreground-muted mb-2">
              <span>Impressions</span>
              <BarChart2 className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-extrabold text-foreground">{metrics.totalImpressions.toLocaleString()}</div>
            <div className="text-[11px] text-brand font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Provider-derived data
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-border">
            <div className="flex items-center justify-between text-xs text-foreground-muted mb-2">
              <span>Engagement Rate</span>
              <Heart className="w-4 h-4 text-pink-400" />
            </div>
            <div className="text-2xl font-extrabold text-foreground">{metrics.engagementRate}</div>
            <div className="text-[11px] text-foreground-subtle mt-1 font-medium">No benchmark configured</div>
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-border">
            <div className="flex items-center justify-between text-xs text-foreground-muted mb-2">
              <span>Total Interactions</span>
              <MessageSquare className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-extrabold text-foreground">{metrics.totalEngagement}</div>
            <div className="text-[11px] text-foreground-subtle mt-1">Likes, comments & shares</div>
          </div>
        </div>

        {/* Top Performing Content */}
        <div className="rounded-2xl bg-surface border border-border p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-foreground">Top Performing Posts</h2>
            <p className="text-xs text-foreground-muted">Highest engagement content from recent campaigns</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2 text-foreground-muted uppercase font-bold border-b border-border">
                <tr>
                  <th className="p-3">Post Caption</th>
                  <th className="p-3">Platform</th>
                  <th className="p-3">Reach</th>
                  <th className="p-3">Likes</th>
                  <th className="p-3">Comments</th>
                  <th className="p-3">Shares</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-foreground">
                {topPosts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-foreground-subtle">No provider metrics are available yet.</td>
                  </tr>
                ) : topPosts.map((post: any, idx: number) => (
                  <tr key={idx} className="hover:bg-surface-2/30">
                    <td className="p-3 max-w-sm font-medium line-clamp-1">{post.title}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-2 border border-border">
                        {post.platform}
                      </span>
                    </td>
                    <td className="p-3 font-semibold">{post.reach.toLocaleString()}</td>
                    <td className="p-3">{post.likes}</td>
                    <td className="p-3">{post.comments}</td>
                    <td className="p-3">{post.shares}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
