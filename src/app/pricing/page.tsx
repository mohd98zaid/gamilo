'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, Sparkles, ArrowRight, Shield } from 'lucide-react';
import { Navbar } from '@/components/Navbar';

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: 'Starter',
      price: isAnnual ? 24 : 29,
      description: 'Ideal for solopreneurs and small shops getting started with automation.',
      features: [
        'Up to 5 Social Channels',
        'Unlimited Post Scheduling',
        'Visual Content Calendar',
        'Unified Social Inbox (IG & FB)',
        '500 AI Generation Credits / month',
        'Email Support',
      ],
      popular: false,
      cta: 'Start 30-Day Free Trial',
    },
    {
      name: 'Scale',
      price: isAnnual ? 65 : 79,
      description: 'For growing businesses and boutique marketing agencies managing multiple brands.',
      features: [
        'Up to 15 Social Channels',
        'Autopilot AI Comment & DM Replies',
        'Unified Inbox + Email + WhatsApp',
        '2,500 AI Generation Credits / month',
        'AI Outreach Sequence Engine',
        'Priority 24/7 Support',
      ],
      popular: true,
      cta: 'Start 30-Day Free Trial',
    },
    {
      name: 'Enterprise',
      price: isAnnual ? 199 : 249,
      description: 'Custom setups, unlimited team members, custom AI models and SLA.',
      features: [
        'Unlimited Channels & Workspaces',
        'Dedicated NVIDIA NIM Cluster Option',
        'Custom Webhook Integrations',
        'Unlimited AI Credits',
        'Custom SLA & Account Manager',
      ],
      popular: false,
      cta: 'Contact Sales',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
          Simple, Transparent Pricing
        </h1>
        <p className="mt-4 text-base sm:text-lg text-foreground-muted max-w-2xl mx-auto">
          Every plan includes our 30-day no-risk free trial. No credit card required to start.
        </p>

        {/* Billing Toggle */}
        <div className="mt-10 inline-flex items-center gap-3 p-1.5 rounded-2xl bg-surface-2 border border-border">
          <button
            onClick={() => setIsAnnual(false)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              !isAnnual ? 'bg-surface text-foreground shadow-sm' : 'text-foreground-muted'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              isAnnual ? 'bg-brand text-white shadow-sm' : 'text-foreground-muted'
            }`}
          >
            Annual Billing
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 font-bold">Save 20%</span>
          </button>
        </div>

        {/* Pricing Cards */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`rounded-3xl p-8 flex flex-col justify-between border relative transition-all ${
                p.popular
                  ? 'border-brand bg-gradient-to-b from-surface to-surface-2 shadow-2xl shadow-brand/10'
                  : 'border-border bg-surface hover:border-border/80'
              }`}
            >
              {p.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-brand text-white text-[11px] font-bold shadow-md shadow-brand/30 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Most Popular
                </div>
              )}

              <div>
                <h2 className="text-xl font-bold text-foreground">{p.name}</h2>
                <p className="mt-2 text-xs text-foreground-muted min-h-[32px]">{p.description}</p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-foreground">${p.price}</span>
                  <span className="text-xs text-foreground-subtle">/ month</span>
                </div>

                <ul className="mt-8 space-y-3.5 text-xs text-foreground-muted">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-border/60">
                <Link
                  href="/dashboard/billing"
                  className={`w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
                    p.popular
                      ? 'bg-brand hover:bg-brand-600 text-white shadow-md shadow-brand/20'
                      : 'bg-surface-2 hover:bg-surface border border-border text-foreground'
                  }`}
                >
                  {p.cta}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
