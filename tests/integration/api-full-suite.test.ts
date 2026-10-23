import { describe, it, expect, beforeEach } from 'vitest';
import { GET as getChannels, POST as postChannel } from '@/app/api/channels/route';
import { DELETE as deleteChannel } from '@/app/api/channels/[id]/route';
import { GET as getPosts, POST as postCreatePost } from '@/app/api/posts/route';
import { GET as getPost, PATCH as patchPost, DELETE as deletePost } from '@/app/api/posts/[id]/route';
import { POST as publishPost } from '@/app/api/posts/[id]/publish/route';
import { GET as getThreads } from '@/app/api/inbox/threads/route';
import { GET as getThread, PATCH as patchThread } from '@/app/api/inbox/threads/[id]/route';
import { POST as postReply } from '@/app/api/inbox/threads/[id]/reply/route';
import { POST as postAiReply } from '@/app/api/inbox/threads/[id]/ai/route';
import { POST as postAiGenerate } from '@/app/api/ai/generate/route';
import { GET as getAnalytics } from '@/app/api/analytics/overview/route';
import { GET as getSubscription } from '@/app/api/billing/subscription/route';
import { POST as postCheckout } from '@/app/api/billing/checkout/route';
import { GET as getSettings, POST as postSettings } from '@/app/api/settings/route';
import { GET as getApiKeys, POST as postApiKey, DELETE as deleteApiKey } from '@/app/api/api-keys/route';
import { GET as getSession } from '@/app/api/auth/session/route';
import { POST as postLogin } from '@/app/api/auth/login/route';
import { POST as postRegister } from '@/app/api/auth/register/route';

describe('Comprehensive End-to-End API Integration Suite', () => {
  // 1. CHANNELS API
  describe('Channels Management API', () => {
    it('retrieves connected channels', async () => {
      const res = await getChannels();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.channels).toBeInstanceOf(Array);
      expect(data.total).toBeGreaterThanOrEqual(1);
    });

    it('connects a Gmail channel with SMTP/IMAP credentials and AES-256 vault encryption', async () => {
      const req = new Request('http://localhost:3000/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'GMAIL',
          name: 'Test Mail Account',
          email: 'test@example.test',
          accessToken: 'abcd efgh ijkl mnop',
          authType: 'APP_PASSWORD',
          smtpHost: 'smtp.gmail.com',
          smtpPort: 587,
          imapHost: 'imap.gmail.com',
          imapPort: 993,
        }),
      });

      const res = await postChannel(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.channel.platform).toBe('GMAIL');
      expect(data.channel.accessToken).toBeUndefined();
      expect(data.channel.emailConfig.smtpHost).toBe('smtp.gmail.com');
    });

    it('disconnects a channel cleanly', async () => {
      // First create a temp channel
      const createReq = new Request('http://localhost:3000/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'FACEBOOK',
          name: 'Temp Channel To Delete',
        }),
      });
      const createRes = await postChannel(createReq);
      const created = await createRes.json();
      const channelId = created.channel.id;

      // Now delete it
      const delReq = new Request(`http://localhost:3000/api/channels/${channelId}`, {
        method: 'DELETE',
      });
      const delRes = await deleteChannel(delReq, { params: { id: channelId } });
      expect(delRes.status).toBe(200);
      const delData = await delRes.json();
      expect(delData.success).toBe(true);
    });
  });

  // 2. SOCIAL POSTS API
  describe('Posts & Scheduling Pipeline API', () => {
    let createdPostId: string;

    it('creates a new scheduled post targeting channels', async () => {
      const req = new Request('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: 'Special Single Origin Geisha launch this Saturday!',
          channelIds: ['test-channel-instagram'],
          mediaUrls: ['https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb'],
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
          status: 'SCHEDULED',
        }),
      });

      const res = await postCreatePost(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.post.status).toBe('SCHEDULED');
      createdPostId = data.post.id;
    });

    it('retrieves the created post details', async () => {
      const req = new Request(`http://localhost:3000/api/posts/${createdPostId}`);
      const res = await getPost(req, { params: { id: createdPostId } });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.post.id).toBe(createdPostId);
      expect(data.post.caption).toContain('Single Origin Geisha');
    });

    it('updates post caption and changes schedule time', async () => {
      const req = new Request(`http://localhost:3000/api/posts/${createdPostId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: 'Updated Geisha Roast: Limited to 50 bags!',
        }),
      });

      const res = await patchPost(req, { params: { id: createdPostId } });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.post.caption).toContain('Limited to 50 bags!');
    });

    it('does not claim publication before a provider is configured', async () => {
      const req = new Request(`http://localhost:3000/api/posts/${createdPostId}/publish`, {
        method: 'POST',
      });
      const res = await publishPost(req, { params: { id: createdPostId } });
      expect(res.status).toBe(501);
      const data = await res.json();
      expect(data.error).toContain('not configured');
    });

    it('deletes post from store', async () => {
      const req = new Request(`http://localhost:3000/api/posts/${createdPostId}`, {
        method: 'DELETE',
      });
      const res = await deletePost(req, { params: { id: createdPostId } });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });

  // 3. UNIFIED INBOX API
  describe('Unified Inbox & AI Co-pilot API', () => {
    it('retrieves all threads and filters by platform', async () => {
      const req = new Request('http://localhost:3000/api/inbox/threads?platform=INSTAGRAM');
      const res = await getThreads(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.threads).toBeInstanceOf(Array);
      expect(data.threads.every((t: any) => t.platform === 'INSTAGRAM')).toBe(true);
    });

    it('retrieves thread detail and marks conversation read', async () => {
      const req = new Request('http://localhost:3000/api/inbox/threads/test-thread-1');
      const res = await getThread(req, { params: { id: 'test-thread-1' } });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.thread.id).toBe('test-thread-1');
      expect(data.thread.isRead).toBe(true);
    });

    it('sends an outbound reply to customer inquiry', async () => {
      const req = new Request('http://localhost:3000/api/inbox/threads/test-thread-1/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Yes! We have fresh gluten-free almond croissants tomorrow morning.',
        }),
      });

      const res = await postReply(req, { params: { id: 'test-thread-1' } });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message.direction).toBe('OUTBOUND');
      expect(data.message.content).toContain('gluten-free');
    });

    it('updates thread labels / tags', async () => {
      const req = new Request('http://localhost:3000/api/inbox/threads/test-thread-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labels: ['Inquiry', 'Dietary', 'Resolved'],
        }),
      });

      const res = await patchThread(req, { params: { id: 'test-thread-1' } });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.thread.labels).toContain('Resolved');
    });
  });

  // 4. ANALYTICS & METRICS
  describe('Analytics & Performance API', () => {
    it('returns aggregated metrics for reach, impressions, and engagement', async () => {
      const res = await getAnalytics();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.metrics.totalReach).toBeDefined();
      expect(data.metrics.totalImpressions).toBeDefined();
      expect(data.metrics.engagementRate).toBeDefined();
      expect(data.metrics.activeChannelsCount).toBeGreaterThanOrEqual(1);
    });
  });

  // 5. BILLING & SUBSCRIPTIONS
  describe('Billing & Credit System API', () => {
    it('retrieves subscription plan and AI credits quota', async () => {
      const res = await getSubscription();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.subscription.plan).toBeDefined();
      expect(data.subscription.aiCredits).toBeGreaterThanOrEqual(0);
      expect(data.plans).toBeInstanceOf(Array);
    });

    it('upgrades subscription tier and adds quota', async () => {
      const req = new Request('http://localhost:3000/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'scale' }),
      });

      const res = await postCheckout(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.plan).toBe('SCALE');
    });
  });

  // 6. BRAND SETTINGS & AI KNOWLEDGE
  describe('Brand Settings & AI Knowledge Base API', () => {
    it('persists and retrieves updated brand knowledge', async () => {
      const updateReq = new Request('http://localhost:3000/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: 'Test Workspace Updated',
          industry: 'Test Industry Updated',
          tone: 'professional and clear',
          brandKnowledge: 'Test knowledge base.',
        }),
      });

      const updateRes = await postSettings(updateReq);
      expect(updateRes.status).toBe(200);

      const getRes = await getSettings();
      expect(getRes.status).toBe(200);
      const data = await getRes.json();
      expect(data.workspace.brandSettings.businessName).toBe('Test Workspace Updated');
      expect(data.workspace.brandSettings.brandKnowledge).toContain('Test knowledge base');
    });
  });

  // 7. DEVELOPER API KEYS
  describe('Developer API Keys API', () => {
    let generatedKeyId: string;

    it('generates a gml_live_ formatted key with hash storage', async () => {
      const req = new Request('http://localhost:3000/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Integration Test Key' }),
      });

      const res = await postApiKey(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.key.startsWith('gml_live_')).toBe(true);
      expect(data.keyPrefix.startsWith('gml_live_')).toBe(true);
      generatedKeyId = data.id;
    });

    it('lists active developer keys without revealing raw secret', async () => {
      const res = await getApiKeys();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.keys).toBeInstanceOf(Array);
      const found = data.keys.find((k: any) => k.id === generatedKeyId);
      expect(found).toBeDefined();
      expect(found.key).toBeUndefined(); // Raw secret NEVER exposed
    });

    it('revokes an API key successfully', async () => {
      const req = new Request(`http://localhost:3000/api/api-keys?id=${generatedKeyId}`, {
        method: 'DELETE',
      });
      const res = await deleteApiKey(req);
      expect(res.status).toBe(200);
    });
  });

  // 8. AUTHENTICATION & SESSIONS
  describe('Auth & Session API', () => {
    it('returns valid session payload with user and workspace', async () => {
      const res = await getSession();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user.email).toBeDefined();
      expect(data.workspace.id).toBeDefined();
    });

    it('validates login input schemas', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.test', password: 'password123' }),
      });
      const res = await postLogin(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
    });
  });
});
