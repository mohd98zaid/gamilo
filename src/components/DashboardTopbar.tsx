'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Bell, Plus, Search, ShieldCheck } from 'lucide-react';

export function DashboardTopbar({ title, subtitle }: { title?: string; subtitle?: string }) {
  const [user, setUser] = useState<{ name?: string | null; email?: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  const displayName = user?.name || user?.email || 'Account';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <header className="h-16 border-b border-border bg-surface/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      <div>
        <h1 className="text-lg font-bold text-foreground tracking-tight">{title || 'Dashboard'}</h1>
        {subtitle && <p className="text-xs text-foreground-muted">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Quick Search */}
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 text-foreground-subtle absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search posts, threads..."
            className="w-56 pl-9 pr-3 py-1.5 text-xs rounded-xl bg-surface-2 border border-border text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-brand"
          />
        </div>

        {/* AI Status Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-xs font-medium text-brand">
          <Sparkles className="w-3.5 h-3.5" />
          <span>NVIDIA NIM AI: Active</span>
        </div>

        {/* Create Post Action */}
        <Link
          href="/dashboard/posts/new"
          className="inline-flex items-center gap-1.5 text-xs font-semibold bg-brand hover:bg-brand-600 text-white px-3 py-1.5 rounded-xl transition-all shadow-sm shadow-brand/20"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Post</span>
        </Link>

        {/* User Avatar */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-border">
          <div className="w-8 h-8 rounded-full border border-border bg-surface-2 flex items-center justify-center text-[10px] font-bold text-foreground">
            {initials}
          </div>
          <div className="hidden lg:block text-left">
            <span className="text-xs font-semibold text-foreground block leading-tight">{displayName}</span>
            <span className="text-[10px] text-foreground-subtle block">Workspace member</span>
          </div>
        </div>
      </div>
    </header>
  );
}
