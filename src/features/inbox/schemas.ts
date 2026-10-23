import { z } from 'zod';
import { boundedText } from '@/features/shared/schemas';

export const sendReplySchema = z.object({
  threadId: z.string().trim().min(1, 'Thread ID is required').max(100),
  content: boundedText(10_000).min(1, 'Reply message cannot be empty'),
}).strict();
