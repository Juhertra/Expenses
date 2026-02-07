/**
 * Encryption Module Tests
 *
 * Validates AES-256-GCM encryption/decryption round-trip and security properties.
 */

import { encryptData, decryptData, generateSalt, deriveKey } from '../encryption';

describe('encryption', () => {
  // Test key (256-bit / 32 bytes)
  const testKey = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');

  describe('encryptData / decryptData', () => {
    it('should encrypt and decrypt plaintext correctly (round-trip)', async () => {
      const plaintext = 'Hello, World!';

      const encrypted = await encryptData(plaintext, testKey);
      const decrypted = await decryptData(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt JSON expense data correctly', async () => {
      const expenseData = JSON.stringify({
        data: {
          expenses: [
            { id: 1, description: 'Coffee', amount: 5.0, category: 'Food' },
          ],
        },
      });

      const encrypted = await encryptData(expenseData, testKey);
      const decrypted = await decryptData(encrypted, testKey);
      const parsed = JSON.parse(decrypted);

      expect(parsed.data.expenses[0].description).toBe('Coffee');
      expect(parsed.data.expenses[0].amount).toBe(5.0);
    });

    it('should produce different ciphertext for same plaintext (random IV)', async () => {
      const plaintext = 'Test message';

      const encrypted1 = await encryptData(plaintext, testKey);
      const encrypted2 = await encryptData(plaintext, testKey);

      // Ciphertext should differ due to random IV
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to same plaintext
      expect(await decryptData(encrypted1, testKey)).toBe(plaintext);
      expect(await decryptData(encrypted2, testKey)).toBe(plaintext);
    });

    it('should fail to decrypt with wrong key (authentication)', async () => {
      const plaintext = 'Secret message';
      const wrongKey = Buffer.from('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', 'hex');

      const encrypted = await encryptData(plaintext, testKey);

      await expect(decryptData(encrypted, wrongKey)).rejects.toThrow();
    });

    it('should fail to decrypt tampered ciphertext (authentication)', async () => {
      const plaintext = 'Important data';
      const encrypted = await encryptData(plaintext, testKey);

      // Tamper with the ciphertext (flip a byte)
      const tamperedBuffer = Buffer.from(encrypted, 'base64');
      tamperedBuffer[20] ^= 0xFF; // Flip bits in middle
      const tampered = tamperedBuffer.toString('base64');

      await expect(decryptData(tampered, testKey)).rejects.toThrow();
    });

    it('should handle empty string', async () => {
      const plaintext = '';

      const encrypted = await encryptData(plaintext, testKey);
      const decrypted = await decryptData(encrypted, testKey);

      expect(decrypted).toBe('');
    });

    it('should handle large data (10KB)', async () => {
      const plaintext = 'x'.repeat(10000);

      const encrypted = await encryptData(plaintext, testKey);
      const decrypted = await decryptData(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', async () => {
      const plaintext = 'Hello 世界 🌍 שלום';

      const encrypted = await encryptData(plaintext, testKey);
      const decrypted = await decryptData(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('deriveKey', () => {
    it('should derive 256-bit key from password and salt', async () => {
      const password = 'my-secret-password';
      const salt = generateSalt();

      const key = await deriveKey(password, salt);

      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32); // 256 bits = 32 bytes
    });

    it('should derive different keys for different passwords', async () => {
      const salt = generateSalt();

      const key1 = await deriveKey('password1', salt);
      const key2 = await deriveKey('password2', salt);

      expect(key1).not.toEqual(key2);
    });

    it('should derive different keys for different salts', async () => {
      const password = 'same-password';

      const key1 = await deriveKey(password, generateSalt());
      const key2 = await deriveKey(password, generateSalt());

      expect(key1).not.toEqual(key2);
    });

    it('should derive same key for same password and salt (deterministic)', async () => {
      const password = 'test-password';
      const salt = generateSalt();

      const key1 = await deriveKey(password, salt);
      const key2 = await deriveKey(password, salt);

      expect(key1).toEqual(key2);
    });
  });

  describe('generateSalt', () => {
    it('should generate 128-bit (16-byte) salt', () => {
      const salt = generateSalt();

      expect(salt).toBeInstanceOf(Buffer);
      expect(salt.length).toBe(16);
    });

    it('should generate different salts each time', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();

      expect(salt1).not.toEqual(salt2);
    });
  });

  describe('format validation', () => {
    it('encrypted data should be valid base64', async () => {
      const plaintext = 'Test';
      const encrypted = await encryptData(plaintext, testKey);

      // Should decode without error
      const decoded = Buffer.from(encrypted, 'base64');
      expect(decoded.length).toBeGreaterThan(0);
    });

    it('encrypted data should contain IV (12 bytes) + ciphertext + tag (16 bytes)', async () => {
      const plaintext = 'Short';
      const encrypted = await encryptData(plaintext, testKey);
      const decoded = Buffer.from(encrypted, 'base64');

      // IV (12) + ciphertext (at least length of plaintext) + tag (16)
      expect(decoded.length).toBeGreaterThanOrEqual(12 + plaintext.length + 16);
    });
  });
});
