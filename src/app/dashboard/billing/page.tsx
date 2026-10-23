'use client';

import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Sparkles,
  Check,
  Zap,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { DashboardTopbar } from '@/components/DashboardTopbar';

export default function BillingPage() {
  const [data, setData] = useState<any>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/billing/subscription')
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(() => {});
  }, []);

  async function handleUpgrade(planId: string) {
    setUpgrading(true);
    setMessage('');
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const d = await res.json();
      if (d.success) {
        setMessage(d.message);
        // Refresh subscription
        const refreshed = await fetch('/api/billing/subscription').then((r) => r.json());
        setData(refreshed);
      }
    } catch {
      alert('Upgrade error');
    } finally {
      setUpgrading(false);
    }
  }

  const sub = data?.subscription || {
    plan: 'UNAVAILABLE',
    daysRemaining: 0,
    aiCredits: 0,
  };

  return (
    <>
      <DashboardTopbar
        title="Billing & Subscription"
        subtitle="Manage your subscription tier, billing cycle, and AI generation credits"
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-8">
        {message && (
          <div className="p-4 rounded-2xl bg-brand/10 border border-brand/30 text-brand text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4" /> {message}
          </div>
        )}

        {/* Current Plan Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-surface border border-border">
            <span className="text-xs font-semibold text-foreground-muted block mb-1">Current Plan</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold text-foreground">{sub.plan}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand/10 text-brand border border-brand/20">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-foreground-subtle mt-2">
              {sub.daysRemaining} days remaining in trial period
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-surface border border-border">
            <span className="text-xs font-semibold text-foreground-muted block mb-1">AI Generation Credits</span>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand" />
              <span className="text-2xl font-extrabold text-foreground">{sub.aiCredits}</span>
              <span className="text-xs text-foreground-subtle">remaining</span>
            </div>
            <p className="text-xs text-foreground-subtle mt-2">
               AI provider configuration is managed server-side
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-surface border border-border">
            <span className="text-xs font-semibold text-foreground-muted block mb-1">Payment Method</span>
            <div className="flex items-center gap-2 text-foreground font-bold text-sm mt-1">
              <CreditCard className="w-4 h-4 text-foreground-subtle" />
               <span>Payment provider not configured</span>
            </div>
            <p className="text-xs text-foreground-subtle mt-2">
               Billing status will appear after a verified payment provider is connected.
            </p>
          </div>
        </div>

        {/* Upgrade Plans */}
        <div>
          <div className="mb-4">
            <h2 className="text-base font-bold text-foreground">Available Subscriptions</h2>
            <p className="text-xs text-foreground-muted">Upgrade to unlock additional channels, higher AI quotas, and autopilot</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-surface border border-border flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-foreground">Starter Tier</h3>
                  <span className="text-2xl font-extrabold text-foreground">$29<span className="text-xs text-foreground-subtle font-normal">/mo</span></span>
                </div>
                <p className="text-xs text-foreground-muted mb-6">For solopreneurs and single-location businesses</p>

                <ul className="space-y-3 text-xs text-foreground-muted">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-brand" /> Up to 5 Social Channels
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-brand" /> Unlimited Scheduled Posts
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-brand" /> Unified Inbox (Instagram & FB)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-brand" /> 500 AI Generation Credits / month
                  </li>
                </ul>
              </div>

              <button
                disabled={upgrading || sub.plan === 'STARTER'}
                onClick={() => handleUpgrade('starter')}
                className="mt-8 w-full py-2.5 rounded-xl bg-surface-2 hover:bg-surface border border-border text-foreground font-semibold text-xs transition-colors"
              >
                {sub.plan === 'STARTER' ? 'Current Plan' : 'Select Starter'}
              </button>
            </div>

            <div className="p-6 rounded-3xl bg-gradient-to-b from-surface to-surface-2 border border-brand/50 shadow-xl shadow-brand/10 flex flex-col justify-between relative">
              <div className="absolute -top-3 right-6 px-2.5 py-0.5 rounded-full bg-brand text-white text-[10px] font-bold">
                RECOMMENDED
              </div>

              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-foreground">Scale Tier</h3>
                  <span className="text-2xl font-extrabold text-foreground">$79<span className="text-xs text-foreground-subtle font-normal">/mo</span></span>
                </div>
                <p className="text-xs text-foreground-muted mb-6">For marketing agencies & multi-brand operators</p>

                <ul className="space-y-3 text-xs text-foreground-muted">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-brand" /> Up to 15 Social Channels
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-brand" /> Autopilot AI Inbound Auto-Replies
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-brand" /> Unified Multi-channel Inbox + WhatsApp
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-brand" /> 2,500 AI Generation Credits / month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-brand" /> Priority 24/7 SLA & Support
                  </li>
                </ul>
              </div>

              <button
                disabled={upgrading || sub.plan === 'SCALE'}
                onClick={() => handleUpgrade('scale')}
                className="mt-8 w-full py-2.5 rounded-xl bg-brand hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-brand/20 transition-all"
              >
                {sub.plan === 'SCALE' ? 'Current Plan' : 'Upgrade to Scale'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
