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
  Link as LinkIcon,
  Pencil,
  Shuffle,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { DashboardTopbar } from '@/components/DashboardTopbar';
import { inferContactDetails } from '@/lib/email/contact-infer';

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
  errorMessage?: string | null;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create / Edit Campaign Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
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
  const [isEnrichingAi, setIsEnrichingAi] = useState(false);
  const [recipientFilter, setRecipientFilter] = useState<'ALL' | 'SENT' | 'PENDING' | 'FAILED'>('ALL');
  const [recipientSearch, setRecipientSearch] = useState('');

  // Send status
  const [isSending, setIsSending] = useState<string | null>(null);
  const [isRetryingFailed, setIsRetryingFailed] = useState<string | null>(null);
  const [isRetryingSingle, setIsRetryingSingle] = useState<string | null>(null);
  const [sendFeedback, setSendFeedback] = useState<string | null>(null);

  function handleOpenCreate() {
    setEditingCampaignId(null);
    setCampaignName('');
    setSubject('');
    setBody('');
    setAiTopic('');
    if (channels.length > 0) setSelectedChannelId(channels[0].id);
    setIsModalOpen(true);
  }

  function handleOpenEdit(camp: Campaign) {
    setEditingCampaignId(camp.id);
    setCampaignName(camp.name);
    setSubject(camp.subject);
    setBody(camp.body || '');
    setSelectedChannelId(camp.fromChannelId || (channels.length > 0 ? channels[0].id : ''));
    setAiTopic('');
    setIsModalOpen(true);
  }

  function handleInsertLink() {
    const text = prompt('Enter clickable text (e.g. LinkedIn, GitHub, Portfolio):', 'LinkedIn');
    if (!text) return;
    const url = prompt(`Enter destination URL for "${text}":`, 'https://');
    if (!url) return;
    const cleanUrl = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;
    const mdLink = `[${text}](${cleanUrl})`;
    setBody((prev) => (prev ? `${prev} ${mdLink}` : mdLink));
  }

  function handleInsertTag(tag: string) {
    setBody((prev) => (prev ? `${prev} ${tag}` : tag));
  }

  function handleInsertSpintax() {
    const input = prompt(
      'Enter alternatives separated by | (e.g. Hi|Hello|Hey or I noticed|I saw):',
      'Hi|Hello|Hey'
    );
    if (!input) return;
    const clean = input.trim().replace(/^\{+|\}+$/g, '');
    const spintaxTag = `{${clean}}`;
    setBody((prev) => (prev ? `${prev} ${spintaxTag}` : spintaxTag));
  }

  function handleTestSpintax() {
    if (!body.trim()) {
      alert('Write or paste email body first to test Spintax.');
      return;
    }
    const spintaxRegex = /\{([^{}]+?\|[^{}]+?)\}/g;
    let sample = body;
    let loops = 0;
    while (spintaxRegex.test(sample) && loops < 10) {
      sample = sample.replace(spintaxRegex, (_match, group) => {
        const options = group.split('|');
        return options[Math.floor(Math.random() * options.length)] ?? '';
      });
      loops++;
    }
    sample = sample
      .replace(/{{name}}/gi, 'Sarah')
      .replace(/{{company}}/gi, 'Acme Corp');
    alert(`🎲 Live Spintax Variation Preview (for Sarah @ Acme Corp):\n\n${sample}`);
  }

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

  async function handleSaveCampaign(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingCampaignId) {
        const res = await fetch(`/api/campaigns/${editingCampaignId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: campaignName,
            subject,
            body,
            fromChannelId: selectedChannelId || undefined,
          }),
        });

        if (res.ok) {
          setIsModalOpen(false);
          setEditingCampaignId(null);
          loadData();
        } else {
          const err = await res.json();
          alert(`Failed to update campaign: ${err.error || 'Unknown error'}`);
        }
      } else {
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
          setIsModalOpen(false);
          setCampaignName('');
          setSubject('');
          setBody('');
          setAiTopic('');
          loadData();
        } else {
          const err = await res.json();
          alert(`Failed to create campaign: ${err.error || 'Unknown error'}`);
        }
      }
    } catch {
      alert('Error saving campaign');
    }
  }

  async function handleOpenRecipients(camp: Campaign) {
    setActiveCampaign(camp);
    setIsRecipientsOpen(true);
    setRecipientFilter('ALL');
    setRecipientSearch('');
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
      const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const lines = rawContactsText.split(/\r?\n/);
      const parsedList: Array<{ email: string; name?: string; company?: string }> = [];
      const seenEmails = new Set<string>();

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        const emailMatch = trimmedLine.match(EMAIL_REGEX);
        if (!emailMatch) continue;

        const email = emailMatch[0].toLowerCase();
        if (seenEmails.has(email)) continue;
        seenEmails.add(email);

        const parts = trimmedLine.split(',').map((s) => s.trim());
        let explicitName: string | undefined = undefined;
        let explicitCompany: string | undefined = undefined;

        if (parts.length >= 2) {
          if (parts[0].toLowerCase().includes(email)) {
            explicitName = parts[1] || undefined;
            explicitCompany = parts[2] || undefined;
          } else if (parts[1].toLowerCase().includes(email)) {
            explicitName = parts[0] || undefined;
            explicitCompany = parts[2] || undefined;
          }
        }

        // Auto-detect missing Name and Company
        const inferred = inferContactDetails(email, explicitName, explicitCompany);
        parsedList.push({
          email: inferred.email,
          name: inferred.name || undefined,
          company: inferred.company || undefined,
        });
      }

      if (parsedList.length === 0) {
        alert('No valid email addresses found in the pasted text.');
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
        const errDetail = typeof d.error === 'string'
          ? d.error
          : (d.error?.message || JSON.stringify(d.error) || 'Failed to import recipients');
        alert(`Error importing: ${errDetail}`);
      }
    } catch {
      alert('Error importing recipients. Please check connection.');
    } finally {
      setIsImporting(false);
    }
  }

  async function handleAiEnrichContacts() {
    if (!activeCampaign) return;
    setIsEnrichingAi(true);
    try {
      const res = await fetch(`/api/campaigns/${activeCampaign.id}/recipients/ai-enrich`, {
        method: 'POST',
      });
      const d = await res.json();
      if (res.ok) {
        alert(d.message || `Enriched ${d.enrichedCount} contacts with AI`);
        handleOpenRecipients(activeCampaign);
      } else {
        alert(d.error || 'AI enrichment failed');
      }
    } catch {
      alert('Error calling AI enrichment');
    } finally {
      setIsEnrichingAi(false);
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

  async function handleRetryFailedCampaign(campId: string) {
    setIsRetryingFailed(campId);
    try {
      const res = await fetch(`/api/campaigns/${campId}/recipients`, {
        method: 'PATCH',
      });
      const d = await res.json();
      if (res.ok) {
        if (activeCampaign && activeCampaign.id === campId) {
          await handleOpenRecipients(activeCampaign);
        }
        await loadData();
      } else {
        alert(d.error || 'Failed to reset failed recipients');
      }
    } catch {
      alert('Error resetting failed recipients');
    } finally {
      setIsRetryingFailed(null);
    }
  }

  async function handleRetrySingleRecipient(recipientId: string) {
    if (!activeCampaign) return;
    setIsRetryingSingle(recipientId);
    try {
      const res = await fetch(`/api/campaigns/${activeCampaign.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId }),
      });
      const d = await res.json();
      if (res.ok) {
        await handleOpenRecipients(activeCampaign);
        await loadData();
      } else {
        alert(d.error || 'Failed to dispatch email');
      }
    } catch {
      alert('Network error while dispatching email');
    } finally {
      setIsRetryingSingle(null);
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

  const countSent = recipients.filter((r) => r.status === 'SENT').length;
  const countPending = recipients.filter((r) => r.status === 'PENDING').length;
  const countFailed = recipients.filter((r) => r.status === 'FAILED').length;

  const filteredRecipients = recipients.filter((r) => {
    if (recipientFilter !== 'ALL' && r.status !== recipientFilter) return false;
    if (recipientSearch.trim()) {
      const q = recipientSearch.toLowerCase();
      const matchEmail = r.email.toLowerCase().includes(q);
      const matchName = (r.name || '').toLowerCase().includes(q);
      const matchCompany = (r.company || '').toLowerCase().includes(q);
      if (!matchEmail && !matchName && !matchCompany) return false;
    }
    return true;
  });

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
            onClick={handleOpenCreate}
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
              onClick={handleOpenCreate}
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
                    onClick={() => handleOpenEdit(camp)}
                    className="px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface text-foreground text-xs font-semibold border border-border flex items-center gap-1.5 transition-colors"
                    title="Edit Campaign"
                  >
                    <Pencil className="w-3.5 h-3.5 text-foreground-muted" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleOpenRecipients(camp)}
                    className="px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface text-foreground text-xs font-semibold border border-border flex items-center gap-1.5 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Manage Recipients ({camp.totalRecipients})</span>
                  </button>

                  {camp.totalFailed > 0 && (
                    <button
                      onClick={() => handleRetryFailedCampaign(camp.id)}
                      disabled={isRetryingFailed === camp.id}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
                      title="Reset failed recipients to Pending so they can be re-sent"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRetryingFailed === camp.id ? 'animate-spin' : ''}`} />
                      <span>Retry Failed ({camp.totalFailed})</span>
                    </button>
                  )}

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
                    title="Delete Campaign"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create / Edit Campaign Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden">
            <div className="bg-surface border border-brand/40 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <form onSubmit={handleSaveCampaign} className="flex flex-col h-full max-h-[90vh] overflow-hidden">
                {/* Fixed Header */}
                <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between shrink-0 bg-surface">
                  <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                    <Mail className="w-4 h-4 text-brand" /> {editingCampaignId ? 'Edit Outreach Campaign' : 'New Outreach Campaign'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-7 h-7 rounded-lg text-foreground-subtle hover:text-foreground hover:bg-surface-2 transition-colors flex items-center justify-center text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Scrollable Form Body */}
                <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
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
                        className="px-3 py-1.5 rounded-xl bg-brand hover:bg-brand-600 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1 shrink-0"
                      >
                        {isGeneratingAi ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        <span>Draft Email</span>
                      </button>
                    </div>
                  </div>

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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                      <label className="text-xs font-semibold text-foreground-muted">
                        Email Body Template
                      </label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleInsertTag('{{name}}')}
                          className="px-2 py-0.5 rounded-lg bg-surface-2 hover:bg-surface border border-border text-[10px] font-mono text-foreground font-semibold"
                          title="Insert recipient name"
                        >
                          + {'{{name}}'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertTag('{{company}}')}
                          className="px-2 py-0.5 rounded-lg bg-surface-2 hover:bg-surface border border-border text-[10px] font-mono text-foreground font-semibold"
                          title="Insert company name"
                        >
                          + {'{{company}}'}
                        </button>
                        <button
                          type="button"
                          onClick={handleInsertSpintax}
                          className="px-2 py-0.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-[10px] text-purple-400 font-bold flex items-center gap-1 transition-colors"
                          title="Insert anti-spam dynamic Spintax: {Hi|Hello|Hey}"
                        >
                          <Shuffle className="w-3 h-3" /> + {'{Spintax}'}
                        </button>
                        <button
                          type="button"
                          onClick={handleInsertLink}
                          className="px-2 py-0.5 rounded-lg bg-brand/10 hover:bg-brand/20 border border-brand/20 text-[10px] text-brand font-bold flex items-center gap-1 transition-colors"
                          title="Insert clickable hyperlink"
                        >
                          <LinkIcon className="w-3 h-3" /> Link
                        </button>
                        <button
                          type="button"
                          onClick={handleTestSpintax}
                          className="px-2 py-0.5 rounded-lg bg-surface-2 hover:bg-surface border border-border text-[10px] text-foreground-subtle hover:text-foreground font-semibold flex items-center gap-1 transition-colors"
                          title="Test how random Spintax variations will look for a recipient"
                        >
                          <Sparkles className="w-3 h-3 text-amber-400" /> Preview Variation
                        </button>
                      </div>
                    </div>
                    <textarea
                      required
                      rows={5}
                      placeholder="{Hi|Hello|Hey} {{name}},&#10;&#10;{I noticed|I saw} your work at {{company}}...&#10;&#10;Connect with me:&#10;[LinkedIn](https://linkedin.com/in/...) | [GitHub](https://github.com/...)"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      className="w-full p-3 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:border-brand font-sans leading-relaxed"
                    />
                    <div className="mt-1.5 p-2.5 rounded-xl bg-surface-2/60 border border-border text-[11px] text-foreground-subtle leading-normal space-y-1.5">
                      <div className="flex items-center gap-1.5 text-purple-400 font-bold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Anti-Spam Deliverability Protections Active:</span>
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-[11px]">
                        <li>
                          <strong className="text-foreground">Spintax Variations:</strong> Use <code>{'{Hi|Hello|Hey}'}</code> or <code>{'{I noticed|I came across}'}</code>. Every recipient receives a unique combination of sentences so spam filters cannot fingerprint your email.
                        </li>
                        <li>
                          <strong className="text-foreground">Humanized Jitter Delay:</strong> Outgoing emails are sent with randomized delays to avoid robotic rate-limit triggers.
                        </li>
                        <li>
                          <strong className="text-foreground">Clickable Hyperlinks:</strong> Use <code>[LinkedIn](https://...)</code> or click <strong>Link</strong> above.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Fixed Footer */}
                <div className="p-3 sm:p-4 px-5 border-t border-border flex items-center justify-end gap-2.5 shrink-0 bg-surface">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand/20 transition-all flex items-center gap-1.5"
                  >
                    {editingCampaignId ? 'Update Campaign' : 'Save Campaign'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Manage Recipients Modal */}
        {isRecipientsOpen && activeCampaign && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden">
            <div className="bg-surface border border-brand/40 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Fixed Header */}
              <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between shrink-0 bg-surface">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-brand" /> Recipients for: {activeCampaign.name}
                  </h3>
                  <p className="text-xs text-foreground-muted">
                    {recipients.length} total contacts loaded
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRecipientsOpen(false)}
                  className="w-7 h-7 rounded-lg text-foreground-subtle hover:text-foreground hover:bg-surface-2 transition-colors flex items-center justify-center text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
                {/* Paste or Upload Box */}
                <div className="p-4 rounded-2xl bg-surface-2/60 border border-border space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-xs font-bold text-foreground">
                      Add Contacts (Paste Emails or CSV)
                    </label>
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Auto-detects Name & Company if missing
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    placeholder={`alex.smith@company.com\nsarah_lee@enterprise.org\njobs@startup.io\ncontact@business.com, John Doe`}
                    value={rawContactsText}
                    onChange={(e) => setRawContactsText(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-surface border border-border text-foreground font-mono text-xs focus:outline-none focus:border-brand"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleImportRecipients}
                      disabled={isImporting || !rawContactsText.trim()}
                      className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-brand/20"
                    >
                      {isImporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>Add & Auto-Detect Contacts</span>
                    </button>

                    {recipients.length > 0 && (
                      <button
                        type="button"
                        onClick={handleAiEnrichContacts}
                        disabled={isEnrichingAi}
                        className="px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 text-xs font-bold flex items-center gap-1.5 transition-all"
                        title="Use NVIDIA NIM AI to refine ambiguous names and companies"
                      >
                        {isEnrichingAi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        <span>AI Refine Names</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-foreground-subtle">
                    💡 <strong>Tip:</strong> You can paste raw email addresses alone! The system automatically infers the person&apos;s name and company (e.g. <code>alex.smith@company.com</code> ➔ Alex Smith @ Company).
                  </p>
                </div>

                {/* Filter Tabs & Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                  {/* Status Filter Tabs */}
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-2/80 border border-border text-xs overflow-x-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setRecipientFilter('ALL')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        recipientFilter === 'ALL'
                          ? 'bg-brand text-white shadow-sm'
                          : 'text-foreground-muted hover:text-foreground'
                      }`}
                    >
                      All ({recipients.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipientFilter('SENT')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                        recipientFilter === 'SENT'
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Sent ({countSent})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipientFilter('PENDING')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                        recipientFilter === 'PENDING'
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'text-foreground-muted hover:bg-surface'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>Pending ({countPending})</span>
                    </button>
                    {countFailed > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setRecipientFilter('FAILED')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                            recipientFilter === 'FAILED'
                              ? 'bg-red-500 text-white shadow-sm'
                              : 'text-red-400 hover:bg-red-500/10'
                          }`}
                        >
                          <AlertCircle className="w-3 h-3" />
                          <span>Failed ({countFailed})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRetryFailedCampaign(activeCampaign.id)}
                          disabled={isRetryingFailed === activeCampaign.id}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition-all shrink-0 disabled:opacity-50"
                          title="Reset all failed contacts back to Pending so you can send again"
                        >
                          <RefreshCw className={`w-3 h-3 ${isRetryingFailed === activeCampaign.id ? 'animate-spin' : ''}`} />
                          <span>Retry Failed ({countFailed})</span>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Search Bar */}
                  <div className="relative flex-1 sm:max-w-xs">
                    <Search className="w-3.5 h-3.5 text-foreground-subtle absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search email, name or company..."
                      value={recipientSearch}
                      onChange={(e) => setRecipientSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:border-brand"
                    />
                  </div>
                </div>

                {/* Recipients Table */}
                <div className="max-h-72 overflow-x-auto overflow-y-auto border border-border rounded-xl">
                  <table className="min-w-[760px] w-full text-left text-xs text-foreground">
                    <thead className="bg-surface-2 text-foreground-subtle text-[11px] uppercase tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="p-3 w-[220px]">Email</th>
                        <th className="p-3 w-[130px]">Name</th>
                        <th className="p-3 w-[130px]">Company</th>
                        <th className="p-3 w-[80px]">Status</th>
                        <th className="p-3 min-w-[150px] whitespace-nowrap">Logs / Sent Time</th>
                        <th className="p-3 w-[90px] text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredRecipients.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-foreground-subtle text-xs">
                            {recipients.length === 0
                              ? 'No recipients added yet. Paste a list above to populate.'
                              : 'No recipients match the selected filter or search.'}
                          </td>
                        </tr>
                      ) : (
                        filteredRecipients.map((r) => (
                          <tr key={r.id} className="hover:bg-surface-2/40">
                            <td className="p-3 font-mono">{r.email}</td>
                            <td className="p-3">{r.name || '—'}</td>
                            <td className="p-3">{r.company || '—'}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                  r.status === 'SENT'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : r.status === 'FAILED'
                                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    : 'bg-surface-2 text-foreground-subtle border border-border'
                                }`}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td className="p-3 text-[11px] whitespace-nowrap">
                              {r.status === 'SENT' && (
                                <span className="text-emerald-400 flex items-center gap-1.5 font-mono">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  <span>{r.sentAt ? new Date(r.sentAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Dispatched'}</span>
                                </span>
                              )}
                              {r.status === 'FAILED' && (
                                <span className="text-red-400 font-semibold" title={r.errorMessage || 'Send Failed'}>
                                  ⚠ {r.errorMessage || 'Send Failed'}
                                </span>
                              )}
                              {r.status === 'PENDING' && (
                                <span className="text-foreground-subtle flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 shrink-0" />
                                  <span>Queued for dispatch</span>
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleRetrySingleRecipient(r.id)}
                                disabled={isRetryingSingle === r.id}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all disabled:opacity-50 ${
                                  r.status === 'FAILED'
                                    ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30'
                                    : r.status === 'PENDING'
                                    ? 'bg-brand/20 text-brand-hover hover:bg-brand/30 border border-brand/30'
                                    : 'bg-surface-2 text-foreground-subtle hover:text-foreground border border-border'
                                }`}
                                title={
                                  r.status === 'FAILED'
                                    ? 'Retry sending this email'
                                    : r.status === 'PENDING'
                                    ? 'Send this email now'
                                    : 'Resend this email'
                                }
                              >
                                <RefreshCw className={`w-3 h-3 ${isRetryingSingle === r.id ? 'animate-spin' : ''}`} />
                                <span>{r.status === 'FAILED' ? 'Retry' : r.status === 'PENDING' ? 'Send' : 'Resend'}</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="p-3 sm:p-4 px-5 border-t border-border flex items-center justify-end shrink-0 bg-surface">
                <button
                  type="button"
                  onClick={() => setIsRecipientsOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface text-foreground font-semibold text-xs border border-border transition-colors"
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
