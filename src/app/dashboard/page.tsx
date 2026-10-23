'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Eye,
  MessageSquare,
  Calendar,
  Share2,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Inbox,
} from 'lucide-react';
import { DashboardTopbar } from '@/components/DashboardTopbar';
import { formatDateTime } from '@/lib/utils';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [workspaceName, setWorkspaceName] = useState('Workspace');

  useEffect(() => {
    fetch('/api/analytics/overview')
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => setWorkspaceName(d?.workspace?.name || 'Workspace'))
      .catch(() => {});
  }, []);

  const metrics = data?.metrics || {
    totalImpressions: 0,
    totalReach: 0,
    totalEngagement: 0,
    engagementRate: '0.0%',
    scheduledCount: 0,
    activeChannelsCount: 0,
    unreadInboxCount: 0,
  };
  const recentPosts = data?.recentPosts || [];

  return (
    <>
      <DashboardTopbar
        title="Workspace Overview"
        subtitle="Manage your social presence and customer conversations"
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Welcome / Brand Banner */}
        <div className="rounded-3xl p-6 bg-gradient-to-r from-surface to-surface-2 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <span className="text-xl font-bold text-foreground">{workspaceName}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand font-semibold border border-brand/20">
                 Workspace
              </span>
            </div>
            <p className="text-xs text-foreground-muted">
               {metrics.activeChannelsCount} connected channel{metrics.activeChannelsCount === 1 ? '' : 's'}.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard/posts/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand hover:bg-brand-600 text-white text-xs font-bold transition-all shadow-md shadow-brand/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Schedule Post
            </Link>
            <Link
              href="/dashboard/inbox"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-border text-foreground hover:bg-surface-2 text-xs font-semibold transition-all"
            >
              <Inbox className="w-3.5 h-3.5 text-brand" />
              Open Inbox ({metrics.unreadInboxCount})
            </Link>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl p-5 bg-surface border border-border">
            <div className="flex items-center justify-between text-xs text-foreground-muted mb-2">
              <span>Total Reach</span>
              <Eye className="w-4 h-4 text-brand" />
            </div>
            <div className="text-2xl font-extrabold text-foreground">{metrics.totalReach.toLocaleString()}</div>
            <div className="text-[11px] text-brand font-medium mt-1 flex items-center gap-1">
               <TrendingUp className="w-3 h-3" /> Derived from persisted analytics
            </div>
          </div>

          <div className="rounded-2xl p-5 bg-surface border border-border">
            <div className="flex items-center justify-between text-xs text-foreground-muted mb-2">
              <span>Engagements</span>
              <MessageSquare className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-foreground">{metrics.totalEngagement}</div>
            <div className="text-[11px] text-foreground-subtle mt-1 font-medium">
              Rate: <span className="text-foreground">{metrics.engagementRate}</span>
            </div>
          </div>

          <div className="rounded-2xl p-5 bg-surface border border-border">
            <div className="flex items-center justify-between text-xs text-foreground-muted mb-2">
              <span>Queued Posts</span>
              <Calendar className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-extrabold text-foreground">{metrics.scheduledCount}</div>
            <div className="text-[11px] text-foreground-subtle mt-1">
               Scheduled content in your workspace
            </div>
          </div>

          <div className="rounded-2xl p-5 bg-surface border border-border">
            <div className="flex items-center justify-between text-xs text-foreground-muted mb-2">
              <span>Active Channels</span>
              <Share2 className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-extrabold text-foreground">{metrics.activeChannelsCount}</div>
            <div className="text-[11px] text-brand mt-1 font-medium">Provider status is shown per channel</div>
          </div>
        </div>

        {/* Content & Inbox split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent & Upcoming Posts (2 cols) */}
          <div className="lg:col-span-2 rounded-2xl bg-surface border border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Content Schedule</h3>
                <p className="text-xs text-foreground-muted">Upcoming social posts across your accounts</p>
              </div>
              <Link href="/dashboard/calendar" className="text-xs text-brand hover:underline font-semibold">
                View Calendar &rarr;
              </Link>
            </div>

            <div className="space-y-3">
              {recentPosts.length === 0 ? (
                <div className="p-6 rounded-xl bg-surface-2/40 border border-border text-xs text-foreground-subtle">
                  No persisted posts yet. Create your first post to populate this schedule.
                </div>
              ) : recentPosts.slice(0, 2).map((post: any) => (
                <div key={post.id} className="p-4 rounded-xl bg-surface-2/60 border border-border flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand/10 text-brand border border-brand/20">{post.status}</span>
                    <p className="text-xs text-foreground leading-relaxed line-clamp-2">{post.caption}</p>
                  </div>
                  <span className="text-[11px] text-foreground-subtle font-medium bg-surface px-2 py-1 rounded border border-border shrink-0">Post</span>
                </div>
              ))}
            </div>
          </div>

          {/* Inbox Activity Widget (1 col) */}
          <div className="rounded-2xl bg-surface border border-border p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">Unified Inbox</h3>
                  <p className="text-xs text-foreground-muted">Recent customer inquiries</p>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-brand animate-ping" />
              </div>

              <div className="p-6 rounded-xl bg-surface-2/40 border border-border text-xs text-foreground-subtle">
                {metrics.unreadInboxCount > 0 ? `${metrics.unreadInboxCount} unread conversation${metrics.unreadInboxCount === 1 ? '' : 's'} available.` : 'No unread conversations.'}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <Link
                href="/dashboard/inbox"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface-2 hover:bg-surface border border-border text-xs font-semibold text-foreground transition-colors"
              >
                Go to Inbox
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
