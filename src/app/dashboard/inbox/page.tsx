'use client';

import React, { useEffect, useState } from 'react';
import {
  Inbox,
  Sparkles,
  Send,
  Search,
  Filter,
  CheckCircle2,
  Tag,
  Clock,
  Bot,
  User,
  Share2,
  Plus,
} from 'lucide-react';
import { DashboardTopbar } from '@/components/DashboardTopbar';
import { formatDateTime } from '@/lib/utils';

export default function InboxPage() {
  const [threads, setThreads] = useState<any[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>('th_1');
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [isAiDrafting, setIsAiDrafting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  useEffect(() => {
    fetchThreads();
  }, []);

  async function fetchThreads() {
    try {
      const res = await fetch('/api/inbox/threads');
      const data = await res.json();
      setThreads(data.threads || []);
      if (data.threads?.length > 0 && !activeThreadId) {
        setActiveThreadId(data.threads[0].id);
      }
    } catch {}
  }

  // Filter threads by search query & platform
  const filteredThreads = threads.filter((t) => {
    const matchesSearch =
      t.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.messages.some((m: any) => m.content.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPlatform =
      platformFilter === 'ALL' || t.platform.toUpperCase() === platformFilter.toUpperCase();

    return matchesSearch && matchesPlatform;
  });

  const activeThread = threads.find((t) => t.id === activeThreadId) || filteredThreads[0] || threads[0];

  async function handleAiDraft() {
    if (!activeThread) return;
    setIsAiDrafting(true);

    try {
      const res = await fetch(`/api/inbox/threads/${activeThread.id}/ai`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.suggestion) {
        setReplyText(data.suggestion);
      }
    } catch {
      alert('AI Reply drafting failed');
    } finally {
      setIsAiDrafting(false);
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || !activeThread) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/inbox/threads/${activeThread.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyText }),
      });

      if (res.ok) {
        setReplyText('');
        fetchThreads();
      }
    } catch {
      alert('Failed to send reply');
    } finally {
      setIsSending(false);
    }
  }

  async function handleAddTag(e: React.FormEvent) {
    e.preventDefault();
    if (!newTagInput.trim() || !activeThread) return;

    const updatedLabels = Array.from(new Set([...(activeThread.labels || []), newTagInput.trim()]));
    try {
      const res = await fetch(`/api/inbox/threads/${activeThread.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labels: updatedLabels }),
      });
      if (res.ok) {
        activeThread.labels = updatedLabels;
        setNewTagInput('');
        setShowTagInput(false);
      }
    } catch {}
  }

  return (
    <>
      <DashboardTopbar
        title="Unified Customer Inbox"
        subtitle="Live multi-channel messaging stream with 1-click NVIDIA NIM AI suggestions"
      />

      <main className="p-6 max-w-7xl mx-auto w-full flex-1 flex flex-col">
        {/* Autopilot & Metrics Bar */}
        <div className="mb-4 p-4 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground flex items-center gap-2">
                <span>NVIDIA NIM Autopilot Mode</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand/20 text-brand font-semibold">
                  {autopilotEnabled ? 'AUTOMATED LIVE' : 'HUMAN REVIEW CO-PILOT'}
                </span>
              </div>
              <p className="text-[11px] text-foreground-muted">
                Model: <strong>openai/gpt-oss-20b</strong> with brand context knowledge protection.
              </p>
            </div>
          </div>

          <button
            onClick={() => setAutopilotEnabled(!autopilotEnabled)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              autopilotEnabled
                ? 'bg-brand text-white border-brand shadow-sm shadow-brand/20'
                : 'bg-surface-2 text-foreground-muted border-border hover:text-foreground'
            }`}
          >
            {autopilotEnabled ? 'Autopilot Active' : 'Enable Autopilot'}
          </button>
        </div>

        {/* 2-Pane Inbox View */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 bg-surface border border-border rounded-3xl overflow-hidden min-h-[580px]">
          {/* Thread List (1 col) */}
          <div className="border-r border-border flex flex-col bg-surface/50">
            {/* Search & Platform Filter */}
            <div className="p-4 border-b border-border space-y-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-foreground-subtle absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search sender or keywords..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-surface-2 border border-border text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-brand"
                />
              </div>

              {/* Platform Pills */}
              <div className="flex gap-1.5 overflow-x-auto text-[10px] font-semibold">
                {['ALL', 'INSTAGRAM', 'FACEBOOK', 'GMAIL'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatformFilter(p)}
                    className={`px-2 py-0.5 rounded-lg border transition-colors ${
                      platformFilter === p
                        ? 'bg-brand text-white border-brand'
                        : 'bg-surface-2 text-foreground-subtle border-border hover:text-foreground'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-border/60 overflow-y-auto flex-1">
              {filteredThreads.map((t) => {
                const isSelected = activeThread?.id === t.id;
                const lastMsg = t.messages[t.messages.length - 1];

                return (
                  <div
                    key={t.id}
                    onClick={() => setActiveThreadId(t.id)}
                    className={`p-4 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-surface-2 border-l-4 border-brand'
                        : 'hover:bg-surface-2/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-foreground">{t.contactName}</span>
                        {!t.isRead && (
                          <span className="w-2 h-2 rounded-full bg-brand" />
                        )}
                      </div>
                      <span className="text-[10px] text-foreground-subtle font-medium">
                        {t.platform}
                      </span>
                    </div>

                    <p className="text-xs text-foreground-muted line-clamp-1 mb-2">
                      {lastMsg ? lastMsg.content : 'No messages'}
                    </p>

                    <div className="flex flex-wrap gap-1">
                      {t.labels?.map((label: string) => (
                        <span
                          key={label}
                          className="px-1.5 py-0.5 rounded text-[9px] bg-surface-2 border border-border text-foreground-subtle font-medium"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}

              {filteredThreads.length === 0 && (
                <div className="p-8 text-center text-xs text-foreground-subtle">
                  No conversations match your filter
                </div>
              )}
            </div>
          </div>

          {/* Active Conversation Detail (2 cols) */}
          <div className="md:col-span-2 flex flex-col justify-between bg-surface-2/20">
            {activeThread ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-border bg-surface flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        activeThread.contactAvatar ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
                      }
                      alt={activeThread.contactName}
                      className="w-9 h-9 rounded-full object-cover border border-border"
                    />
                    <div>
                      <h3 className="font-bold text-sm text-foreground">{activeThread.contactName}</h3>
                      <div className="text-[10px] text-foreground-subtle flex items-center gap-2">
                        <span>Platform: {activeThread.platform}</span>
                        <span>•</span>
                        <span>Thread ID: {activeThread.id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {activeThread.labels?.map((label: string) => (
                      <span
                        key={label}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand/10 text-brand border border-brand/20"
                      >
                        {label}
                      </span>
                    ))}

                    {showTagInput ? (
                      <form onSubmit={handleAddTag} className="flex gap-1">
                        <input
                          type="text"
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          placeholder="Tag..."
                          className="px-2 py-0.5 text-[10px] rounded bg-surface-2 border border-border text-foreground w-16"
                        />
                        <button type="submit" className="text-[10px] px-1 text-brand font-bold">
                          ✓
                        </button>
                      </form>
                    ) : (
                      <button
                        onClick={() => setShowTagInput(true)}
                        className="px-2 py-0.5 rounded text-[10px] text-foreground-subtle hover:text-foreground border border-border bg-surface-2 flex items-center gap-0.5"
                      >
                        <Plus className="w-2.5 h-2.5" /> Tag
                      </button>
                    )}
                  </div>
                </div>

                {/* Message Stream */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  {activeThread.messages.map((m: any) => {
                    const isOutbound = m.direction === 'OUTBOUND';

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] text-foreground-subtle mb-1">
                          <span>{m.senderName}</span>
                          <span>•</span>
                          <span>{formatDateTime(m.sentAt)}</span>
                        </div>
                        <div
                          className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                            isOutbound
                              ? 'bg-brand text-white rounded-br-none shadow-sm'
                              : 'bg-surface-2 text-foreground border border-border rounded-bl-none'
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Composer & AI Assistant */}
                <div className="p-4 border-t border-border bg-surface space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-foreground-muted">
                      Reply as <strong>Brew Haven Coffee</strong>
                    </span>

                    <button
                      type="button"
                      disabled={isAiDrafting}
                      onClick={handleAiDraft}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand/10 text-brand hover:bg-brand/20 disabled:opacity-50 text-xs font-semibold border border-brand/20 transition-all shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {isAiDrafting ? 'Querying NVIDIA NIM...' : 'Draft Reply with NVIDIA NIM'}
                    </button>
                  </div>

                  <form onSubmit={handleSendReply} className="flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your message or click 'Draft Reply with NVIDIA NIM'..."
                      className="flex-1 px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:border-brand"
                    />
                    <button
                      type="submit"
                      disabled={isSending || !replyText.trim()}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-brand/20 transition-all shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-foreground-subtle text-xs">
                Select a conversation from the left to view messages
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
