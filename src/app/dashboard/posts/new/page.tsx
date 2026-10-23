'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Sparkles,
  Calendar,
  Clock,
  Send,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Eye,
  Share2,
} from 'lucide-react';
import { DashboardTopbar } from '@/components/DashboardTopbar';

function CreatePostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [caption, setCaption] = useState('');
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [workspaceName, setWorkspaceName] = useState('Workspace');
  const [mediaUrl, setMediaUrl] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);

  React.useEffect(() => {
    const c = searchParams.get('caption');
    // Hydrate form state from calendar query parameters once the client mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (c) setCaption(c);
    const d = searchParams.get('date');
    if (d) setScheduledAt(`${d}T09:00`);
  }, [searchParams]);

  React.useEffect(() => {
    fetch('/api/channels')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setChannels(data?.channels || []))
      .catch(() => setChannels([]));
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setWorkspaceName(data?.workspace?.name || 'Workspace'))
      .catch(() => {});
  }, []);

  function toggleChannel(id: string) {
    if (selectedChannels.includes(id)) {
      setSelectedChannels(selectedChannels.filter((c) => c !== id));
    } else {
      setSelectedChannels([...selectedChannels, id]);
    }
  }

  async function handleAiGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!aiTopic.trim()) return;

    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiTopic,
          type: 'caption',
          platform: 'instagram',
        }),
      });
      const data = await res.json();
      if (data.text) {
        setCaption(data.text);
        setShowAiModal(false);
      }
    } catch (err) {
      alert('AI generation failed. Please try again.');
    } finally {
      setIsAiLoading(false);
    }
  }

  async function handleSaveOrSchedule(status: 'DRAFT' | 'SCHEDULED') {
    if (!caption.trim()) {
      alert('Please enter a caption');
      return;
    }
    if (selectedChannels.length === 0) {
      alert('Please select at least one channel');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption,
          channelIds: selectedChannels,
          mediaUrls: mediaUrl ? [mediaUrl] : [],
          scheduledAt: scheduledAt || null,
          status,
        }),
      });

      if (res.ok) {
        router.push('/dashboard/calendar');
      } else {
        const d = await res.json();
        alert(`Error: ${JSON.stringify(d.error || 'Failed to save post')}`);
      }
    } catch {
      alert('Failed to save post');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <DashboardTopbar
        title="Create & Schedule Post"
        subtitle="Create drafts and schedule posts for connected channels"
      />

      <main className="p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Composer Form (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Target Channels */}
          <div className="rounded-2xl p-6 bg-surface border border-border">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-3">
              Publishing Targets
            </label>
            <div className="flex flex-wrap gap-3">
              {channels.length === 0 ? (
                <span className="text-xs text-foreground-subtle">Connect a channel before creating a post.</span>
              ) : channels.map((channel) => (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => toggleChannel(channel.id)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    selectedChannels.includes(channel.id)
                      ? 'border-brand bg-brand/10 text-brand shadow-sm'
                      : 'border-border bg-surface-2 text-foreground-muted'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-brand" />
                  <span>{channel.platform}: {channel.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Caption Editor */}
          <div className="rounded-2xl p-6 bg-surface border border-border space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Post Caption
              </label>
              <button
                type="button"
                onClick={() => setShowAiModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand/10 text-brand hover:bg-brand/20 text-xs font-semibold border border-brand/20 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Write with NVIDIA NIM
              </button>
            </div>

            <textarea
              rows={5}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write an engaging caption, or click 'Write with NVIDIA NIM' above..."
              className="w-full p-4 rounded-xl bg-surface-2 border border-border text-foreground text-sm focus:outline-none focus:border-brand resize-none leading-relaxed"
            />

            <div className="flex justify-between text-xs text-foreground-subtle">
              <span>Supports hashtags and emojis</span>
              <span>{caption.length} / 2,200 characters</span>
            </div>
          </div>

          {/* Media Attachments */}
          <div className="rounded-2xl p-6 bg-surface border border-border space-y-3">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
              Media Attachment (Image URL)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          {/* Scheduling Options */}
          <div className="rounded-2xl p-6 bg-surface border border-border space-y-4">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
              Schedule Execution
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:border-brand"
              />
              <span className="text-xs text-foreground-subtle self-center">
                Leave blank to publish immediately or save as draft.
              </span>
            </div>

            <div className="pt-4 border-t border-border flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveOrSchedule(scheduledAt ? 'SCHEDULED' : 'DRAFT')}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-brand/20 transition-all"
              >
                <Send className="w-4 h-4" />
                {scheduledAt ? 'Schedule Post' : 'Save Draft'}
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveOrSchedule('DRAFT')}
                className="px-5 py-2.5 rounded-xl bg-surface-2 hover:bg-surface border border-border text-foreground font-semibold text-xs transition-colors"
              >
                Save as Draft
              </button>
            </div>
          </div>
        </div>

        {/* Live Preview Card (1 Col) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider">
            <Eye className="w-4 h-4 text-brand" /> Live Post Preview
          </div>

          <div className="rounded-3xl border border-border bg-surface overflow-hidden shadow-xl">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-surface-2 border border-border flex items-center justify-center text-xs font-bold text-foreground">
                  {workspaceName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">{workspaceName}</div>
                  <div className="text-[10px] text-foreground-subtle">Connected channels</div>
                </div>
              </div>
            </div>

            {/* Media Image */}
            {mediaUrl ? (
              <img
                src={mediaUrl}
                alt="Post Preview"
                className="w-full aspect-square object-cover bg-surface-2"
              />
            ) : (
              <div className="w-full aspect-square bg-surface-2 flex items-center justify-center text-foreground-subtle text-xs">
                No Media Attached
              </div>
            )}

            {/* Caption Preview */}
            <div className="p-4 space-y-2">
              <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                 <strong className="text-brand">{workspaceName}</strong>{' '}
                {caption || 'Your drafted caption will appear here in real time...'}
              </p>
              <div className="text-[10px] text-foreground-subtle pt-2">
                Preview reflects live post formatting
              </div>
            </div>
          </div>
        </div>

        {/* NVIDIA NIM Modal */}
        {showAiModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface border border-brand/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-brand font-bold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Draft Caption with NVIDIA NIM AI</span>
                </div>
                <button
                  onClick={() => setShowAiModal(false)}
                  className="text-foreground-subtle hover:text-foreground text-xs"
                >
                  ✕ Close
                </button>
              </div>

              <form onSubmit={handleAiGenerate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                    What is this post about?
                  </label>
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="e.g. Free cinnamon bun with any medium pour-over this Friday"
                    required
                    className="w-full p-3 rounded-xl bg-surface-2 border border-border text-foreground text-sm focus:outline-none focus:border-brand"
                  />
                </div>

                <div className="p-3 rounded-xl bg-surface-2 text-xs text-foreground-muted space-y-1">
                   <p><strong>Configured Model:</strong> Server-side provider configuration</p>
                   <p><strong>Brand Context:</strong> Workspace settings</p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAiModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-foreground-muted hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAiLoading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-600 disabled:opacity-60 text-white font-bold text-xs shadow-md shadow-brand/20"
                  >
                    {isAiLoading ? 'Generating with NIM...' : 'Generate Caption'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default function CreatePostPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-foreground-muted">Loading post composer...</div>}>
      <CreatePostContent />
    </React.Suspense>
  );
}
