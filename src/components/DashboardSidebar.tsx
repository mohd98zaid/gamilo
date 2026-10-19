'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  PenSquare,
  Inbox,
  Share2,
  BarChart3,
  CreditCard,
  Settings,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function DashboardSidebar() {
  const pathname = usePathname();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Content Calendar', href: '/dashboard/calendar', icon: Calendar },
    { name: 'Create Post', href: '/dashboard/posts/new', icon: PenSquare },
    { name: 'Unified Inbox', href: '/dashboard/inbox', icon: Inbox, badge: '3' },
    { name: 'AI Studio', href: '/dashboard/ai-studio', icon: Sparkles },
    { name: 'Channels', href: '/dashboard/channels', icon: Share2 },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Billing & Plan', href: '/dashboard/billing', icon: CreditCard },
    { name: 'Brand Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-border bg-surface flex flex-col justify-between shrink-0 h-screen sticky top-0">
      <div>
        {/* App Title */}
        <div className="h-16 px-6 border-b border-border flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-white shadow-sm shadow-brand/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-base text-foreground tracking-tight block">
                Gmailo
              </span>
              <span className="text-[10px] text-foreground-subtle uppercase tracking-wider block font-semibold">
                Marketing OS
              </span>
            </div>
          </Link>
        </div>

        {/* Workspace Quick Card */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-surface-2/60 border border-border/60">
          <div className="flex items-center justify-between text-xs text-foreground-muted mb-1">
            <span className="font-medium text-foreground">Brew Haven Coffee</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-brand/20 text-brand font-semibold">
              TRIAL
            </span>
          </div>
          <p className="text-[11px] text-foreground-subtle">25 days remaining</p>
        </div>

        {/* Nav Links */}
        <nav className="px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                  isActive
                    ? 'bg-brand/10 text-brand font-semibold shadow-sm'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface-2/60'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      'w-4 h-4 transition-colors',
                      isActive ? 'text-brand' : 'text-foreground-subtle group-hover:text-foreground'
                    )}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-brand text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-border/80">
        <div className="rounded-xl p-3 bg-gradient-to-b from-surface-2 to-surface border border-border/60 text-xs">
          <div className="flex items-center gap-1.5 text-brand font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>NVIDIA NIM Engine</span>
          </div>
          <p className="text-[11px] text-foreground-muted leading-relaxed">
            Connected to <strong>gpt-oss-20b</strong> & nemotron fallback.
          </p>
          <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
            <span className="text-foreground-subtle">Credits: 95 / 100</span>
            <Link href="/dashboard/billing" className="text-brand hover:underline font-medium">
              Top Up
            </Link>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-foreground-subtle px-1">
          <Link href="/" className="hover:text-foreground flex items-center gap-1">
            Public Site <ExternalLink className="w-3 h-3" />
          </Link>
          <span>v1.0.0-mvp</span>
        </div>
      </div>
    </aside>
  );
}
