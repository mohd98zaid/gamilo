'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Share2,
  CheckCircle2,
  Plus,
  RefreshCw,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Instagram,
  Facebook,
  Mail,
  Key,
  Info,
  Server,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { DashboardTopbar } from '@/components/DashboardTopbar';

export default function ChannelsPage() {
  const router = useRouter();
  const [channels, setChannels] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('INSTAGRAM');
  const [accountName, setAccountName] = useState('');
  const [socialToken, setSocialToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthSuccess, setOauthSuccess] = useState<string | null>(null);

  // Email-specific state
  const [emailAddress, setEmailAddress] = useState('');
  const [emailSenderName, setEmailSenderName] = useState('');
  const [emailAuthType, setEmailAuthType] = useState<'APP_PASSWORD' | 'OAUTH' | 'CUSTOM_SMTP'>('APP_PASSWORD');
  const [emailSecret, setEmailSecret] = useState('');
  const [smtpPreset, setSmtpPreset] = useState('GMAIL');
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(587);
  const [imapHost, setImapHost] = useState('imap.gmail.com');
  const [imapPort, setImapPort] = useState(993);

  useEffect(() => {
    fetchChannels();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('error') === 'google_oauth_not_configured') {
        // URL query parameters are external state synchronized after mount.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOauthError(
          'Google Cloud OAuth is not configured in your .env file (missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI). You can connect your Gmail account instantly using your 16-character Google App Password below!'
        );
      } else if (params.get('error')) {
        setOauthError(`Google connection error: ${params.get('error')}`);
      }
      if (params.get('connected') === 'gmail') {
        setOauthSuccess('Gmail account connected successfully via Google OAuth!');
      }
    }
  }, []);

  async function fetchChannels() {
    try {
      const res = await fetch('/api/channels');
      const data = await res.json();
      setChannels(data.channels || []);
    } catch {}
  }

  function handlePresetChange(preset: string) {
    setSmtpPreset(preset);
    if (preset === 'GMAIL') {
      setSelectedPlatform('GMAIL');
      setSmtpHost('smtp.gmail.com');
      setSmtpPort(587);
      setImapHost('imap.gmail.com');
      setImapPort(993);
    } else if (preset === 'OUTLOOK') {
      setSelectedPlatform('EMAIL');
      setSmtpHost('smtp.office365.com');
      setSmtpPort(587);
      setImapHost('outlook.office365.com');
      setImapPort(993);
    } else if (preset === 'ZOHO') {
      setSelectedPlatform('EMAIL');
      setSmtpHost('smtp.zoho.com');
      setSmtpPort(465);
      setImapHost('imappro.zoho.com');
      setImapPort(993);
    } else if (preset === 'CUSTOM') {
      setSelectedPlatform('EMAIL');
      setSmtpHost('mail.yourdomain.com');
      setSmtpPort(587);
      setImapHost('imap.yourdomain.com');
      setImapPort(993);
    }
  }

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setIsConnecting(true);

    try {
      const isEmail = selectedPlatform === 'GMAIL' || selectedPlatform === 'EMAIL';
      const payload: any = {
        platform: selectedPlatform,
        name: isEmail ? (emailSenderName ? `${emailSenderName} (${emailAddress})` : emailAddress) : accountName,
        platformId: isEmail ? emailAddress : (accountName ? `@${accountName.replace(/^@/, '')}` : `pid_${Date.now()}`),
        accessToken: isEmail ? emailSecret : (socialToken.trim() || undefined),
      };

      if (isEmail) {
        payload.email = emailAddress;
        payload.authType = emailAuthType;
        payload.smtpHost = smtpHost;
        payload.smtpPort = Number(smtpPort);
        payload.imapHost = imapHost;
        payload.imapPort = Number(imapPort);
      }

      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setAccountName('');
        setSocialToken('');
        setEmailAddress('');
        setEmailSecret('');
        setEmailSenderName('');
        setIsModalOpen(false);
        fetchChannels();
      } else {
        const d = await res.json();
        alert(`Error: ${d.error || 'Failed to connect'}`);
      }
    } catch {
      alert('Failed to connect channel');
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleDisconnect(id: string, name: string) {
    if (!confirm(`Are you sure you want to disconnect ${name}?`)) return;

    try {
      const res = await fetch(`/api/channels/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchChannels();
      }
    } catch {
      alert('Failed to disconnect');
    }
  }

  const supportedPlatforms = [
    {
      id: 'GMAIL',
      name: 'Gmail / Google Workspace',
      desc: 'Connect Gmail via App Password or OAuth for cold outreach and automated reply sync.',
      icon: Mail,
      color: 'text-red-400 bg-red-500/10 border-red-500/20',
      isEmail: true,
    },
    {
      id: 'EMAIL',
      name: 'Other Mail (Outlook / SMTP)',
      desc: 'Connect Outlook, Office 365, Zoho, or custom business domain email via SMTP/IMAP.',
      icon: Server,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      isEmail: true,
    },
    {
      id: 'INSTAGRAM',
      name: 'Instagram Business',
      desc: 'Auto-publish reels, carousels, feed posts, and reply to comments & DMs.',
      icon: Instagram,
      color: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
      isEmail: false,
    },
    {
      id: 'FACEBOOK',
      name: 'Facebook Page',
      desc: 'Publish page updates, photos, stories, and manage community inquiries.',
      icon: Facebook,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      isEmail: false,
    },
    {
      id: 'WHATSAPP',
      name: 'WhatsApp Cloud API',
      desc: 'Two-way customer service messaging and broadcast template sequences.',
      icon: Share2,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      isEmail: false,
    },
    {
      id: 'TIKTOK',
      name: 'TikTok Business',
      desc: 'Publish short-form video content and sync audience analytics.',
      icon: Share2,
      color: 'text-foreground bg-surface-2 border-border',
      isEmail: false,
    },
  ];

  return (
    <>
      <DashboardTopbar
        title="Connected Channels & Email"
        subtitle="Connect Gmail, Outlook, Custom Mail, Instagram, and Facebook to Gmailo"
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-8">
        {oauthError && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs text-amber-200 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold text-amber-300">Google OAuth Not Configured</strong>
                <p className="mt-0.5 text-amber-200/90 leading-relaxed">{oauthError}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setOauthError(null);
                setSelectedPlatform('GMAIL');
                handlePresetChange('GMAIL');
                setIsModalOpen(true);
              }}
              className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold border border-amber-500/30 transition-colors"
            >
              Connect with App Password
            </button>
          </div>
        )}

        {oauthSuccess && (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs text-emerald-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{oauthSuccess}</span>
            </div>
            <button
              onClick={() => setOauthSuccess(null)}
              className="text-emerald-400 hover:text-emerald-200 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Help & Setup Guide Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-surface to-surface-2 border border-border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  How to Connect Gmail or Other Mail to Gmailo
                </h3>
                <p className="text-xs text-foreground-muted">
                  Choose between instant 60-second App Password setup or custom SMTP/IMAP
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface border border-border text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors"
            >
              <span>{showGuide ? 'Hide Instructions' : 'View Instructions'}</span>
              {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showGuide && (
            <div className="pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-foreground leading-relaxed">
              <div className="p-4 rounded-2xl bg-surface-2/60 border border-border space-y-2">
                <span className="font-bold text-brand block text-sm">Option A: Gmail / Google Workspace (Fastest)</span>
                <ol className="list-decimal pl-4 space-y-1 text-foreground-muted">
                  <li>Go to your <strong>Google Account</strong> (myaccount.google.com).</li>
                  <li>Click <strong>Security</strong> on the left, then open <strong>2-Step Verification</strong>.</li>
                  <li>Scroll to the bottom and select <strong>App passwords</strong>.</li>
                  <li>Enter app name (e.g. <code>Gmailo</code>) and click <strong>Create</strong>.</li>
                  <li>Copy the <strong>16-character code</strong> and paste it into the password field when connecting.</li>
                </ol>
                <p className="text-[11px] text-foreground-subtle pt-1">
                  Works for both personal <code>@gmail.com</code> and corporate Google Workspace accounts.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-2/60 border border-border space-y-2">
                <span className="font-bold text-blue-400 block text-sm">Option B: Outlook, Yahoo, or Custom Domain</span>
                <ol className="list-decimal pl-4 space-y-1 text-foreground-muted">
                  <li>Select <strong>Other Mail (Outlook / SMTP)</strong> below.</li>
                  <li>Pick your provider preset (Outlook, Zoho, Yahoo, or Custom).</li>
                  <li>Enter your work email address and password / app password.</li>
                  <li>SMTP Host is pre-configured (port 587 or 465) for sending outreach.</li>
                  <li>IMAP Host is pre-configured (port 993) to detect replies automatically.</li>
                </ol>
                <p className="text-[11px] text-foreground-subtle pt-1">
                  All passwords and credentials are cryptographically protected using AES-256-GCM.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Active Connected Accounts */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Active Accounts</h2>
              <p className="text-xs text-foreground-muted">
                Authorized profiles sending emails, publishing social posts, and syncing messages
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedPlatform('GMAIL');
                handlePresetChange('GMAIL');
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand hover:bg-brand-600 text-white text-xs font-bold transition-all shadow-md shadow-brand/20"
            >
              <Plus className="w-4 h-4" /> Connect Email or Channel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {channels.map((c) => {
              const isEmail = c.platform === 'GMAIL' || c.platform === 'EMAIL';
              return (
                <div
                  key={c.id}
                  className="p-5 rounded-2xl bg-surface border border-border flex items-center justify-between group hover:border-border/80 transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt={c.name} className="w-12 h-12 rounded-full object-cover border border-border" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-surface-2 border border-border flex items-center justify-center text-xs font-bold text-foreground">
                        {c.name?.slice(0, 2).toUpperCase() || 'CH'}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{c.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand/10 text-brand border border-brand/20">
                          CONNECTED
                        </span>
                      </div>
                      <div className="text-[11px] text-foreground-subtle mt-0.5">
                        Type: <strong>{c.platform}</strong> ·{' '}
                        {isEmail ? 'SMTP/IMAP Verified' : 'OAuth Authorized'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDisconnect(c.id, c.name)}
                      title="Disconnect Account"
                      className="p-2 rounded-xl bg-surface-2 hover:bg-surface text-foreground-subtle hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Integration Providers Grid */}
        <div>
          <div className="mb-4">
            <h2 className="text-base font-bold text-foreground">Available Integration Providers</h2>
            <p className="text-xs text-foreground-muted">Select an account provider below to connect to Gmailo</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {supportedPlatforms.map((p) => {
              const Icon = p.icon;
              const isConnected = channels.some((c) => c.platform === p.id);

              return (
                <div
                  key={p.id}
                  className="p-5 rounded-2xl bg-surface border border-border flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${p.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {isConnected && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20">
                          Active
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-foreground">{p.name}</h3>
                    <p className="text-xs text-foreground-muted mt-1 leading-relaxed">{p.desc}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border/60">
                    <button
                      onClick={() => {
                        setSelectedPlatform(p.id);
                        if (p.id === 'GMAIL') handlePresetChange('GMAIL');
                        if (p.id === 'EMAIL') handlePresetChange('OUTLOOK');
                        setIsModalOpen(true);
                      }}
                      className="w-full py-2 rounded-xl bg-surface-2 hover:bg-surface text-foreground text-xs font-semibold border border-border transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {isConnected ? 'Add Another Profile' : 'Connect'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Connect Channel / Email Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-surface border border-brand/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl my-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4 text-brand" />
                  Connect {selectedPlatform === 'GMAIL' ? 'Gmail / Google Workspace' : selectedPlatform === 'EMAIL' ? 'Email Provider' : selectedPlatform}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-foreground-subtle hover:text-foreground text-xs"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleConnect} className="space-y-4">
                {/* Platform Selector */}
                <div>
                  <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                    Platform Type
                  </label>
                  <select
                    value={selectedPlatform}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedPlatform(val);
                      if (val === 'GMAIL') handlePresetChange('GMAIL');
                      if (val === 'EMAIL') handlePresetChange('OUTLOOK');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:border-brand"
                  >
                    <option value="GMAIL">Gmail / Google Workspace</option>
                    <option value="EMAIL">Other Email (Outlook, Yahoo, Zoho, Custom Domain)</option>
                    <option value="INSTAGRAM">Instagram Business</option>
                    <option value="FACEBOOK">Facebook Page</option>
                    <option value="WHATSAPP">WhatsApp Cloud API</option>
                    <option value="TIKTOK">TikTok Business</option>
                  </select>
                </div>

                {/* Email-Specific Fields */}
                {(selectedPlatform === 'GMAIL' || selectedPlatform === 'EMAIL') ? (
                  <div className="space-y-3.5 pt-1">
                    {selectedPlatform === 'EMAIL' && (
                      <div>
                        <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                          Provider Preset
                        </label>
                        <select
                          value={smtpPreset}
                          onChange={(e) => handlePresetChange(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:border-brand"
                        >
                          <option value="OUTLOOK">Microsoft Outlook / Office 365</option>
                          <option value="ZOHO">Zoho Mail</option>
                          <option value="CUSTOM">Custom Domain (cPanel / Webmail / Exchange)</option>
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          placeholder={selectedPlatform === 'GMAIL' ? 'you@gmail.com' : 'you@company.com'}
                          value={emailAddress}
                          onChange={(e) => setEmailAddress(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:border-brand"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                          Sender Display Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Account display name"
                          value={emailSenderName}
                          onChange={(e) => setEmailSenderName(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:border-brand"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-semibold text-foreground-muted">
                          {selectedPlatform === 'GMAIL' ? '16-Character Google App Password' : 'Password / App Password'}
                        </label>
                        {selectedPlatform === 'GMAIL' && (
                          <a
                            href="https://myaccount.google.com/apppasswords"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-brand hover:underline flex items-center gap-1 font-semibold"
                          >
                            Generate App Password <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <input
                        type="password"
                        required
                        placeholder={selectedPlatform === 'GMAIL' ? 'xxxx xxxx xxxx xxxx' : '••••••••••••'}
                        value={emailSecret}
                        onChange={(e) => setEmailSecret(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:border-brand"
                      />
                    </div>

                    {/* Server Configuration Fields (Collapsible / Advanced) */}
                    <div className="p-3.5 rounded-2xl bg-surface-2/60 border border-border space-y-2.5">
                      <div className="text-[11px] font-bold text-foreground-subtle uppercase tracking-wider">
                        Server Endpoints (Configured Automatically)
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-foreground-subtle block">SMTP Host & Port</span>
                          <span className="font-mono text-foreground font-semibold">{smtpHost}:{smtpPort}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-foreground-subtle block">IMAP Host & Port</span>
                          <span className="font-mono text-foreground font-semibold">{imapHost}:{imapPort}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                        Account Handle or Page Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. @haven.coffee or mohd98zaid"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:border-brand"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-semibold text-foreground-muted">
                          Meta / Provider Access Token <span className="text-foreground-subtle font-normal">(Optional)</span>
                        </label>
                        <a
                          href="https://developers.facebook.com/tools/explorer/"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-brand hover:underline flex items-center gap-1 font-semibold"
                        >
                          Generate Meta Token <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <input
                        type="password"
                        placeholder="Leave blank for post drafting & calendar scheduling"
                        value={socialToken}
                        onChange={(e) => setSocialToken(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:border-brand"
                      />
                      <p className="mt-1 text-[11px] text-foreground-subtle">
                        You can connect with just your handle to schedule posts in the calendar and generate AI captions.
                      </p>
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-surface-2 text-[11px] text-foreground-muted flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                  <span>
                    Credentials are encrypted with AES-256-GCM. Passwords are never stored or transmitted in plain text.
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-foreground-muted hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isConnecting}
                    className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-600 disabled:opacity-60 text-white font-bold text-xs shadow-md shadow-brand/20 transition-all"
                  >
                    {isConnecting ? 'Verifying & Saving...' : 'Authorize & Connect'}
                  </button>
                </div>

                {selectedPlatform === 'GMAIL' && (
                  <div className="text-center pt-1 border-t border-border/50 text-[11px] text-foreground-subtle">
                    Prefer Google Cloud OAuth?{' '}
                    <a
                      href="/api/integrations/gmail/start"
                      className="text-brand hover:underline font-semibold"
                    >
                      Sign in with Google OAuth
                    </a>{' '}
                    (requires GOOGLE_CLIENT_ID in .env)
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
