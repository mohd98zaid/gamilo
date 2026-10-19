import { describe, it, expect } from 'vitest';
import { generateApiKey, hashApiKey, isValidApiKeyFormat } from '@/lib/api-keys';

describe('API Key Management (8-Security.md Section 2.2)', () => {
  it('generates API keys with gml_live_ prefix and valid SHA-256 hash', () => {
    const keyRecord = generateApiKey();

    expect(keyRecord.key.startsWith('gml_live_')).toBe(true);
    expect(keyRecord.keyPrefix.startsWith('gml_live_')).toBe(true);
    expect(keyRecord.keyHash.length).toBe(64); // SHA-256 hex length
    expect(isValidApiKeyFormat(keyRecord.key)).toBe(true);
  });

  it('produces deterministic hashes for the same API key', () => {
    const testKey = 'gml_live_custom_deterministic_key_12345';
    const hash1 = hashApiKey(testKey);
    const hash2 = hashApiKey(testKey);

    expect(hash1).toEqual(hash2);
  });

  it('validates API key format strictly', () => {
    expect(isValidApiKeyFormat('gml_live_123456789012345678901234567890')).toBe(true);
    expect(isValidApiKeyFormat('invalid_key_prefix')).toBe(false);
    expect(isValidApiKeyFormat('gml_test_short')).toBe(false);
  });
});
