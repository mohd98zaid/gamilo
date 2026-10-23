'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Share2,
  Inbox,
  Palette,
  Video,
  Globe,
  Search,
  Mail,
  MessageCircle,
  CheckCircle2,
  Bot,
  Zap,
  TrendingUp,
  Shield,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';

export default function LandingPage() {
  const [demoPrompt, setDemoPrompt] = useState('');
  const [demoPlatform, setDemoPlatform] = useState('instagram');
  const [demoResult, setDemoResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleDemoGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!demoPrompt.trim()) return;

    setIsLoading(true);
    setDemoResult('');
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: demoPrompt,
          type: 'caption',
          platform: demoPlatform,
        }),
      });
      const data = await res.json();
      if (data.text) {
        setDemoResult(data.text);
      } else {
        setDemoResult('The configured AI provider did not return content.');
      }
    } catch {
      setDemoResult('AI generation is unavailable until an authenticated workspace and provider configuration are available.');
    } finally {
      setIsLoading(false);
    }
  }

  const modules = [
    {
      title: 'Social Publishing',
      desc: 'Schedule and auto-publish to Instagram, Facebook, TikTok, and YouTube from one calendar.',
      icon: Share2,
      badge: 'Core MVP',
    },
    {
      title: 'Unified Inbox',
      desc: 'All DMs, comments, emails, and WhatsApp messages in one clean feed with 1-click AI replies.',
      icon: Inbox,
      badge: 'Core MVP',
    },
    {
      title: 'Graphics Studio',
      desc: 'In-app Canva alternative with post templates, brand kits, and instant calendar scheduling.',
      icon: Palette,
      badge: 'Phase 3',
    },
    {
      title: 'AI Video Studio',
      desc: 'Turn scripts into short-form videos with automatic captions, voice-overs, and TikTok exports.',
      icon: Video,
      badge: 'Phase 3',
    },
    {
      title: 'Website Builder',
      desc: 'Visual drag-and-drop landing page editor with AI content generation and custom domains.',
      icon: Globe,
      badge: 'Phase 3',
    },
    {
      title: 'AI Lead Finder',
      desc: 'Discover local B2B prospects by industry, location, and verified email contacts.',
      icon: Search,
      badge: 'Phase 3',
    },
    {
      title: 'Email Outreach',
      desc: 'Multi-step cold outreach campaigns connected to Gmail with automatic reply detection.',
      icon: Mail,
      badge: 'Phase 2',
    },
    {
      title: 'WhatsApp Automation',
      desc: 'Two-way WhatsApp Cloud API messaging, automated broadcasts, and customer follow-ups.',
      icon: MessageCircle,
      badge: 'Phase 2',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-brand selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Glow backdrop */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center">
          <div className="w-[600px] h-[350px] bg-brand/10 blur-[130px] rounded-full" />
        </div>

        {/* Announcement Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-2 border border-border text-xs font-medium text-foreground-muted mb-8 shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-brand animate-pulse" />
          <span>Built for Small Businesses & Marketing Agencies</span>
          <ChevronRight className="w-3.5 h-3.5 text-foreground-subtle" />
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.1]">
          One platform to{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-emerald-300">
            create, publish,
          </span>{' '}
          reach out, and reply.
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-foreground-muted max-w-2xl mx-auto leading-relaxed">
          Replace 8 disconnected tools. Manage your social calendar, unified customer inbox,
          outreach sequences, and AI content in a single high-performance workspace.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-brand hover:bg-brand-600 text-white font-bold text-base transition-all shadow-lg shadow-brand/25 hover:scale-[1.02] active:scale-[0.98]"
          >
             Start Free Trial
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/pricing"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-surface-2 hover:bg-surface border border-border text-foreground font-semibold text-base transition-colors"
          >
            View Pricing (30-Day Free Trial)
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-xs text-foreground-subtle font-medium">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-brand" /> 30-day full access trial
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-brand" /> Powered by NVIDIA NIM AI
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-brand" /> AES-256 encrypted tokens
          </span>
        </div>
      </section>

      {/* Interactive Live AI Playground */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="rounded-2xl border border-brand/30 bg-surface/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-brand/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles className="w-32 h-32 text-brand" />
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-brand uppercase tracking-wider mb-2">
            <Bot className="w-4 h-4" /> Live AI Engine Test
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Test NVIDIA NIM In Real Time
          </h2>
          <p className="text-xs sm:text-sm text-foreground-muted mb-6">
             Sign in to an authenticated workspace to invoke the configured AI provider.
          </p>

          <form onSubmit={handleDemoGenerate} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={demoPrompt}
                onChange={(e) => setDemoPrompt(e.target.value)}
                placeholder="Enter post topic..."
                className="flex-1 px-4 py-3 rounded-xl bg-surface-2 border border-border text-foreground text-sm focus:outline-none focus:border-brand"
              />
              <select
                value={demoPlatform}
                onChange={(e) => setDemoPlatform(e.target.value)}
                className="px-4 py-3 rounded-xl bg-surface-2 border border-border text-foreground text-sm focus:outline-none focus:border-brand"
              >
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
              </select>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand hover:bg-brand-600 disabled:opacity-60 text-white font-semibold text-sm transition-all shrink-0"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </form>

          {demoResult && (
            <div className="mt-6 p-4 rounded-xl bg-surface-2/90 border border-brand/20 text-sm leading-relaxed text-foreground">
              <div className="text-[11px] font-semibold text-brand mb-1 flex items-center justify-between">
                <span>NVIDIA NIM Output:</span>
                 <span className="text-foreground-subtle">Provider configuration is server-side</span>
              </div>
              <p className="whitespace-pre-wrap">{demoResult}</p>
            </div>
          )}
        </div>
      </section>

      {/* 8 Feature Modules Grid */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold text-brand uppercase tracking-wider mb-3">Complete Suite</h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            All 8 Essential Modules In One Workspace
          </p>
          <p className="mt-4 text-foreground-muted">
            Designed specifically for small business owners and marketing teams who don&apos;t want to manage 10 logins.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.title}
                className="rounded-2xl border border-border bg-surface p-6 flex flex-col justify-between hover:border-brand/40 transition-all group hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-brand group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-2 text-foreground-subtle border border-border">
                      {m.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{m.title}</h3>
                  <p className="text-xs text-foreground-muted leading-relaxed">{m.desc}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs font-medium text-brand">
                  <span>Explore module</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-foreground">Why We Beat Legacy Tools</h2>
          <p className="mt-2 text-sm text-foreground-muted">
            Competitors charge enterprise prices or force you to use half a dozen apps.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-left text-sm text-foreground">
            <thead className="bg-surface-2 text-xs font-bold text-foreground-muted uppercase border-b border-border">
              <tr>
                <th className="p-4">Feature</th>
                <th className="p-4 text-brand font-extrabold">Gmailo (Us)</th>
                <th className="p-4">Buffer</th>
                <th className="p-4">Hootsuite</th>
                <th className="p-4">ManyChat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs sm:text-sm">
              <tr>
                <td className="p-4 font-medium">Social Scheduling (4 platforms)</td>
                <td className="p-4 text-brand font-bold">✅ Included</td>
                <td className="p-4">✅ Yes</td>
                <td className="p-4">✅ Yes</td>
                <td className="p-4 text-foreground-subtle">❌ No</td>
              </tr>
              <tr>
                <td className="p-4 font-medium">Unified Inbox (Comments & DMs)</td>
                <td className="p-4 text-brand font-bold">✅ Included</td>
                <td className="p-4 text-foreground-subtle">❌ No</td>
                <td className="p-4">✅ High tier</td>
                <td className="p-4">Partial</td>
              </tr>
              <tr>
                <td className="p-4 font-medium">AI 1-Click Reply Suggestions</td>
                <td className="p-4 text-brand font-bold">✅ NVIDIA NIM</td>
                <td className="p-4 text-foreground-subtle">❌ No</td>
                <td className="p-4 text-foreground-subtle">❌ No</td>
                <td className="p-4">Rules only</td>
              </tr>
              <tr>
                <td className="p-4 font-medium">Email Sequences + WhatsApp</td>
                <td className="p-4 text-brand font-bold">✅ Built-in</td>
                <td className="p-4 text-foreground-subtle">❌ No</td>
                <td className="p-4 text-foreground-subtle">❌ No</td>
                <td className="p-4">WA only</td>
              </tr>
              <tr>
                <td className="p-4 font-medium">Starting Price</td>
                <td className="p-4 text-brand font-bold">$29/mo (All-in)</td>
                <td className="p-4">$6/mo/channel</td>
                <td className="p-4">$99/mo</td>
                <td className="p-4">$15/mo</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
        <div className="rounded-3xl bg-gradient-to-tr from-brand-900/60 via-surface to-surface border border-brand/40 p-10 sm:p-14 relative overflow-hidden shadow-2xl">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
            Ready to upgrade your marketing workflow?
          </h2>
          <p className="mt-4 text-foreground-muted text-sm sm:text-base max-w-xl mx-auto">
            Get instant access to your content calendar, unified inbox, and NVIDIA NIM AI tools today.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand hover:bg-brand-600 text-white font-bold text-base transition-all shadow-lg shadow-brand/30 hover:scale-[1.02]"
            >
              Start Free 30-Day Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-xs text-foreground-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          © 2026 Gmailo Technologies Inc. All rights reserved.
        </div>
        <div className="flex gap-6">
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
          <Link href="/login" className="hover:text-foreground">Login</Link>
        </div>
      </footer>
    </div>
  );
}
