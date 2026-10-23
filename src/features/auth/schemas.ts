import { z } from 'zod';
import { boundedText } from '@/features/shared/schemas';

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
