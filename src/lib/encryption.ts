import crypto from 'crypto';
import { getRuntimeConfig } from './config';

/**
 * AES-256-GCM Token Encryption Vault
 * Conforms to Security Architecture specification (8-Security.md).
 * Uses a 32-byte key (derived or provided via hex/env), 12-byte IV, and 16-byte auth tag.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const config = getRuntimeConfig();
  const secret = config.TOKEN_ENCRYPTION_KEY || config.APP_SECRET;
  if (!secret) {
    if (config.NODE_ENV === 'test') {
      return crypto.createHash('sha256').update('vitest-only-encryption-key').digest();
    }
    throw new Error('TOKEN_ENCRYPTION_KEY or APP_SECRET must be configured before encrypting secrets');
  }
  if (!/^[a-f0-9]{64}$/i.test(secret)) {
    throw new Error('Encryption key must be a 64-character hexadecimal value');
  }
  return Buffer.from(secret, 'hex');
}

export interface EncryptedData {
  encrypted: string; // base64
  iv: string;        // base64
  tag: string;       // base64
}

export function encrypt(text: string): EncryptedData {
  if (!text) throw new Error('Cannot encrypt empty text');
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const tag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

export function decrypt(data: EncryptedData): string {
  if (!data || !data.encrypted || !data.iv || !data.tag) {
    throw new Error('Invalid encrypted data payload');
  }
  const key = getKey();
  const iv = Buffer.from(data.iv, 'base64');
  const tag = Buffer.from(data.tag, 'base64');
  if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
    throw new Error('Invalid encrypted data nonce or authentication tag');
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(data.encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Compact string format for single-column DB storage:
 * enc:v1:<iv_b64>:<tag_b64>:<encrypted_b64>
 */
export function encryptToString(text: string): string {
  const { encrypted, iv, tag } = encrypt(text);
  return `enc:v1:${iv}:${tag}:${encrypted}`;
}

export function decryptFromString(encoded: string): string {
  if (!encoded || !encoded.startsWith('enc:v1:')) {
    throw new Error('Encrypted value must use the enc:v1 format');
  }
  const parts = encoded.split(':');
  if (parts.length !== 5) {
    throw new Error('Malformed encrypted string format');
  }
  const [, , iv, tag, encrypted] = parts;
  return decrypt({ iv, tag, encrypted });
}
