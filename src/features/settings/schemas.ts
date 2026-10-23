import { z } from 'zod';

export const settingsSchema = z.object({
  businessName: z.string().trim().min(2).max(120).optional(),
  industry: z.string().trim().max(120).optional(),
  tone: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2_000).optional().nullable(),
  brandKnowledge: z.string().trim().max(10_000).optional().nullable(),
}).strict();
