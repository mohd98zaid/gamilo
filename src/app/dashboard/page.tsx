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

  useEffect(() => {
    fetch('/api/analytics/overview')
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const metrics = data?.metrics || {
    totalImpressions: 1420,
    totalReach: 1180,
    totalEngagement: 225,
    engagementRate: '19.1%',
    scheduledCount: 1,
    activeChannelsCount: 2,
    unreadInboxCount: 1,
  };

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
              <span className="text-xl font-bold text-foreground">Brew Haven Coffee</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand font-semibold border border-brand/20">
                Active Trial
              </span>
            </div>
            <p className="text-xs text-foreground-muted">
              2 channels connected: <strong>@brewhaven.coffee</strong> & Facebook Page. AI replies enabled.
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
              <TrendingUp className="w-3 h-3" /> +14.2% vs last week
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
              Next post in <span className="text-foreground font-medium">18 hours</span>
            </div>
          </div>

          <div className="rounded-2xl p-5 bg-surface border border-border">
            <div className="flex items-center justify-between text-xs text-foreground-muted mb-2">
              <span>Active Channels</span>
              <Share2 className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-extrabold text-foreground">{metrics.activeChannelsCount}</div>
            <div className="text-[11px] text-brand mt-1 font-medium">IG + Facebook healthy</div>
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
              {/* Scheduled post preview */}
              <div className="p-4 rounded-xl bg-surface-2/60 border border-border flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      SCHEDULED
                    </span>
                    <span className="text-xs text-foreground-subtle flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Tomorrow at 8:00 AM
                    </span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed line-clamp-2">
                    Weekend pastry preview: Cinnamon cardamom brioche knots fresh from the oven tomorrow at 8 AM. Save this post! 🥐✨
                  </p>
                </div>
                <span className="text-[11px] text-foreground-subtle font-medium bg-surface px-2 py-1 rounded border border-border shrink-0">
                  Instagram
                </span>
              </div>

              {/* Published post preview */}
              <div className="p-4 rounded-xl bg-surface-2/40 border border-border/80 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand/10 text-brand border border-brand/20">
                      PUBLISHED
                    </span>
                    <span className="text-xs text-foreground-subtle">Yesterday</span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed line-clamp-2">
                    Fresh batch of Ethiopian Yirgacheffe roasted this morning! ☕ Notes of jasmine, bergamot, and sweet peach...
                  </p>
                </div>
                <div className="text-right text-[11px] text-foreground-subtle shrink-0">
                  <div className="font-semibold text-foreground">184 likes · 29 comments</div>
                  <span>IG & FB</span>
                </div>
              </div>
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

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-surface-2/80 border border-brand/20">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-foreground">sarah_adventures</span>
                    <span className="text-[10px] text-brand font-semibold">15m ago</span>
                  </div>
                  <p className="text-xs text-foreground-muted line-clamp-2">
                    "Do you have any gluten-free pastries tomorrow? Also extra charge for oat milk?"
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-foreground-subtle font-medium">Instagram DM</span>
                    <Link
                      href="/dashboard/inbox"
                      className="text-[11px] font-bold text-brand hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> Draft AI Reply
                    </Link>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface-2/40 border border-border">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-foreground">David Miller</span>
                    <span className="text-[10px] text-foreground-subtle">2h ago</span>
                  </div>
                  <p className="text-xs text-foreground-muted line-clamp-1">
                    "Looking to host a team coffee workshop for 12 people..."
                  </p>
                  <span className="text-[10px] text-foreground-subtle font-medium mt-1 block">Facebook Inquiry</span>
                </div>
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
