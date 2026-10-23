import { z } from 'zod';

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
