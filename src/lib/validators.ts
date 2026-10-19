import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  workspaceName: z.string().min(2, 'Workspace name must be at least 2 characters').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createPostSchema = z.object({
  caption: z.string().min(1, 'Caption cannot be empty').max(2200, 'Caption too long'),
  channelIds: z.array(z.string()).min(1, 'Select at least one channel'),
  mediaUrls: z.array(z.string().url()).optional().default([]),
  scheduledAt: z.string().datetime().optional().nullable(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED']).default('DRAFT'),
});

export const updatePostSchema = createPostSchema.partial();

export const sendReplySchema = z.object({
  threadId: z.string().min(1, 'Thread ID is required'),
  content: z.string().min(1, 'Reply message cannot be empty'),
});

export const aiGenerateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  type: z.enum(['caption', 'inbox_reply', 'email_subject', 'outreach', 'hashtags']),
  platform: z.enum(['instagram', 'facebook', 'tiktok', 'youtube', 'whatsapp', 'email']).default('instagram'),
  brandContext: z.object({
    businessName: z.string().optional(),
    industry: z.string().optional(),
    tone: z.string().optional(),
    description: z.string().optional(),
    brandKnowledge: z.string().optional(),
  }).optional(),
  conversationHistory: z.array(z.object({
    sender: z.string(),
    content: z.string(),
    direction: z.enum(['INBOUND', 'OUTBOUND']),
  })).optional(),
});

export const createApiKeySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  scopes: z.array(z.string()).default(['social:read', 'social:write']),
});
