import { z } from 'zod';

const boundedText = (max: number) => z.string().trim().min(1).max(max);

export const registerSchema = z.object({
  name: boundedText(120).min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Invalid email address').max(254),
  password: z.string().min(12, 'Password must be at least 12 characters').max(128),
  workspaceName: boundedText(120).min(2, 'Workspace name must be at least 2 characters').optional(),
}).strict();

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(254),
  password: z.string().min(1, 'Password is required').max(128),
}).strict();

export const createPostSchema = z.object({
  caption: boundedText(2200).min(1, 'Caption cannot be empty'),
  channelIds: z.array(z.string().trim().min(1).max(100)).min(1, 'Select at least one channel').max(20),
  mediaUrls: z.array(z.string().url()).max(20).optional().default([]),
  scheduledAt: z.string().datetime().optional().nullable(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED']).default('DRAFT'),
}).strict();

export const sendReplySchema = z.object({
  threadId: z.string().trim().min(1, 'Thread ID is required').max(100),
  content: boundedText(10_000).min(1, 'Reply message cannot be empty'),
}).strict();

export const aiGenerateSchema = z.object({
  prompt: boundedText(8_000).min(1, 'Prompt is required'),
  type: z.enum(['caption', 'inbox_reply', 'email_subject', 'outreach', 'hashtags']),
  platform: z.enum(['instagram', 'facebook', 'tiktok', 'youtube', 'whatsapp', 'email']).default('instagram'),
  brandContext: z.object({
    businessName: z.string().trim().max(120).optional(),
    industry: z.string().trim().max(120).optional(),
    tone: z.string().trim().max(120).optional(),
    description: z.string().trim().max(2_000).optional(),
    brandKnowledge: z.string().trim().max(10_000).optional(),
  }).strict().optional(),
  conversationHistory: z.array(z.object({
    sender: z.string().trim().max(120),
    content: z.string().trim().max(8_000),
    direction: z.enum(['INBOUND', 'OUTBOUND']),
  }).strict()).max(50).optional(),
}).strict();

export const createApiKeySchema = z.object({
  name: boundedText(120).min(2, 'Name must be at least 2 characters'),
  scopes: z.array(z.enum(['social:read', 'social:write', 'inbox:read', 'inbox:write', 'analytics:read'])).max(10).default(['social:read', 'social:write']),
}).strict();

export const updatePostSchema = createPostSchema.partial().strict();

export const settingsSchema = z.object({
  businessName: z.string().trim().min(2).max(120).optional(),
  industry: z.string().trim().max(120).optional(),
  tone: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2_000).optional().nullable(),
  brandKnowledge: z.string().trim().max(10_000).optional().nullable(),
}).strict();

export const channelSchema = z.object({
  platform: z.enum(['INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'YOUTUBE', 'WHATSAPP', 'GMAIL', 'EMAIL']),
  name: z.string().trim().min(2).max(160).optional(),
  platformId: z.string().trim().max(200).optional(),
  email: z.string().trim().email().max(254).optional(),
  accessToken: z.string().min(1).max(10_000).optional(),
  avatarUrl: z.string().url().optional(),
  smtpHost: z.string().trim().max(255).optional(),
  smtpPort: z.coerce.number().int().min(1).max(65_535).optional(),
  imapHost: z.string().trim().max(255).optional(),
  imapPort: z.coerce.number().int().min(1).max(65_535).optional(),
  authType: z.enum(['APP_PASSWORD', 'OAUTH', 'CUSTOM_SMTP']).optional(),
}).strict();
