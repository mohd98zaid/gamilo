'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('sarah@brewhaven.coffee');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      router.push('/dashboard');
    } catch {
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-brand/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-bold text-2xl text-foreground">Gmailo</span>
          </Link>
          <h2 className="text-xl font-bold text-foreground">Welcome back</h2>
          <p className="text-xs text-foreground-muted mt-1">Sign in to your marketing workspace</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground-muted mb-1.5">Email address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-foreground-subtle absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-sm focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-foreground-muted">Password</label>
              <a href="#" className="text-xs text-brand hover:underline">Forgot?</a>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-foreground-subtle absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-sm focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-brand hover:bg-brand-600 text-white font-bold text-sm transition-all shadow-md shadow-brand/20 flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-border text-center text-xs text-foreground-muted">
          Don't have an account?{' '}
          <Link href="/register" className="text-brand font-semibold hover:underline">
            Start 30-Day Free Trial
          </Link>
        </div>
      </div>
    </div>
  );
}
