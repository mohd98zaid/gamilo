import { z } from 'zod';
import { boundedText } from '@/features/shared/schemas';

export const createApiKeySchema = z.object({
  name: boundedText(120).min(2, 'Name must be at least 2 characters'),
  scopes: z.array(z.enum(['social:read', 'social:write', 'inbox:read', 'inbox:write', 'analytics:read'])).max(10).default(['social:read', 'social:write']),
}).strict();
