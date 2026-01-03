import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  // Derive a 32-byte key from the provided key using scrypt
  const salt = Buffer.from('ads-analytics-salt', 'utf8');
  return scryptSync(key, salt, 32);
}

/**
 * Encrypts a string using AES-256-GCM
 * Returns base64-encoded string: IV + AuthTag + Ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine IV + AuthTag + Encrypted data
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypts a base64-encoded encrypted string
 */
export function decrypt(encryptedBase64: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedBase64, 'base64');

  // Extract IV, AuthTag, and Ciphertext
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Encrypts OAuth tokens for storage
 */
export function encryptTokens(tokens: {
  accessToken: string;
  refreshToken: string;
}): {
  accessTokenEnc: string;
  refreshTokenEnc: string;
} {
  return {
    accessTokenEnc: encrypt(tokens.accessToken),
    refreshTokenEnc: encrypt(tokens.refreshToken),
  };
}

/**
 * Decrypts OAuth tokens for use
 */
export function decryptTokens(encrypted: {
  accessTokenEnc: string;
  refreshTokenEnc: string;
}): {
  accessToken: string;
  refreshToken: string;
} {
  return {
    accessToken: decrypt(encrypted.accessTokenEnc),
    refreshToken: decrypt(encrypted.refreshTokenEnc),
  };
}

