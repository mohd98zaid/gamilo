import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, encryptToString, decryptFromString } from '@/lib/encryption';

describe('AES-256-GCM Token Encryption Vault (8-Security.md)', () => {
  it('encrypts and successfully decrypts a plaintext secret', () => {
    const secret = 'EAABsbCS1iHgBA...meta_oauth_access_token';
    const encrypted = encrypt(secret);

    expect(encrypted.encrypted).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.tag).toBeDefined();
    expect(encrypted.encrypted).not.toEqual(secret);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toEqual(secret);
  });

  it('supports compact single-column string format enc:v1:<iv>:<tag>:<encrypted>', () => {
    const rawToken = 'ghp_secretTokenExample123456';
    const serialized = encryptToString(rawToken);

    expect(serialized.startsWith('enc:v1:')).toBe(true);

    const restored = decryptFromString(serialized);
    expect(restored).toEqual(rawToken);
  });

  it('fails safely when decrypting tampered ciphertext', () => {
    const original = encrypt('confidential_data');
    // Tamper with the encrypted bytes
    const tampered = {
      ...original,
      encrypted: 'AQID' + original.encrypted.slice(4),
    };

    expect(() => decrypt(tampered)).toThrow();
  });
});
