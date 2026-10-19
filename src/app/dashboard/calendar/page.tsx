'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Sparkles,
  Share2,
  CheckCircle2,
  Send,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { DashboardTopbar } from '@/components/DashboardTopbar';

export default function CalendarPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    try {
      const res = await fetch('/api/posts');
      const d = await res.json();
      setPosts(d.posts || []);
    } catch {}
  }

  async function handlePublishImmediately(id: string) {
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/posts/${id}/publish`, { method: 'POST' });
      if (res.ok) {
        setSelectedPost(null);
        fetchPosts();
      }
    } catch {
      alert('Failed to publish');
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleDeletePost(id: string) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedPost(null);
        fetchPosts();
      }
    } catch {
      alert('Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  }

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const calendarDays = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push({ day: null });
  }
  for (let d = 1; d <= totalDays; d++) {
    calendarDays.push({
      day: d,
      dateString: new Date(year, month, d).toISOString().split('T')[0],
    });
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-brand/10 text-brand border-brand/20';
      case 'SCHEDULED':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'FAILED':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-surface-2 text-foreground-subtle border-border';
    }
  }

  return (
    <>
      <DashboardTopbar
        title="Content Calendar"
        subtitle="Visual monthly schedule across all connected social channels"
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface p-4 rounded-2xl border border-border">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-foreground">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center rounded-xl bg-surface-2 border border-border">
              <button
                onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                className="p-1.5 hover:text-foreground text-foreground-muted"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-2.5 py-1 text-xs font-semibold text-foreground-muted hover:text-foreground"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                className="p-1.5 hover:text-foreground text-foreground-muted"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/posts/new"
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-brand hover:bg-brand-600 text-white px-4 py-2 rounded-xl transition-all shadow-md shadow-brand/20"
            >
              <Plus className="w-4 h-4" />
              Schedule Post
            </Link>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-border bg-surface-2 text-center text-xs font-bold text-foreground-muted py-2.5">
            {daysOfWeek.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-border/60 min-h-[500px]">
            {calendarDays.map((item, idx) => {
              if (!item.day) {
                return <div key={`empty_${idx}`} className="bg-surface/30 min-h-[110px]" />;
              }

              const dayPosts = posts.filter((p) => {
                const targetDate = p.scheduledAt || p.publishedAt || p.createdAt;
                return targetDate && targetDate.startsWith(item.dateString!);
              });

              const isToday =
                new Date().toISOString().split('T')[0] === item.dateString;

              return (
                <div
                  key={item.day}
                  className={`p-2 min-h-[110px] flex flex-col justify-between transition-colors hover:bg-surface-2/30 ${
                    isToday ? 'bg-brand/5' : ''
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span
                      className={`w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday ? 'bg-brand text-white' : 'text-foreground-muted'
                      }`}
                    >
                      {item.day}
                    </span>
                    {dayPosts.length > 0 && (
                      <span className="text-[10px] text-foreground-subtle font-normal">
                        {dayPosts.length} post{dayPosts.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Day Posts */}
                  <div className="space-y-1.5 my-1 overflow-y-auto max-h-[80px]">
                    {dayPosts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPost(p)}
                        className="p-1.5 rounded-lg bg-surface-2 border border-border/80 text-[11px] leading-tight cursor-pointer hover:border-brand transition-colors"
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${getStatusBadge(
                              p.status
                            )}`}
                          >
                            {p.status}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-foreground font-medium">{p.caption}</p>
                      </div>
                    ))}
                  </div>

                  <Link
                    href={`/dashboard/posts/new?date=${item.dateString}`}
                    className="text-[10px] text-foreground-subtle hover:text-brand flex items-center gap-0.5 opacity-0 hover:opacity-100 transition-opacity"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Post Detail Modal */}
        {selectedPost && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold border ${getStatusBadge(
                      selectedPost.status
                    )}`}
                  >
                    {selectedPost.status}
                  </span>
                  <span className="text-xs text-foreground-muted">Post ID: {selectedPost.id}</span>
                </div>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="text-foreground-subtle hover:text-foreground text-xs"
                >
                  ✕
                </button>
              </div>

              {selectedPost.mediaUrls?.[0] && (
                <img
                  src={selectedPost.mediaUrls[0]}
                  alt="Post preview"
                  className="w-full h-48 object-cover rounded-2xl bg-surface-2"
                />
              )}

              <div>
                <span className="text-[11px] font-bold text-foreground-subtle uppercase tracking-wider block mb-1">
                  Caption
                </span>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap bg-surface-2 p-3.5 rounded-xl border border-border">
                  {selectedPost.caption}
                </p>
              </div>

              {selectedPost.metrics && (
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-surface-2 border border-border">
                    <span className="font-extrabold text-foreground block">{selectedPost.metrics.reach}</span>
                    <span className="text-[10px] text-foreground-subtle">Reach</span>
                  </div>
                  <div className="p-2 rounded-xl bg-surface-2 border border-border">
                    <span className="font-extrabold text-foreground block">{selectedPost.metrics.likes}</span>
                    <span className="text-[10px] text-foreground-subtle">Likes</span>
                  </div>
                  <div className="p-2 rounded-xl bg-surface-2 border border-border">
                    <span className="font-extrabold text-foreground block">{selectedPost.metrics.comments}</span>
                    <span className="text-[10px] text-foreground-subtle">Comments</span>
                  </div>
                  <div className="p-2 rounded-xl bg-surface-2 border border-border">
                    <span className="font-extrabold text-foreground block">{selectedPost.metrics.shares}</span>
                    <span className="text-[10px] text-foreground-subtle">Shares</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <button
                  disabled={isDeleting}
                  onClick={() => handleDeletePost(selectedPost.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>

                <div className="flex gap-2">
                  {selectedPost.status !== 'PUBLISHED' && (
                    <button
                      disabled={isPublishing}
                      onClick={() => handlePublishImmediately(selectedPost.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand hover:bg-brand-600 disabled:opacity-60 text-white font-bold text-xs shadow-md shadow-brand/20 transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isPublishing ? 'Publishing...' : 'Publish Now'}
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedPost(null)}
                    className="px-4 py-2 rounded-xl bg-surface-2 text-foreground text-xs font-semibold hover:bg-surface border border-border"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
