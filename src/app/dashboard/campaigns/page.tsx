'use client';

import React, { useEffect, useState } from 'react';
import {
  Send,
  Plus,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Clock,
  Trash2,
  Mail,
  FileText,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { DashboardTopbar } from '@/components/DashboardTopbar';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  status: string;
  totalRecipients: number;
  totalSent: number;
  totalFailed: number;
  fromChannelId?: string;
  createdAt: string;
}

interface Recipient {
  id: string;
  email: string;
  name?: string | null;
  company?: string | null;
  status: string;
  sentAt?: string | null;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Campaign Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiTopic, setAiTopic] = useState('');

  // Manage Recipients Modal
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [isRecipientsOpen, setIsRecipientsOpen] = useState(false);
  const [rawContactsText, setRawContactsText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Send status
  const [isSending, setIsSending] = useState<string | null>(null);
  const [sendFeedback, setSendFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [campRes, chanRes] = await Promise.all([
        fetch('/api/campaigns'),
        fetch('/api/channels'),
      ]);

      if (campRes.ok) {
        const d = await campRes.json();
        setCampaigns(d.campaigns || []);
      }
      if (chanRes.ok) {
        const d = await chanRes.json();
        const emailChans = (d.channels || []).filter(
          (c: any) => c.platform === 'GMAIL' || c.platform === 'EMAIL'
        );
        setChannels(emailChans);
        if (emailChans.length > 0 && !selectedChannelId) {
          setSelectedChannelId(emailChans[0].id);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          subject,
          body,
          fromChannelId: selectedChannelId || undefined,
        }),
      });

      if (res.ok) {
        setIsCreateOpen(false);
        setCampaignName('');
        setSubject('');
        setBody('');
        setAiTopic('');
        loadData();
      } else {
        const err = await res.json();
        alert(`Failed to create: ${err.error || 'Unknown error'}`);
      }
    } catch {
      alert('Error creating campaign');
    }
  }

  async function handleOpenRecipients(camp: Campaign) {
    setActiveCampaign(camp);
    setIsRecipientsOpen(true);
    try {
      const res = await fetch(`/api/campaigns/${camp.id}`);
      if (res.ok) {
        const d = await res.json();
        setRecipients(d.campaign?.recipients || []);
      }
    } catch {
      // ignore
    }
  }

  async function handleImportRecipients() {
    if (!activeCampaign || !rawContactsText.trim()) return;
    setIsImporting(true);

    try {
      const lines = rawContactsText.split('\n');
      const parsedList: Array<{ email: string; name?: string; company?: string }> = [];

      for (const line of lines) {
        const parts = line.split(',').map((s) => s.trim());
        if (parts[0] && parts[0].includes('@')) {
          parsedList.push({
            email: parts[0],
            name: parts[1] || undefined,
            company: parts[2] || undefined,
          });
        }
      }

      if (parsedList.length === 0) {
        alert('No valid email addresses found. Format: email, name, company');
        setIsImporting(false);
        return;
      }

      const res = await fetch(`/api/campaigns/${activeCampaign.id}/recipients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients: parsedList }),
      });

      if (res.ok) {
        setRawContactsText('');
        handleOpenRecipients(activeCampaign);
        loadData();
      } else {
        const d = await res.json();
        alert(`Error importing: ${d.error || 'Failed'}`);
      }
    } catch {
      alert('Error importing recipients');
    } finally {
      setIsImporting(false);
    }
  }

  async function handleSendCampaign(campId: string) {
    if (!confirm('Are you ready to send this campaign to all pending recipients?')) return;
    setIsSending(campId);
    setSendFeedback(null);

    try {
      const res = await fetch(`/api/campaigns/${campId}/send`, {
        method: 'POST',
      });

      const d = await res.json();
      if (res.ok) {
        setSendFeedback(`Campaign sent! Dispatched: ${d.sent}, Failed: ${d.failed}`);
        loadData();
      } else {
        alert(`Send failed: ${d.error || 'Check channel connection'}`);
      }
    } catch {
      alert('Network error while dispatching campaign');
    } finally {
      setIsSending(null);
    }
  }

  async function handleDeleteCampaign(id: string) {
    if (!confirm('Delete this campaign?')) return;
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      }
    } catch {
      alert('Failed to delete campaign');
    }
  }

  async function handleAiDraft() {
    if (!aiTopic.trim()) {
      alert('Please enter a brief topic or goal for the AI to write about');
      return;
    }
    setIsGeneratingAi(true);
    try {
      const [subjectRes, bodyRes] = await Promise.all([
        fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'email_subject', prompt: aiTopic }),
        }),
        fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'caption', prompt: `Write a friendly professional cold email pitching: ${aiTopic}. Include greeting and sign-off.` }),
        }),
      ]);

      if (subjectRes.ok) {
        const d = await subjectRes.json();
        setSubject(d.result.split('\n')[0].replace(/^[1-9]\.\s*/, '').replace(/^"|"$/g, ''));
      }
      if (bodyRes.ok) {
        const d = await bodyRes.json();
        setBody(d.result);
      }
    } catch {
      alert('AI draft generation failed');
    } finally {
      setIsGeneratingAi(false);
    }
  }

  const totalSentAll = campaigns.reduce((acc, c) => acc + c.totalSent, 0);
  const totalRecipientsAll = campaigns.reduce((acc, c) => acc + c.totalRecipients, 0);

  return (
    <>
      <DashboardTopbar
        title="Email Campaigns & Bulk Outreach"
        subtitle="Create personalized email campaigns, upload contact lists, and dispatch throttled bulk emails"
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-8">
        {/* Feedback Alert */}
        {sendFeedback && (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs text-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{sendFeedback}</span>
            </div>
            <button onClick={() => setSendFeedback(null)} className="text-emerald-400 hover:text-emerald-200">
              ✕
            </button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-surface border border-border">
            <div className="flex items-center justify-between text-xs text-foreground-muted mb-2">
              <span>Total Campaigns</span>
              <FileText className="w-4 h-4 text-brand" />
            </div>
            <div className="text-2xl font-extrabold text-foreground">{campaigns.length}</div>
            <div className="text-[11px] text-foreground-subtle mt-1">Active & draft outreach</div>
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-border">
            <div className="flex items-center justify-between text-xs text-foreground-muted mb-2">
              <span>Total Recipients</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-extrabold text-foreground">{totalRecipientsAll}</div>
            <div className="text-[11px] text-foreground-subtle mt-1">Uploaded contacts</div>
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-border">
            <div className="flex items-center justify-between text-xs text-foreground-muted mb-2">
              <span>Emails Sent</span>
              <Send className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-foreground">{totalSentAll}</div>
            <div className="text-[11px] text-emerald-400 font-medium mt-1">Dispatched via SMTP/Gmail</div>
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-border">
            <div className="flex items-center justify-between text-xs text-foreground-muted mb-2">
              <span>Connected Email Accounts</span>
              <Mail className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-extrabold text-foreground">{channels.length}</div>
            <div className="text-[11px] text-foreground-subtle mt-1">
              {channels.length > 0 ? `${channels[0].name}` : 'No email channel connected'}
            </div>
          </div>
        </div>

        {/* Campaigns Header & Action */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-foreground">Outreach Campaigns</h2>
            <p className="text-xs text-foreground-muted">
              Configure merge variables (<code>{'{{name}}'}</code>, <code>{'{{company}}'}</code>) and send in batches
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand hover:bg-brand-600 text-white text-xs font-bold transition-all shadow-md shadow-brand/20"
          >
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        </div>

        {/* Campaigns List */}
        {campaigns.length === 0 && !loading ? (
          <div className="p-12 text-center rounded-3xl bg-surface border border-border space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand mx-auto flex items-center justify-center">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-foreground text-sm">No email campaigns created yet</h3>
            <p className="text-xs text-foreground-muted max-w-sm mx-auto">
              Create your first bulk campaign, upload a CSV or list of contacts, and send personalized emails through your connected Gmail.
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-brand text-white text-xs font-bold"
            >
              <Plus className="w-4 h-4" /> Create Campaign
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {campaigns.map((camp) => (
              <div
                key={camp.id}
                className="p-5 rounded-2xl bg-surface border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-border/80 transition-all"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{camp.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        camp.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : camp.status === 'SENDING'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-surface-2 text-foreground-subtle border border-border'
                      }`}
                    >
                      {camp.status}
                    </span>
                  </div>
                  <div className="text-xs text-foreground-muted flex items-center gap-2">
                    <span>Subject: <strong className="text-foreground">{camp.subject}</strong></span>
                  </div>
                  <div className="text-[11px] text-foreground-subtle flex items-center gap-3 pt-1">
                    <span>{camp.totalRecipients} recipients</span>
                    <span>·</span>
                    <span className="text-emerald-400">{camp.totalSent} sent</span>
                    {camp.totalFailed > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-red-400">{camp.totalFailed} failed</span>
                      </>
                    )}
                    <span>·</span>
                    <span>Created {new Date(camp.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenRecipients(camp)}
                    className="px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface text-foreground text-xs font-semibold border border-border flex items-center gap-1.5 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Manage Recipients ({camp.totalRecipients})</span>
                  </button>

                  <button
                    onClick={() => handleSendCampaign(camp.id)}
                    disabled={isSending === camp.id || camp.totalRecipients === 0}
                    className="px-3.5 py-1.5 rounded-xl bg-brand hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-brand/20"
                  >
                    {isSending === camp.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{isSending === camp.id ? 'Sending...' : 'Send Campaign'}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteCampaign(camp.id)}
                    className="p-2 rounded-xl bg-surface-2 hover:bg-surface text-foreground-subtle hover:text-red-400 border border-border transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Campaign Modal */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-surface border border-brand/40 rounded-3xl max-w-xl w-full p-6 shadow-2xl my-8 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4 text-brand" /> New Outreach Campaign
                </h3>
                <button onClick={() => setIsCreateOpen(false)} className="text-foreground-subtle hover:text-foreground text-xs">
                  ✕
                </button>
              </div>

              {/* AI Assistant helper */}
              <div className="p-3.5 rounded-2xl bg-brand/5 border border-brand/20 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-brand">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Copy Generator (NVIDIA NIM)</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Cold pitch for SEO audit service to local dentists"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:border-brand"
                  />
                  <button
                    type="button"
                    onClick={handleAiDraft}
                    disabled={isGeneratingAi}
                    className="px-3 py-1.5 rounded-xl bg-brand hover:bg-brand-600 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1"
                  >
                    {isGeneratingAi ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    <span>Draft Email</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleCreateCampaign} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-foreground-muted mb-1">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Q4 Growth Leads Outreach"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground-muted mb-1">
                    Sender Account (From)
                  </label>
                  <select
                    value={selectedChannelId}
                    onChange={(e) => setSelectedChannelId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:border-brand"
                  >
                    {channels.length === 0 ? (
                      <option value="">No email channel connected (connect in Channels page)</option>
                    ) : (
                      channels.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.platform})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground-muted mb-1">
                    Email Subject Line
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Quick question regarding {{company}}'s marketing"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-foreground-muted">
                      Email Body Template
                    </label>
                    <span className="text-[10px] text-foreground-subtle">
                      Supported tags: <code>{'{{name}}'}</code>, <code>{'{{company}}'}</code>
                    </span>
                  </div>
                  <textarea
                    required
                    rows={6}
                    placeholder="Hi {{name}},&#10;&#10;I noticed your work at {{company}}..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full p-3 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:border-brand font-sans leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-foreground-muted hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand/20 transition-all"
                  >
                    Save Campaign
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Manage Recipients Modal */}
        {isRecipientsOpen && activeCampaign && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-surface border border-brand/40 rounded-3xl max-w-2xl w-full p-6 shadow-2xl my-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-brand" /> Recipients for: {activeCampaign.name}
                  </h3>
                  <p className="text-xs text-foreground-muted">
                    {recipients.length} total contacts loaded
                  </p>
                </div>
                <button
                  onClick={() => setIsRecipientsOpen(false)}
                  className="text-foreground-subtle hover:text-foreground text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Paste or Upload Box */}
              <div className="p-4 rounded-2xl bg-surface-2/60 border border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">
                    Add Contacts (Paste CSV or Text)
                  </label>
                  <span className="text-[10px] text-foreground-subtle">
                    Format: <code>email, Full Name, Company Name</code> (one per line)
                  </span>
                </div>
                <textarea
                  rows={4}
                  placeholder={`alex@acme.com, Alex Turner, Acme Inc&#10;sarah@designco.com, Sarah Lee, Design Co`}
                  value={rawContactsText}
                  onChange={(e) => setRawContactsText(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-surface border border-border text-foreground font-mono text-xs focus:outline-none focus:border-brand"
                />
                <button
                  type="button"
                  onClick={handleImportRecipients}
                  disabled={isImporting || !rawContactsText.trim()}
                  className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  {isImporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Add Recipients to Campaign</span>
                </button>
              </div>

              {/* Recipients Table */}
              <div className="max-h-60 overflow-y-auto border border-border rounded-xl">
                <table className="w-full text-left text-xs text-foreground">
                  <thead className="bg-surface-2 text-foreground-subtle text-[11px] uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="p-2.5">Email</th>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">Company</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {recipients.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-foreground-subtle text-xs">
                          No recipients added yet. Paste a list above to populate.
                        </td>
                      </tr>
                    ) : (
                      recipients.map((r) => (
                        <tr key={r.id} className="hover:bg-surface-2/40">
                          <td className="p-2.5 font-mono">{r.email}</td>
                          <td className="p-2.5">{r.name || '—'}</td>
                          <td className="p-2.5">{r.company || '—'}</td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                r.status === 'SENT'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : r.status === 'FAILED'
                                  ? 'bg-red-500/10 text-red-400'
                                  : 'bg-surface-2 text-foreground-subtle'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRecipientsOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface text-foreground font-semibold text-xs border border-border"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
