'use client';

import React, { useEffect, useState } from 'react';
import {
  Settings,
  Sparkles,
  Key,
  Shield,
  Save,
  Plus,
  Copy,
  Check,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { DashboardTopbar } from '@/components/DashboardTopbar';

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [tone, setTone] = useState('');
  const [brandKnowledge, setBrandKnowledge] = useState('');

  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [newKey, setNewKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [existingKeys, setExistingKeys] = useState<any[]>([]);

  useEffect(() => {
    // Fetch brand settings
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        const bs = data.workspace?.brandSettings;
        if (bs) {
          setBusinessName(bs.businessName || '');
          setIndustry(bs.industry || '');
          setTone(bs.tone || '');
          setBrandKnowledge(bs.brandKnowledge || '');
        }
      })
      .catch(() => {});

    // Fetch API keys
    fetchApiKeys();
  }, []);

  async function fetchApiKeys() {
    try {
      const res = await fetch('/api/api-keys');
      const data = await res.json();
      setExistingKeys(data.keys || []);
    } catch {}
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setSaved(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          industry,
          tone,
          brandKnowledge,
        }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleGenerateKey(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName || 'Developer Key' }),
      });
      const data = await res.json();
      if (data.key) {
        setNewKey(data.key);
        setKeyName('');
        fetchApiKeys();
      }
    } catch {
      alert('Failed to generate key');
    }
  }

  async function handleRevokeKey(id: string) {
    if (!confirm('Are you sure you want to revoke this API key?')) return;
    try {
      const res = await fetch(`/api/api-keys?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchApiKeys();
      }
    } catch {}
  }

  function handleCopy() {
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <DashboardTopbar
        title="Brand Settings & Developers"
        subtitle="Configure the AI personality, knowledge base, and developer API keys"
      />

      <main className="p-6 max-w-5xl mx-auto w-full space-y-8">
        {/* Brand Context & AI Knowledge */}
        <div className="rounded-3xl p-6 bg-surface border border-border space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-border">
            <Sparkles className="w-5 h-5 text-brand" />
            <div>
              <h2 className="text-base font-bold text-foreground">Brand Persona & Knowledge Base</h2>
              <p className="text-xs text-foreground-muted">
                These settings directly inform the NVIDIA NIM AI when drafting social captions and replying to customer DMs.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground-muted mb-1.5">Business Name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground-muted mb-1.5">Industry</label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:border-brand"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground-muted mb-1.5">Brand Voice / Tone</label>
              <input
                type="text"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="e.g. warm, friendly, professional, bold"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                Brand Knowledge Base (Strictly used by AI Inbound Replies)
              </label>
              <textarea
                rows={4}
                value={brandKnowledge}
                onChange={(e) => setBrandKnowledge(e.target.value)}
                placeholder="Include opening hours, gluten-free/vegan policies, location, pricing, WiFi, FAQs..."
                className="w-full p-3.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:border-brand leading-relaxed"
              />
              <span className="text-[11px] text-foreground-subtle mt-1 block">
                The NVIDIA NIM AI will never hallucinate or invent policies outside of what is written here.
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-brand font-semibold">
                {saved ? '✓ Brand settings saved and live in memory!' : ''}
              </span>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-600 disabled:opacity-60 text-white font-bold text-xs shadow-md shadow-brand/20 transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Saving...' : 'Save Brand Settings'}
              </button>
            </div>
          </form>
        </div>

        {/* Developer API Keys */}
        <div className="rounded-3xl p-6 bg-surface border border-border space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-border">
            <Key className="w-5 h-5 text-brand" />
            <div>
              <h2 className="text-base font-bold text-foreground">Developer API Keys</h2>
              <p className="text-xs text-foreground-muted">
                Standard format: <code>gml_live_...</code> with SHA-256 database hashing.
              </p>
            </div>
          </div>

          {/* New Key Alert */}
          {newKey && (
            <div className="p-4 rounded-xl bg-brand/5 border border-brand/30 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-brand">
                <Check className="w-4 h-4" /> New API Key Generated
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={newKey}
                  className="flex-1 font-mono text-xs px-3 py-2 rounded-lg bg-surface border border-border text-foreground"
                />
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 rounded-lg bg-brand text-white text-xs font-semibold flex items-center gap-1 shadow-sm"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-[10px] text-foreground-subtle">
                Copy this key now. For your security, this raw secret will not be displayed again.
              </p>
            </div>
          )}

          {/* Key Generator Form */}
          <form onSubmit={handleGenerateKey} className="flex gap-2">
            <input
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="Key label (e.g., Staging Server, Webhook Bot)"
              className="flex-1 px-3.5 py-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:border-brand"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand hover:bg-brand-600 text-white text-xs font-bold transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Generate API Key
            </button>
          </form>

          {/* Existing Keys Table */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-foreground-muted block">Active Keys</span>
            <div className="space-y-2">
              {existingKeys.map((k) => (
                <div
                  key={k.id}
                  className="p-3.5 rounded-xl bg-surface-2 border border-border flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-foreground block">{k.name}</span>
                    <span className="text-[11px] font-mono text-foreground-subtle">
                      Prefix: {k.keyPrefix}... · Created: {new Date(k.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand/10 text-brand border border-brand/20">
                      ACTIVE
                    </span>
                    <button
                      onClick={() => handleRevokeKey(k.id)}
                      title="Revoke Key"
                      className="text-foreground-subtle hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
