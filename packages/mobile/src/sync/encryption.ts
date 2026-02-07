/**
 * Client-Side Encryption Module
 *
 * Implements AES-256-GCM encryption for securing expense data before cloud upload.
 * Each file is encrypted independently with a 96-bit IV and authentication tag.
 *
 * Security features:
 * - AES-256-GCM (authenticated encryption)
 * - Random 96-bit IV per encryption
 * - 128-bit authentication tag
 * - Key derived from device secret + optional user PIN
 *
 * Format: base64(IV + ciphertext + auth_tag)
 */

import { getRandomBytes, createCipheriv, createDecipheriv } from 'react-native-quick-crypto';

/**
 * Encrypt plaintext data with AES-256-GCM
 *
 * @param plaintext - String data to encrypt
 * @param key - 256-bit (32-byte) encryption key as Buffer
 * @returns Base64-encoded string: IV (12 bytes) + ciphertext + tag (16 bytes)
 */
export async function encryptData(plaintext: string, key: Buffer): Promise<string> {
  // Generate random 96-bit IV (12 bytes) for GCM
  const iv = getRandomBytes(12);

  // Create cipher with AES-256-GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  // Encrypt data
  let ciphertext = cipher.update(plaintext, 'utf8');
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);

  // Get authentication tag (16 bytes)
  const tag = cipher.getAuthTag();

  // Combine: IV + ciphertext + tag and return as base64
  const encrypted = Buffer.concat([iv, ciphertext, tag]);
  return encrypted.toString('base64');
}

/**
 * Decrypt AES-256-GCM encrypted data
 *
 * @param encrypted - Base64-encoded encrypted data (IV + ciphertext + tag)
 * @param key - 256-bit (32-byte) encryption key as Buffer
 * @returns Decrypted plaintext string
 * @throws Error if authentication fails (tampered data)
 */
export async function decryptData(encrypted: string, key: Buffer): Promise<string> {
  // Decode base64
  const data = Buffer.from(encrypted, 'base64');

  // Extract components
  const iv = data.subarray(0, 12);           // First 12 bytes
  const tag = data.subarray(data.length - 16); // Last 16 bytes
  const ciphertext = data.subarray(12, data.length - 16); // Middle

  // Create decipher with AES-256-GCM
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  // Decrypt data
  let plaintext = decipher.update(ciphertext);
  plaintext = Buffer.concat([plaintext, decipher.final()]);

  return plaintext.toString('utf8');
}

/**
 * Generate a 256-bit encryption key from a password/secret
 *
 * Uses PBKDF2 with SHA-256 and 100,000 iterations.
 *
 * @param password - User password or device secret
 * @param salt - Salt for key derivation (should be unique per user/device)
 * @returns 256-bit key as Buffer
 */
export async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  // TODO: Implement PBKDF2 key derivation
  // For now, using a simple approach (should be enhanced with PBKDF2)
  const crypto = require('react-native-quick-crypto');
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

/**
 * Generate a random salt for key derivation
 *
 * @returns 128-bit (16-byte) random salt
 */
export function generateSalt(): Buffer {
  return getRandomBytes(16);
}
