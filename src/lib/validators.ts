/**
 * Compatibility barrel for request schemas.
 * Feature-owned schemas live under feature-specific schemas modules.
 */
export { aiGenerateSchema } from '@/features/ai/schemas';
export { createApiKeySchema } from '@/features/api-keys/schemas';
export { channelSchema } from '@/features/channels/schemas';
export { registerSchema, loginSchema } from '@/features/auth/schemas';
export { sendReplySchema } from '@/features/inbox/schemas';
export { createPostSchema, updatePostSchema } from '@/features/posts/schemas';
export { settingsSchema } from '@/features/settings/schemas';
