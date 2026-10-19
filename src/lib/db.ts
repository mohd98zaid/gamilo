/**
 * Database & In-Memory Store
 * Provides data persistence and pre-seeded sample data matching 2-MVP-Tech-Doc.md
 * ensuring full functionality in local development and live demonstrations.
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

class InMemoryDataStore {
  public workspace: WorkspaceEntity = {
    id: 'ws_demo_1',
    name: 'Brew Haven Coffee',
    slug: 'brew-haven',
    aiCredits: 95,
    trialEndsAt: new Date(Date.now() + 25 * 86400000).toISOString(),
    plan: 'TRIAL',
    brandSettings: {
      businessName: 'Brew Haven Coffee',
      industry: 'Specialty Coffee & Bakery',
      tone: 'warm, welcoming, and community-focused',
      description: 'Artisanal single-origin coffee and freshly baked sourdough pastries.',
      brandKnowledge:
        'Hours: Mon-Sat 7am-6pm, Sun 8am-4pm. We offer oat and almond milk at no extra charge. Located at 142 Artisan Way. All bakery items are baked daily on-site. WiFi password is brewhavenvibes.',
    },
  };

  public channels: ChannelEntity[] = [
    {
      id: 'ch_ig_1',
      workspaceId: 'ws_demo_1',
      platform: 'INSTAGRAM',
      platformId: 'ig_17841401234567890',
      name: '@brewhaven.coffee',
      avatarUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=150',
      isActive: true,
      connectedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    {
      id: 'ch_fb_1',
      workspaceId: 'ws_demo_1',
      platform: 'FACEBOOK',
      platformId: 'fb_page_987654321',
      name: 'Brew Haven Coffeehouse',
      avatarUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=150',
      isActive: true,
      connectedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
  ];

  public posts: PostEntity[] = [
    {
      id: 'post_1',
      workspaceId: 'ws_demo_1',
      caption: 'Fresh batch of Ethiopian Yirgacheffe roasted this morning! ☕ Notes of jasmine, bergamot, and sweet peach. Swing by before 2pm for a free tasting cup! #SpecialtyCoffee #CoffeeRoasters #BrewHaven',
      mediaUrls: ['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800'],
      status: 'PUBLISHED',
      publishedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
      channelIds: ['ch_ig_1', 'ch_fb_1'],
      metrics: {
        impressions: 1420,
        reach: 1180,
        likes: 184,
        comments: 29,
        shares: 12,
      },
      createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    },
    {
      id: 'post_2',
      workspaceId: 'ws_demo_1',
      caption: 'Weekend pastry preview: Cinnamon cardamom brioche knots fresh from the oven tomorrow at 8 AM. Save this post for your Saturday breakfast plan! 🥐✨ #PastryChef #WeekendVibes #LocalBakery',
      mediaUrls: ['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800'],
      status: 'SCHEDULED',
      scheduledAt: new Date(Date.now() + 18 * 3600000).toISOString(),
      channelIds: ['ch_ig_1'],
      createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    },
    {
      id: 'post_3',
      workspaceId: 'ws_demo_1',
      caption: 'Announcing our new evening coffee tasting flights! 3 micro-lots from Colombia, Kenya, and Guatemala. Which origin is your favorite?',
      mediaUrls: [],
      status: 'DRAFT',
      channelIds: ['ch_ig_1', 'ch_fb_1'],
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
  ];

  public threads: ThreadEntity[] = [
    {
      id: 'th_1',
      workspaceId: 'ws_demo_1',
      platform: 'INSTAGRAM',
      platformThreadId: 'ig_th_101',
      contactName: 'sarah_adventures',
      contactAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
      lastMessageAt: new Date(Date.now() - 15 * 60000).toISOString(),
      isRead: false,
      labels: ['Inquiry', 'Dietary'],
      messages: [
        {
          id: 'msg_1',
          threadId: 'th_1',
          direction: 'INBOUND',
          senderName: 'sarah_adventures',
          content: 'Hi! Do you have any gluten-free pastries available tomorrow morning? Also do you charge extra for oat milk?',
          sentAt: new Date(Date.now() - 15 * 60000).toISOString(),
        },
      ],
    },
    {
      id: 'th_2',
      workspaceId: 'ws_demo_1',
      platform: 'FACEBOOK',
      platformThreadId: 'fb_th_202',
      contactName: 'David Miller',
      contactAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
      lastMessageAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      isRead: true,
      labels: ['Catering', 'VIP'],
      messages: [
        {
          id: 'msg_2',
          threadId: 'th_2',
          direction: 'INBOUND',
          senderName: 'David Miller',
          content: 'Hello, looking to host a team coffee workshop for 12 people next Thursday evening. Is your space available?',
          sentAt: new Date(Date.now() - 4 * 3600000).toISOString(),
        },
        {
          id: 'msg_3',
          threadId: 'th_2',
          direction: 'OUTBOUND',
          senderName: 'Brew Haven Coffeehouse',
          content: "Hi David! Yes, our cupping room is available on Thursday after 6 PM. We'd love to host your team!",
          sentAt: new Date(Date.now() - 2 * 3600000).toISOString(),
        },
      ],
    },
    {
      id: 'th_3',
      workspaceId: 'ws_demo_1',
      platform: 'INSTAGRAM',
      platformThreadId: 'ig_th_303',
      contactName: 'marcus.coffee',
      contactAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100',
      lastMessageAt: new Date(Date.now() - 6 * 3600000).toISOString(),
      isRead: true,
      labels: ['Compliment'],
      messages: [
        {
          id: 'msg_4',
          threadId: 'th_3',
          direction: 'INBOUND',
          senderName: 'marcus.coffee',
          content: 'The pour-over I had this morning was incredible! Best cup in the city hands down 🙌',
          sentAt: new Date(Date.now() - 6 * 3600000).toISOString(),
        },
      ],
    },
  ];
}

// Global singleton instance
export const store = new InMemoryDataStore();
