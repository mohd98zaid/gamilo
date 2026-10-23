/**
 * Test-only in-memory fallback.
 *
 * Production requests use Prisma repositories. These neutral fixtures are
 * enabled only when NODE_ENV=test so customer/demo data cannot appear in a
 * production bundle or a real workspace.
 */

export interface UserEntity {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface ChannelEntity {
  id: string;
  workspaceId: string;
  platform: 'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK' | 'YOUTUBE' | 'WHATSAPP' | 'GMAIL';
  platformId: string;
  name: string;
  avatarUrl?: string;
  isActive: boolean;
  connectedAt: string;
}

export interface PostEntity {
  id: string;
  workspaceId: string;
  caption: string;
  mediaUrls: string[];
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';
  scheduledAt?: string;
  publishedAt?: string;
  channelIds: string[];
  metrics?: {
    impressions: number;
    reach: number;
    likes: number;
    comments: number;
    shares: number;
  };
  createdAt: string;
}

export interface MessageEntity {
  id: string;
  threadId: string;
  direction: 'INBOUND' | 'OUTBOUND';
  senderName: string;
  content: string;
  sentAt: string;
}

export interface ThreadEntity {
  id: string;
  workspaceId: string;
  platform: 'INSTAGRAM' | 'FACEBOOK' | 'GMAIL' | 'WHATSAPP';
  platformThreadId: string;
  contactName: string;
  contactAvatar?: string;
  lastMessageAt: string;
  isRead: boolean;
  labels: string[];
  messages: MessageEntity[];
}

export interface WorkspaceEntity {
  id: string;
  name: string;
  slug: string;
  aiCredits: number;
  trialEndsAt: string;
  plan: 'TRIAL' | 'STARTER' | 'SCALE';
  brandSettings: {
    businessName: string;
    industry: string;
    tone: string;
    description: string;
    brandKnowledge: string;
  };
}

const isTestFixtureEnvironment = process.env.NODE_ENV === 'test';
const now = Date.now();
const testWorkspaceId = 'test-workspace';
const testInstagramChannelId = 'test-channel-instagram';
const testFacebookChannelId = 'test-channel-facebook';

class InMemoryDataStore {
  public workspace: WorkspaceEntity = {
    id: isTestFixtureEnvironment ? testWorkspaceId : '',
    name: isTestFixtureEnvironment ? 'Test Workspace' : '',
    slug: isTestFixtureEnvironment ? 'test-workspace' : '',
    aiCredits: isTestFixtureEnvironment ? 10 : 0,
    trialEndsAt: isTestFixtureEnvironment ? new Date(now + 30 * 86400000).toISOString() : new Date(0).toISOString(),
    plan: 'TRIAL',
    brandSettings: {
      businessName: isTestFixtureEnvironment ? 'Test Workspace' : '',
      industry: isTestFixtureEnvironment ? 'Test Industry' : '',
      tone: isTestFixtureEnvironment ? 'professional' : '',
      description: '',
      brandKnowledge: '',
    },
  };

  public channels: ChannelEntity[] = isTestFixtureEnvironment
    ? [
        {
          id: testInstagramChannelId,
          workspaceId: testWorkspaceId,
          platform: 'INSTAGRAM',
          platformId: 'test-instagram-account',
          name: 'Test Instagram Channel',
          isActive: true,
          connectedAt: new Date(now - 86400000).toISOString(),
        },
        {
          id: testFacebookChannelId,
          workspaceId: testWorkspaceId,
          platform: 'FACEBOOK',
          platformId: 'test-facebook-page',
          name: 'Test Facebook Channel',
          isActive: true,
          connectedAt: new Date(now - 86400000).toISOString(),
        },
      ]
    : [];

  public posts: PostEntity[] = isTestFixtureEnvironment
    ? [
        {
          id: 'test-post-published',
          workspaceId: testWorkspaceId,
          caption: 'Test published post',
          mediaUrls: [],
          status: 'PUBLISHED',
          publishedAt: new Date(now - 86400000).toISOString(),
          channelIds: [testInstagramChannelId, testFacebookChannelId],
          metrics: { impressions: 10, reach: 8, likes: 2, comments: 1, shares: 0 },
          createdAt: new Date(now - 2 * 86400000).toISOString(),
        },
        {
          id: 'test-post-scheduled',
          workspaceId: testWorkspaceId,
          caption: 'Test scheduled post',
          mediaUrls: [],
          status: 'SCHEDULED',
          scheduledAt: new Date(now + 86400000).toISOString(),
          channelIds: [testInstagramChannelId],
          createdAt: new Date(now - 3600000).toISOString(),
        },
        {
          id: 'test-post-draft',
          workspaceId: testWorkspaceId,
          caption: 'Test draft post',
          mediaUrls: [],
          status: 'DRAFT',
          channelIds: [testInstagramChannelId],
          createdAt: new Date(now - 1800000).toISOString(),
        },
      ]
    : [];

  public threads: ThreadEntity[] = isTestFixtureEnvironment
    ? [
        {
          id: 'test-thread-1',
          workspaceId: testWorkspaceId,
          platform: 'INSTAGRAM',
          platformThreadId: 'test-platform-thread-1',
          contactName: 'Test Contact One',
          lastMessageAt: new Date(now - 900000).toISOString(),
          isRead: false,
          labels: ['Test'],
          messages: [{
            id: 'test-message-1',
            threadId: 'test-thread-1',
            direction: 'INBOUND',
            senderName: 'Test Contact One',
            content: 'Test inbound message',
            sentAt: new Date(now - 900000).toISOString(),
          }],
        },
        {
          id: 'test-thread-2',
          workspaceId: testWorkspaceId,
          platform: 'FACEBOOK',
          platformThreadId: 'test-platform-thread-2',
          contactName: 'Test Contact Two',
          lastMessageAt: new Date(now - 3600000).toISOString(),
          isRead: true,
          labels: ['Test'],
          messages: [{
            id: 'test-message-2',
            threadId: 'test-thread-2',
            direction: 'INBOUND',
            senderName: 'Test Contact Two',
            content: 'Another test inbound message',
            sentAt: new Date(now - 3600000).toISOString(),
          }],
        },
      ]
    : [];
}

export const store = new InMemoryDataStore();
