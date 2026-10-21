'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, User, Mail, Lock, Building } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, workspaceName }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data.error === 'string' ? data.error : 'Unable to create account');
      }
      router.push('/dashboard');
    } catch (registrationError) {
      setError(registrationError instanceof Error ? registrationError.message : 'Unable to create account');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-surface border border-border rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-brand/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-bold text-2xl text-foreground">Gmailo</span>
          </Link>
          <h2 className="text-xl font-bold text-foreground">Create your workspace</h2>
          <p className="text-xs text-foreground-muted mt-1">Start your 30-day free trial. No card needed.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {error && <p role="alert" className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-300">{error}</p>}
          <div>
            <label className="block text-xs font-semibold text-foreground-muted mb-1.5">Your Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-foreground-subtle absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Sarah Jenkins"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-sm focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-muted mb-1.5">Business / Workspace Name</label>
            <div className="relative">
              <Building className="w-4 h-4 text-foreground-subtle absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Brew Haven Coffee"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-sm focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-muted mb-1.5">Work Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-foreground-subtle absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="sarah@brewhaven.coffee"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-sm focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-muted mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-foreground-subtle absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={12}
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-sm focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-brand hover:bg-brand-600 text-white font-bold text-sm transition-all shadow-md shadow-brand/20 flex items-center justify-center gap-2 mt-4"
          >
            {isLoading ? 'Creating Workspace...' : 'Create Account'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-border text-center text-xs text-foreground-muted">
          Already have an account?{' '}
          <Link href="/login" className="text-brand font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
