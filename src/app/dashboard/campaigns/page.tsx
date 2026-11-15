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
  Copy,
  Download,
  Split,
  Merge,
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
  const [isResendingAll, setIsResendingAll] = useState<string | null>(null);
  const [isRetryingFailed, setIsRetryingFailed] = useState<string | null>(null);
  const [isRetryingSingle, setIsRetryingSingle] = useState<string | null>(null);
  const [isRemovingRecipient, setIsRemovingRecipient] = useState<string | null>(null);
  const [isExportingEmails, setIsExportingEmails] = useState<string | null>(null);
  const [sendFeedback, setSendFeedback] = useState<string | null>(null);

  // Duplicate Campaign State
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [campaignToDuplicate, setCampaignToDuplicate] = useState<Campaign | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicateWhat, setDuplicateWhat] = useState<'BOTH' | 'EMAIL_ONLY' | 'RECIPIENTS_ONLY'>('BOTH');
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Split Campaign State
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [campaignToSplit, setCampaignToSplit] = useState<Campaign | null>(null);
  const [splitMode, setSplitMode] = useState<'BATCH_SIZE' | 'NUM_PARTS' | 'STATUS'>('BATCH_SIZE');
  const [splitBatchSize, setSplitBatchSize] = useState<number>(25);
  const [splitNumParts, setSplitNumParts] = useState<number>(2);
  const [splitStatuses, setSplitStatuses] = useState<string[]>(['PENDING', 'FAILED', 'SENT']);
  const [splitNamePrefix, setSplitNamePrefix] = useState<string>('');
  const [splitRecipientFilter, setSplitRecipientFilter] = useState<'ALL' | 'PENDING' | 'SENT' | 'FAILED'>('ALL');
  const [splitCopyEmail, setSplitCopyEmail] = useState<boolean>(true);
  const [splitMoveRecipients, setSplitMoveRecipients] = useState<boolean>(false);
  const [isSplitting, setIsSplitting] = useState<boolean>(false);

  // Merge Campaigns State
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [selectedMergeSourceIds, setSelectedMergeSourceIds] = useState<string[]>([]);
  const [mergeTargetMode, setMergeTargetMode] = useState<'NEW' | 'EXISTING'>('NEW');
  const [mergeTargetId, setMergeTargetId] = useState<string>('');
  const [mergeNewName, setMergeNewName] = useState<string>('');
  const [mergeTemplateId, setMergeTemplateId] = useState<string>('');
  const [mergeStatusFilter, setMergeStatusFilter] = useState<'ALL' | 'PENDING' | 'SENT' | 'FAILED'>('ALL');
  const [mergeResetStatus, setMergeResetStatus] = useState<boolean>(true);
  const [mergeDeleteSources, setMergeDeleteSources] = useState<boolean>(false);
  const [isMerging, setIsMerging] = useState<boolean>(false);

  // Source campaign copy in Create Modal
  const [selectedSourceCampaignId, setSelectedSourceCampaignId] = useState('');
  const [copyEmailOnCreate, setCopyEmailOnCreate] = useState(true);
  const [copyRecipientsOnCreate, setCopyRecipientsOnCreate] = useState(false);

  function handleOpenCreate() {
    setEditingCampaignId(null);
    setCampaignName('');
    setSubject('');
    setBody('');
    setAiTopic('');
    setSelectedSourceCampaignId('');
    setCopyEmailOnCreate(true);
    setCopyRecipientsOnCreate(false);
    if (channels.length > 0) setSelectedChannelId(channels[0].id);
    setIsModalOpen(true);
  }

  function handleOpenDuplicate(camp: Campaign) {
    setCampaignToDuplicate(camp);
    setDuplicateName(`${camp.name} (Copy)`);
    setDuplicateWhat('BOTH');
    setIsDuplicateModalOpen(true);
  }

  async function handleConfirmDuplicate() {
    if (!campaignToDuplicate || !duplicateName.trim()) return;
    setIsDuplicating(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignToDuplicate.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: duplicateName.trim(),
          copyEmail: duplicateWhat === 'BOTH' || duplicateWhat === 'EMAIL_ONLY',
          copyRecipients: duplicateWhat === 'BOTH' || duplicateWhat === 'RECIPIENTS_ONLY',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsDuplicateModalOpen(false);
        setCampaignToDuplicate(null);
        await loadData();
        setSendFeedback(`Campaign "${duplicateName.trim()}" created successfully!`);
      } else {
        alert(data.error || 'Failed to duplicate campaign');
      }
    } catch {
      alert('Network error while duplicating campaign');
    } finally {
      setIsDuplicating(false);
    }
  }

  function handleOpenSplit(camp: Campaign) {
    setCampaignToSplit(camp);
    setSplitNamePrefix(camp.name);
    const total = camp.totalRecipients || 50;
    if (total <= 50) setSplitBatchSize(Math.max(1, Math.floor(total / 2)) || 10);
    else if (total <= 100) setSplitBatchSize(25);
    else setSplitBatchSize(50);
    setSplitNumParts(2);
    setSplitMode('BATCH_SIZE');
    setSplitStatuses(['PENDING', 'FAILED', 'SENT']);
    setSplitRecipientFilter('ALL');
    setSplitCopyEmail(true);
    setSplitMoveRecipients(false);
    setIsSplitModalOpen(true);
  }

  async function handleConfirmSplit() {
    if (!campaignToSplit) return;
    setIsSplitting(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignToSplit.id}/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: splitMode,
          batchSize: splitBatchSize,
          numParts: splitNumParts,
          statuses: splitStatuses,
          namePrefix: splitNamePrefix.trim() || campaignToSplit.name,
          copyEmail: splitCopyEmail,
          moveRecipients: splitMoveRecipients,
          recipientStatusFilter: splitRecipientFilter,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsSplitModalOpen(false);
        setCampaignToSplit(null);
        await loadData();
        setSendFeedback(data.message || `Split into ${data.totalCreated} campaigns!`);
      } else {
        alert(data.error || 'Failed to split campaign');
      }
    } catch {
      alert('Network error while splitting campaign');
    } finally {
      setIsSplitting(false);
    }
  }

  function handleOpenMerge(initialCampaign?: Campaign) {
    if (initialCampaign) {
      const other = campaigns.find((c) => c.id !== initialCampaign.id);
      setSelectedMergeSourceIds(other ? [initialCampaign.id, other.id] : [initialCampaign.id]);
      setMergeNewName(`${initialCampaign.name} (Merged)`);
      setMergeTemplateId(initialCampaign.id);
      setMergeTargetId(initialCampaign.id);
    } else {
      if (campaigns.length >= 2) {
        setSelectedMergeSourceIds([campaigns[0].id, campaigns[1].id]);
        setMergeNewName(`Merged Campaigns (${new Date().toLocaleDateString()})`);
        setMergeTemplateId(campaigns[0].id);
        setMergeTargetId(campaigns[0].id);
      } else if (campaigns.length === 1) {
        setSelectedMergeSourceIds([campaigns[0].id]);
        setMergeNewName(`${campaigns[0].name} (Merged)`);
        setMergeTemplateId(campaigns[0].id);
        setMergeTargetId(campaigns[0].id);
      }
    }
    setMergeTargetMode('NEW');
    setMergeStatusFilter('ALL');
    setMergeResetStatus(true);
    setMergeDeleteSources(false);
    setIsMergeModalOpen(true);
  }

  function handleToggleMergeSource(id: string) {
    setSelectedMergeSourceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function handleConfirmMerge() {
    if (selectedMergeSourceIds.length < 2) {
      alert('Please select at least 2 campaigns to merge.');
      return;
    }
    if (mergeTargetMode === 'NEW' && !mergeNewName.trim()) {
      alert('Please enter a name for the new merged campaign.');
      return;
    }
    setIsMerging(true);
    try {
      const res = await fetch('/api/campaigns/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCampaignIds: selectedMergeSourceIds,
          targetCampaignId: mergeTargetMode === 'EXISTING' ? mergeTargetId : undefined,
          newCampaignName: mergeTargetMode === 'NEW' ? mergeNewName.trim() : undefined,
          templateCampaignId: mergeTemplateId || undefined,
          recipientStatusFilter: mergeStatusFilter,
          resetStatusToPending: mergeResetStatus,
          deleteSourceCampaigns: mergeDeleteSources,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsMergeModalOpen(false);
        setSelectedMergeSourceIds([]);
        await loadData();
        setSendFeedback(data.message || `Successfully merged campaigns!`);
      } else {
        alert(data.error || 'Failed to merge campaigns');
      }
    } catch {
      alert('Network error while merging campaigns');
    } finally {
      setIsMerging(false);
    }
  }

  function handleSelectSourceCampaign(sourceId: string) {
    setSelectedSourceCampaignId(sourceId);
    if (!sourceId) {
      setCampaignName('');
      setSubject('');
      setBody('');
      setCopyRecipientsOnCreate(false);
      return;
    }
    const src = campaigns.find((c) => c.id === sourceId);
    if (!src) return;
    setCampaignName(`${src.name} (Copy)`);
    setSubject(src.subject);
    setBody(src.body || '');
    if (src.fromChannelId) setSelectedChannelId(src.fromChannelId);
    setCopyEmailOnCreate(true);
    setCopyRecipientsOnCreate(src.totalRecipients > 0);
  }

  function handleToggleCopyEmail(checked: boolean) {
    setCopyEmailOnCreate(checked);
    if (!selectedSourceCampaignId) return;
    const src = campaigns.find((c) => c.id === selectedSourceCampaignId);
    if (!src) return;
    if (checked) {
      setSubject(src.subject);
      setBody(src.body || '');
      if (src.fromChannelId) setSelectedChannelId(src.fromChannelId);
    } else {
      setSubject('');
      setBody('');
    }
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
    // loadData is an intentionally stable page bootstrap action.
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const endpoint = selectedSourceCampaignId && copyRecipientsOnCreate
          ? `/api/campaigns/${selectedSourceCampaignId}/duplicate`
          : '/api/campaigns';

        const payload = selectedSourceCampaignId && copyRecipientsOnCreate
          ? {
              name: campaignName,
              subject,
              body,
              fromChannelId: selectedChannelId || undefined,
              copyEmail: true,
              copyRecipients: true,
            }
          : {
              name: campaignName,
              subject,
              body,
              fromChannelId: selectedChannelId || undefined,
            };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          setIsModalOpen(false);
          setCampaignName('');
          setSubject('');
          setBody('');
          setAiTopic('');
          setSelectedSourceCampaignId('');
          setCopyRecipientsOnCreate(false);
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

  async function handleSendPendingFromModal() {
    if (!activeCampaign || countPending === 0) return;
    await handleSendCampaign(activeCampaign.id);
    await handleOpenRecipients(activeCampaign);
  }

  async function handleResendAll(camp: Campaign) {
    if (camp.totalSent === 0) return;
    if (!confirm(`Resend this campaign to all ${camp.totalRecipients} recipients, including recipients already marked sent?`)) return;
    setIsResendingAll(camp.id);
    setSendFeedback(null);

    try {
      const res = await fetch(`/api/campaigns/${camp.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resendAll: true }),
      });
      const d = await res.json();
      if (res.ok) {
        setSendFeedback(`Campaign resent. Dispatched: ${d.sent}, Failed: ${d.failed}`);
        if (activeCampaign?.id === camp.id) await handleOpenRecipients(camp);
        await loadData();
      } else {
        alert(`Resend failed: ${d.error || 'Check channel connection'}`);
      }
    } catch {
      alert('Network error while resending campaign');
    } finally {
      setIsResendingAll(null);
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

  async function handleRemoveRecipient(recipient: Recipient) {
    if (!activeCampaign) return;
    if (!confirm(`Remove ${recipient.email} from this campaign?`)) return;
    setIsRemovingRecipient(recipient.id);
    try {
      const res = await fetch(`/api/campaigns/${activeCampaign.id}/recipients?recipientId=${encodeURIComponent(recipient.id)}`, {
        method: 'DELETE',
      });
      const d = await res.json();
      if (res.ok) {
        await handleOpenRecipients(activeCampaign);
        await loadData();
      } else {
        alert(d.error || 'Failed to remove recipient');
      }
    } catch {
      alert('Error removing recipient');
    } finally {
      setIsRemovingRecipient(null);
    }
  }

  async function handleExportEmailIds(camp: Campaign) {
    if (camp.totalRecipients === 0) return;
    setIsExportingEmails(camp.id);

    try {
      const res = await fetch(`/api/campaigns/${camp.id}/recipients/export`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to export email IDs');
        return;
      }

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${camp.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'campaign'}-email-ids.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch {
      alert('Network error while exporting email IDs');
    } finally {
      setIsExportingEmails(null);
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
          <div className="flex items-center gap-2">
            {campaigns.length >= 2 && (
              <button
                onClick={() => handleOpenMerge()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-2 hover:bg-surface border border-border text-foreground text-xs font-semibold transition-all shadow-sm"
                title="Merge 2 or more campaigns on basis of recipients"
              >
                <Merge className="w-3.5 h-3.5 text-purple-400" />
                <span>Merge Campaigns</span>
              </button>
            )}
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand hover:bg-brand-600 text-white text-xs font-bold transition-all shadow-md shadow-brand/20"
            >
              <Plus className="w-4 h-4" /> New Campaign
            </button>
          </div>
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
                    onClick={() => handleOpenDuplicate(camp)}
                    className="px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface text-foreground text-xs font-semibold border border-border flex items-center gap-1.5 transition-colors"
                    title="Duplicate Campaign"
                  >
                    <Copy className="w-3.5 h-3.5 text-foreground-muted" />
                    <span>Duplicate</span>
                  </button>

                  <button
                    onClick={() => handleOpenSplit(camp)}
                    disabled={camp.totalRecipients === 0}
                    className="px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface text-foreground text-xs font-semibold border border-border flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    title="Split campaign recipients into batches or by status"
                  >
                    <Split className="w-3.5 h-3.5 text-blue-400" />
                    <span>Split</span>
                  </button>

                  {campaigns.length >= 2 && (
                    <button
                      onClick={() => handleOpenMerge(camp)}
                      className="px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface text-foreground text-xs font-semibold border border-border flex items-center gap-1.5 transition-colors"
                      title="Merge this campaign with other campaigns"
                    >
                      <Merge className="w-3.5 h-3.5 text-purple-400" />
                      <span>Merge</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleOpenRecipients(camp)}
                    className="px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface text-foreground text-xs font-semibold border border-border flex items-center gap-1.5 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Manage Recipients ({camp.totalRecipients})</span>
                  </button>

                  <button
                    onClick={() => handleExportEmailIds(camp)}
                    disabled={isExportingEmails === camp.id || camp.totalRecipients === 0}
                    className="px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface text-foreground text-xs font-semibold border border-border flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    title="Download recipient email IDs as JSON"
                  >
                    {isExportingEmails === camp.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-foreground-muted" />
                    )}
                    <span>{isExportingEmails === camp.id ? 'Exporting...' : 'Export JSON'}</span>
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

                  {camp.totalSent > 0 && (
                    <button
                      onClick={() => handleResendAll(camp)}
                      disabled={isResendingAll === camp.id}
                      className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
                      title="Resend this campaign to every recipient, including recipients already sent"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isResendingAll === camp.id ? 'animate-spin' : ''}`} />
                      <span>{isResendingAll === camp.id ? 'Resending...' : 'Resend All'}</span>
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
                  {/* Duplicate from existing campaign option */}
                  {!editingCampaignId && campaigns.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-surface-2/80 border border-border space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                          <Copy className="w-3.5 h-3.5 text-brand" />
                          <span>Duplicate from Existing Campaign</span>
                        </div>
                        {selectedSourceCampaignId && (
                          <button
                            type="button"
                            onClick={() => handleSelectSourceCampaign('')}
                            className="text-[11px] text-foreground-subtle hover:text-foreground font-semibold"
                          >
                            Reset to Blank
                          </button>
                        )}
                      </div>

                      <select
                        value={selectedSourceCampaignId}
                        onChange={(e) => handleSelectSourceCampaign(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground text-xs focus:outline-none focus:border-brand"
                      >
                        <option value="">Start from scratch (blank campaign)</option>
                        {campaigns.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.totalRecipients} recipients)
                          </option>
                        ))}
                      </select>

                      {selectedSourceCampaignId && (
                        <div className="p-2.5 rounded-xl bg-surface border border-border/80 flex flex-col sm:flex-row gap-3 text-xs">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={copyEmailOnCreate}
                              onChange={(e) => handleToggleCopyEmail(e.target.checked)}
                              className="rounded border-border text-brand focus:ring-brand w-4 h-4"
                            />
                            <span className="font-medium text-foreground">Copy Email (Subject & Body)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={copyRecipientsOnCreate}
                              onChange={(e) => setCopyRecipientsOnCreate(e.target.checked)}
                              className="rounded border-border text-brand focus:ring-brand w-4 h-4"
                            />
                            <span className="font-medium text-foreground">
                              Copy Recipients ({campaigns.find((c) => c.id === selectedSourceCampaignId)?.totalRecipients || 0} contacts)
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  )}

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

        {/* Duplicate Campaign Modal */}
        {isDuplicateModalOpen && campaignToDuplicate && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden">
            <div className="bg-surface border border-brand/40 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between shrink-0 bg-surface">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                    <Copy className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground">Duplicate Campaign</h3>
                    <p className="text-xs text-foreground-subtle">
                      Clone &quot;{campaignToDuplicate.name}&quot; with 1 click
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDuplicateModalOpen(false)}
                  className="text-foreground-subtle hover:text-foreground text-sm p-1.5 rounded-xl hover:bg-surface-2 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
                <div>
                  <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                    New Campaign Name
                  </label>
                  <input
                    type="text"
                    required
                    value={duplicateName}
                    onChange={(e) => setDuplicateName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:border-brand font-medium"
                    placeholder="e.g. Mohammad Zaid (Batch 2)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground-muted mb-2">
                    What would you like to copy?
                  </label>
                  <div className="space-y-2">
                    <label
                      onClick={() => setDuplicateWhat('BOTH')}
                      className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                        duplicateWhat === 'BOTH'
                          ? 'bg-brand/10 border-brand text-foreground shadow-sm'
                          : 'bg-surface-2 border-border text-foreground-muted hover:border-border/80'
                      }`}
                    >
                      <input
                        type="radio"
                        name="duplicateWhat"
                        value="BOTH"
                        checked={duplicateWhat === 'BOTH'}
                        onChange={() => setDuplicateWhat('BOTH')}
                        className="mt-0.5 text-brand focus:ring-brand"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-foreground block">
                          Both: Email & Recipients
                        </span>
                        <span className="text-[11px] text-foreground-subtle block mt-0.5 leading-relaxed">
                          Clones the subject line, email template, sender account, and all {campaignToDuplicate.totalRecipients} contacts as fresh pending recipients.
                        </span>
                      </div>
                    </label>

                    <label
                      onClick={() => setDuplicateWhat('EMAIL_ONLY')}
                      className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                        duplicateWhat === 'EMAIL_ONLY'
                          ? 'bg-brand/10 border-brand text-foreground shadow-sm'
                          : 'bg-surface-2 border-border text-foreground-muted hover:border-border/80'
                      }`}
                    >
                      <input
                        type="radio"
                        name="duplicateWhat"
                        value="EMAIL_ONLY"
                        checked={duplicateWhat === 'EMAIL_ONLY'}
                        onChange={() => setDuplicateWhat('EMAIL_ONLY')}
                        className="mt-0.5 text-brand focus:ring-brand"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-foreground block">
                          Email Content Only
                        </span>
                        <span className="text-[11px] text-foreground-subtle block mt-0.5 leading-relaxed">
                          Copies subject line, email template, and sender account. Recipients list starts empty (0 contacts) so you can add new contacts.
                        </span>
                      </div>
                    </label>

                    <label
                      onClick={() => setDuplicateWhat('RECIPIENTS_ONLY')}
                      className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                        duplicateWhat === 'RECIPIENTS_ONLY'
                          ? 'bg-brand/10 border-brand text-foreground shadow-sm'
                          : 'bg-surface-2 border-border text-foreground-muted hover:border-border/80'
                      }`}
                    >
                      <input
                        type="radio"
                        name="duplicateWhat"
                        value="RECIPIENTS_ONLY"
                        checked={duplicateWhat === 'RECIPIENTS_ONLY'}
                        onChange={() => setDuplicateWhat('RECIPIENTS_ONLY')}
                        className="mt-0.5 text-brand focus:ring-brand"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-foreground block">
                          Recipients Only
                        </span>
                        <span className="text-[11px] text-foreground-subtle block mt-0.5 leading-relaxed">
                          Clones all {campaignToDuplicate.totalRecipients} contacts as fresh pending recipients. Subject and body remain blank for a brand new pitch.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 sm:p-4 px-5 border-t border-border flex items-center justify-end gap-2.5 shrink-0 bg-surface">
                <button
                  type="button"
                  onClick={() => setIsDuplicateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-foreground-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDuplicate}
                  disabled={isDuplicating || !duplicateName.trim()}
                  className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-brand/20 transition-all"
                >
                  {isDuplicating ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{isDuplicating ? 'Duplicating...' : 'Duplicate Campaign'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Split Campaign Modal */}
        {isSplitModalOpen && campaignToSplit && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden">
            <div className="bg-surface border border-brand/40 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between shrink-0 bg-surface">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Split className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground">Split Campaign</h3>
                    <p className="text-xs text-foreground-subtle">
                      Divide &quot;{campaignToSplit.name}&quot; on basis of recipients ({campaignToSplit.totalRecipients} contacts)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSplitModalOpen(false)}
                  className="text-foreground-subtle hover:text-foreground text-sm p-1.5 rounded-xl hover:bg-surface-2 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
                {/* Campaign Prefix */}
                <div>
                  <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                    Campaign Name Prefix
                  </label>
                  <input
                    type="text"
                    required
                    value={splitNamePrefix}
                    onChange={(e) => setSplitNamePrefix(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:border-brand font-medium"
                    placeholder="e.g. Outreach - Batch"
                  />
                  <p className="text-[11px] text-foreground-subtle mt-1">
                    Split campaigns will be named: <code>{splitNamePrefix || campaignToSplit.name} - Part 1</code>, <code>Part 2</code>, etc.
                  </p>
                </div>

                {/* Recipient Source Filter */}
                <div>
                  <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                    Which recipients to split?
                  </label>
                  <select
                    value={splitRecipientFilter}
                    onChange={(e) => setSplitRecipientFilter(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:border-brand"
                  >
                    <option value="ALL">All Recipients ({campaignToSplit.totalRecipients})</option>
                    <option value="PENDING">Pending Only (Unsent contacts)</option>
                    <option value="FAILED">Failed Only (To retry in a new batch)</option>
                    <option value="SENT">Sent Only</option>
                  </select>
                </div>

                {/* Split Mode Options */}
                <div>
                  <label className="block text-xs font-semibold text-foreground-muted mb-2">
                    How to split recipients?
                  </label>
                  <div className="space-y-2">
                    {/* Mode 1: Batch Size */}
                    <label
                      onClick={() => setSplitMode('BATCH_SIZE')}
                      className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                        splitMode === 'BATCH_SIZE'
                          ? 'bg-brand/10 border-brand text-foreground shadow-sm'
                          : 'bg-surface-2 border-border text-foreground-muted hover:border-border/80'
                      }`}
                    >
                      <input
                        type="radio"
                        name="splitMode"
                        value="BATCH_SIZE"
                        checked={splitMode === 'BATCH_SIZE'}
                        onChange={() => setSplitMode('BATCH_SIZE')}
                        className="mt-0.5 text-brand focus:ring-brand"
                      />
                      <div className="text-xs flex-1">
                        <span className="font-bold text-foreground block">
                          By Batch Size (Contacts per campaign)
                        </span>
                        <span className="text-[11px] text-foreground-subtle block mt-0.5 leading-relaxed">
                          Divide into campaigns with a maximum number of recipients each.
                        </span>
                        {splitMode === 'BATCH_SIZE' && (
                          <div className="mt-2.5 flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">Batch size:</span>
                            <input
                              type="number"
                              min={1}
                              max={10000}
                              value={splitBatchSize}
                              onChange={(e) => setSplitBatchSize(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-24 px-2.5 py-1 rounded-lg bg-surface border border-border text-xs text-foreground font-mono focus:outline-none focus:border-brand"
                            />
                            <span className="text-[11px] text-foreground-subtle">
                              (creates ~{Math.ceil((campaignToSplit.totalRecipients || 1) / Math.max(1, splitBatchSize))} campaigns)
                            </span>
                          </div>
                        )}
                      </div>
                    </label>

                    {/* Mode 2: Equal Parts */}
                    <label
                      onClick={() => setSplitMode('NUM_PARTS')}
                      className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                        splitMode === 'NUM_PARTS'
                          ? 'bg-brand/10 border-brand text-foreground shadow-sm'
                          : 'bg-surface-2 border-border text-foreground-muted hover:border-border/80'
                      }`}
                    >
                      <input
                        type="radio"
                        name="splitMode"
                        value="NUM_PARTS"
                        checked={splitMode === 'NUM_PARTS'}
                        onChange={() => setSplitMode('NUM_PARTS')}
                        className="mt-0.5 text-brand focus:ring-brand"
                      />
                      <div className="text-xs flex-1">
                        <span className="font-bold text-foreground block">
                          Into Equal Parts (Equal batches)
                        </span>
                        <span className="text-[11px] text-foreground-subtle block mt-0.5 leading-relaxed">
                          Divide the recipient list evenly across N campaigns.
                        </span>
                        {splitMode === 'NUM_PARTS' && (
                          <div className="mt-2.5 flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">Number of parts:</span>
                            <input
                              type="number"
                              min={2}
                              max={50}
                              value={splitNumParts}
                              onChange={(e) => setSplitNumParts(Math.max(2, parseInt(e.target.value) || 2))}
                              className="w-20 px-2.5 py-1 rounded-lg bg-surface border border-border text-xs text-foreground font-mono focus:outline-none focus:border-brand"
                            />
                            <span className="text-[11px] text-foreground-subtle">
                              (~{Math.ceil((campaignToSplit.totalRecipients || 0) / Math.max(2, splitNumParts))} contacts each)
                            </span>
                          </div>
                        )}
                      </div>
                    </label>

                    {/* Mode 3: By Status */}
                    <label
                      onClick={() => setSplitMode('STATUS')}
                      className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                        splitMode === 'STATUS'
                          ? 'bg-brand/10 border-brand text-foreground shadow-sm'
                          : 'bg-surface-2 border-border text-foreground-muted hover:border-border/80'
                      }`}
                    >
                      <input
                        type="radio"
                        name="splitMode"
                        value="STATUS"
                        checked={splitMode === 'STATUS'}
                        onChange={() => setSplitMode('STATUS')}
                        className="mt-0.5 text-brand focus:ring-brand"
                      />
                      <div className="text-xs flex-1">
                        <span className="font-bold text-foreground block">
                          By Recipient Status (Pending vs Sent vs Failed)
                        </span>
                        <span className="text-[11px] text-foreground-subtle block mt-0.5 leading-relaxed">
                          Creates separate campaigns for each contact status so you can follow up or retry separately.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Additional Options */}
                <div className="p-3.5 rounded-2xl bg-surface-2/60 border border-border space-y-2.5 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={splitCopyEmail}
                      onChange={(e) => setSplitCopyEmail(e.target.checked)}
                      className="rounded border-border text-brand focus:ring-brand w-4 h-4"
                    />
                    <span className="text-foreground font-medium">
                      Copy email template (Subject, Body & Sender Account) to split campaigns
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={splitMoveRecipients}
                      onChange={(e) => setSplitMoveRecipients(e.target.checked)}
                      className="rounded border-border text-brand focus:ring-brand w-4 h-4"
                    />
                    <span className="text-foreground font-medium">
                      Move contacts (removes from original campaign)
                    </span>
                  </label>
                  <p className="text-[10px] text-foreground-subtle pl-6">
                    {splitMoveRecipients
                      ? '⚠️ Contacts will be removed from this campaign and transferred into the new split campaigns.'
                      : '✅ Non-destructive: Contacts are cloned as fresh Pending recipients in the new campaigns, leaving the original campaign intact.'}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 sm:p-4 px-5 border-t border-border flex items-center justify-end gap-2.5 shrink-0 bg-surface">
                <button
                  type="button"
                  onClick={() => setIsSplitModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-foreground-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSplit}
                  disabled={isSplitting || !splitNamePrefix.trim()}
                  className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-brand/20 transition-all"
                >
                  {isSplitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Split className="w-3.5 h-3.5" />
                  )}
                  <span>{isSplitting ? 'Splitting...' : 'Split Campaign'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Merge Campaigns Modal */}
        {isMergeModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden">
            <div className="bg-surface border border-brand/40 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between shrink-0 bg-surface">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Merge className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground">Merge Campaigns</h3>
                    <p className="text-xs text-foreground-subtle">
                      Combine recipients from multiple campaigns with automatic email deduplication
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMergeModalOpen(false)}
                  className="text-foreground-subtle hover:text-foreground text-sm p-1.5 rounded-xl hover:bg-surface-2 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
                {/* Select Campaigns to Merge */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-foreground-muted">
                      Select campaigns to merge (choose 2 or more)
                    </label>
                    <span className="text-[11px] text-foreground-subtle font-mono">
                      {selectedMergeSourceIds.length} selected
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 border border-border rounded-xl p-2 bg-surface-2/40">
                    {campaigns.map((camp) => {
                      const isSelected = selectedMergeSourceIds.includes(camp.id);
                      return (
                        <label
                          key={camp.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 cursor-pointer text-xs transition-all ${
                            isSelected
                              ? 'bg-purple-500/10 border-purple-500/40 text-foreground font-semibold'
                              : 'bg-surface border-border/80 text-foreground-muted hover:border-border'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleMergeSource(camp.id)}
                              className="rounded border-border text-purple-500 focus:ring-purple-400 w-4 h-4 shrink-0"
                            />
                            <span className="truncate">{camp.name}</span>
                          </div>
                          <span className="text-[11px] text-foreground-subtle shrink-0 font-mono">
                            {camp.totalRecipients} recipients
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Destination */}
                <div>
                  <label className="block text-xs font-semibold text-foreground-muted mb-2">
                    Merge Destination
                  </label>
                  <div className="space-y-2">
                    <label
                      onClick={() => setMergeTargetMode('NEW')}
                      className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                        mergeTargetMode === 'NEW'
                          ? 'bg-brand/10 border-brand text-foreground shadow-sm'
                          : 'bg-surface-2 border-border text-foreground-muted hover:border-border/80'
                      }`}
                    >
                      <input
                        type="radio"
                        name="mergeTargetMode"
                        value="NEW"
                        checked={mergeTargetMode === 'NEW'}
                        onChange={() => setMergeTargetMode('NEW')}
                        className="mt-0.5 text-brand focus:ring-brand"
                      />
                      <div className="text-xs flex-1">
                        <span className="font-bold text-foreground block">
                          Create a New Merged Campaign
                        </span>
                        {mergeTargetMode === 'NEW' && (
                          <div className="mt-2.5 space-y-2">
                            <input
                              type="text"
                              required
                              value={mergeNewName}
                              onChange={(e) => setMergeNewName(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:border-brand font-medium"
                              placeholder="New campaign name"
                            />
                            <div>
                              <span className="text-[11px] text-foreground-subtle block mb-1">
                                Template to use for Subject & Body:
                              </span>
                              <select
                                value={mergeTemplateId}
                                onChange={(e) => setMergeTemplateId(e.target.value)}
                                className="w-full px-3 py-1.5 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:border-brand"
                              >
                                {campaigns
                                  .filter((c) => selectedMergeSourceIds.includes(c.id))
                                  .map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name} (Subject: {c.subject ? `"${c.subject.slice(0, 30)}..."` : 'None'})
                                    </option>
                                  ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </label>

                    <label
                      onClick={() => setMergeTargetMode('EXISTING')}
                      className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                        mergeTargetMode === 'EXISTING'
                          ? 'bg-brand/10 border-brand text-foreground shadow-sm'
                          : 'bg-surface-2 border-border text-foreground-muted hover:border-border/80'
                      }`}
                    >
                      <input
                        type="radio"
                        name="mergeTargetMode"
                        value="EXISTING"
                        checked={mergeTargetMode === 'EXISTING'}
                        onChange={() => setMergeTargetMode('EXISTING')}
                        className="mt-0.5 text-brand focus:ring-brand"
                      />
                      <div className="text-xs flex-1">
                        <span className="font-bold text-foreground block">
                          Merge into an Existing Campaign
                        </span>
                        {mergeTargetMode === 'EXISTING' && (
                          <div className="mt-2.5">
                            <select
                              value={mergeTargetId}
                              onChange={(e) => setMergeTargetId(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:border-brand"
                            >
                              {campaigns
                                .filter((c) => selectedMergeSourceIds.includes(c.id))
                                .map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name} ({c.totalRecipients} recipients currently)
                                  </option>
                                ))}
                            </select>
                            <span className="text-[10px] text-foreground-subtle block mt-1">
                              Recipients from the other selected campaigns will be appended into this campaign.
                            </span>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>

                {/* Recipient Filter & Deduplication Options */}
                <div className="p-3.5 rounded-2xl bg-surface-2/60 border border-border space-y-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground-muted mb-1">
                      Filter which recipients to include:
                    </label>
                    <select
                      value={mergeStatusFilter}
                      onChange={(e) => setMergeStatusFilter(e.target.value as any)}
                      className="w-full px-3 py-1.5 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:border-brand"
                    >
                      <option value="ALL">All Recipients (Recommended)</option>
                      <option value="PENDING">Pending Only</option>
                      <option value="FAILED">Failed Only</option>
                      <option value="SENT">Sent Only</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={mergeResetStatus}
                      onChange={(e) => setMergeResetStatus(e.target.checked)}
                      className="rounded border-border text-brand focus:ring-brand w-4 h-4"
                    />
                    <span className="text-foreground font-medium">
                      Reset all merged recipients to PENDING (ready to send)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mergeDeleteSources}
                      onChange={(e) => setMergeDeleteSources(e.target.checked)}
                      className="rounded border-border text-red-500 focus:ring-red-400 w-4 h-4"
                    />
                    <span className="text-foreground font-medium text-red-300">
                      Delete original source campaigns after merge
                    </span>
                  </label>

                  <div className="p-2 rounded-xl bg-surface border border-border/80 text-[11px] text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Automatic deduplication enabled: Duplicate emails across merged campaigns are automatically unified.</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 sm:p-4 px-5 border-t border-border flex items-center justify-end gap-2.5 shrink-0 bg-surface">
                <button
                  type="button"
                  onClick={() => setIsMergeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-foreground-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMerge}
                  disabled={isMerging || selectedMergeSourceIds.length < 2 || (mergeTargetMode === 'NEW' && !mergeNewName.trim())}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-purple-600/20 transition-all"
                >
                  {isMerging ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Merge className="w-3.5 h-3.5" />
                  )}
                  <span>{isMerging ? 'Merging...' : `Merge (${selectedMergeSourceIds.length}) Campaigns`}</span>
                </button>
              </div>
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
                    {countPending > 0 && (
                      <button
                        type="button"
                        onClick={handleSendPendingFromModal}
                        disabled={isSending === activeCampaign.id}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-brand/20 text-brand hover:bg-brand/30 border border-brand/30 transition-all shrink-0 disabled:opacity-50"
                        title="Send only recipients currently marked pending"
                      >
                        <Send className="w-3 h-3" />
                        <span>{isSending === activeCampaign.id ? 'Sending...' : 'Send Pending'}</span>
                      </button>
                    )}
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

                    {countSent > 0 && (
                      <button
                        type="button"
                        onClick={() => handleResendAll(activeCampaign)}
                        disabled={isResendingAll === activeCampaign.id}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30 transition-all shrink-0 disabled:opacity-50"
                        title="Resend this campaign to every recipient"
                      >
                        <RefreshCw className={`w-3 h-3 ${isResendingAll === activeCampaign.id ? 'animate-spin' : ''}`} />
                        <span>{isResendingAll === activeCampaign.id ? 'Resending...' : 'Resend All'}</span>
                      </button>
                    )}

                    {recipients.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsRecipientsOpen(false);
                          handleOpenSplit(activeCampaign);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30 transition-all shrink-0"
                        title="Split this campaign into multiple batches or by status"
                      >
                        <Split className="w-3 h-3" />
                        <span>Split Campaign</span>
                      </button>
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
                            <td className="p-3">{r.name || '-'}</td>
                            <td className="p-3">{r.company || '-'}</td>
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
                               <button
                                 type="button"
                                 onClick={() => handleRemoveRecipient(r)}
                                 disabled={isRemovingRecipient === r.id}
                                 className="p-1.5 rounded-lg text-foreground-subtle hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all disabled:opacity-50"
                                 title="Remove recipient from campaign"
                               >
                                 <Trash2 className={`w-3.5 h-3.5 ${isRemovingRecipient === r.id ? 'animate-pulse' : ''}`} />
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
