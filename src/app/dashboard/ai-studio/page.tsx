'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Copy,
  Check,
  Send,
  Share2,
  Mail,
  Hash,
  Layers,
  ArrowRight,
  Bot,
  Zap,
} from 'lucide-react';
import { DashboardTopbar } from '@/components/DashboardTopbar';

export default function AiStudioPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'caption' | 'email_subject' | 'outreach' | 'hashtags'>('caption');
  const [prompt, setPrompt] = useState('Weekend pastry special: Cardamom brioche buns fresh from 8 AM');
  const [platform, setPlatform] = useState('instagram');
  const [result, setResult] = useState('');
  const [modelUsed, setModelUsed] = useState('');
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setResult('');
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          type: activeTab,
          platform,
        }),
      });

      const data = await res.json();
      if (data.text) {
        setResult(data.text);
        setModelUsed(data.modelUsed || 'openai/gpt-oss-20b');
        setDurationMs(data.durationMs || 450);
      }
    } catch {
      alert('AI Generation request failed');
    } finally {
      setIsLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSendToPost() {
    router.push(`/dashboard/posts/new?caption=${encodeURIComponent(result)}`);
  }

  return (
    <>
      <DashboardTopbar
        title="AI Generation Studio"
        subtitle="Generate social captions, email sequences, subject lines, and hashtags with NVIDIA NIM"
      />

      <main className="p-6 max-w-5xl mx-auto w-full space-y-6">
        {/* Model Spec Card */}
        <div className="p-4 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground flex items-center gap-2">
                <span>NVIDIA NIM Engine</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand/20 text-brand font-semibold">
                  Primary: openai/gpt-oss-20b
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 text-foreground-subtle border border-border font-semibold">
                  Fallback: nemotron-3.5
                </span>
              </div>
              <p className="text-[11px] text-foreground-muted">
                Max tokens: 2048 · Temperature: 0.1 · Reasoning output parser active.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 border-b border-border pb-3">
          <button
            onClick={() => setActiveTab('caption')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'caption'
                ? 'bg-brand text-white shadow-sm'
                : 'text-foreground-muted hover:text-foreground bg-surface-2'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" /> Social Captions
          </button>

          <button
            onClick={() => setActiveTab('email_subject')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'email_subject'
                ? 'bg-brand text-white shadow-sm'
                : 'text-foreground-muted hover:text-foreground bg-surface-2'
            }`}
          >
            <Mail className="w-3.5 h-3.5" /> Subject Lines
          </button>

          <button
            onClick={() => setActiveTab('hashtags')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'hashtags'
                ? 'bg-brand text-white shadow-sm'
                : 'text-foreground-muted hover:text-foreground bg-surface-2'
            }`}
          >
            <Hash className="w-3.5 h-3.5" /> Hashtags
          </button>
        </div>

        {/* Studio Form & Results */}
        <div className="rounded-3xl p-6 bg-surface border border-border space-y-6">
          <form onSubmit={handleGenerate} className="space-y-4">
            {activeTab === 'caption' && (
              <div>
                <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                  Target Social Platform
                </label>
                <div className="flex gap-2">
                  {['instagram', 'facebook', 'tiktok', 'youtube'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlatform(p)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border capitalize ${
                        platform === p
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-border bg-surface-2 text-foreground-muted'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                {activeTab === 'caption'
                  ? 'What should this post be about?'
                  : activeTab === 'email_subject'
                  ? 'Email topic or proposition:'
                  : 'Core theme / industry for hashtags:'}
              </label>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter details here..."
                required
                className="w-full p-3.5 rounded-xl bg-surface-2 border border-border text-foreground text-sm focus:outline-none focus:border-brand resize-none leading-relaxed"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-foreground-subtle">
                Deducts 1 AI credit from your monthly allowance
              </span>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-600 disabled:opacity-60 text-white font-bold text-xs shadow-md shadow-brand/20 transition-all"
              >
                {isLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating with NIM...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate with NVIDIA NIM
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Generated Result Output */}
          {result && (
            <div className="p-5 rounded-2xl bg-surface-2 border border-brand/30 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-border/80">
                <span className="font-bold text-brand flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Generated Output
                </span>
                <span className="text-foreground-subtle text-[11px]">
                  Model: {modelUsed} ({durationMs}ms)
                </span>
              </div>

              <p className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {result}
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-2 border border-border text-foreground text-xs font-semibold flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-brand" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy Text'}
                </button>

                {activeTab === 'caption' && (
                  <button
                    onClick={handleSendToPost}
                    className="px-3.5 py-1.5 rounded-lg bg-brand hover:bg-brand-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send to Post Composer
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
