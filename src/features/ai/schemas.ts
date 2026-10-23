import { z } from 'zod';
import { boundedText } from '@/features/shared/schemas';

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
