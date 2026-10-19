import crypto from 'crypto';

/**
 * API Key Management Module
 * Conforms to Security specification (8-Security.md Section 2.2).
 * Format: gml_live_{base64url_32_bytes}
 * Storage: SHA-256 hash in DB, prefix (first 16 chars) for display
 */

export interface GeneratedApiKey {
  key: string;       // plaintext shown once to user
  keyHash: string;   // SHA-256 hash stored in DB
  keyPrefix: string; // "gml_live_XXXXXXXX" for display
}

export function generateApiKey(): GeneratedApiKey {
  const raw = crypto.randomBytes(32).toString('base64url');
  const key = `gml_live_${raw}`;
  const keyHash = hashApiKey(key);
  const keyPrefix = key.slice(0, 16);
  return { key, keyHash, keyPrefix };
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key.trim()).digest('hex');
}

export function isValidApiKeyFormat(key: string): boolean {
  return typeof key === 'string' && key.startsWith('gml_live_') && key.length >= 32;
}
