/**
 * Cloud Provider Tests
 *
 * Validates CloudProvider interface with mock implementation.
 * These tests lock the interface before implementing real providers.
 */

import { MockCloudProvider } from '../__mocks__/MockCloudProvider';
import { CloudProviderError } from '../CloudProvider';

describe('CloudProvider (Mock)', () => {
  let provider: MockCloudProvider;

  beforeEach(() => {
    provider = new MockCloudProvider();
  });

  afterEach(() => {
    provider.reset();
  });

  describe('readFile', () => {
    it('should return null for non-existent file', async () => {
      const result = await provider.readFile('nonexistent.json');
      expect(result).toBeNull();
    });

    it('should return file contents for existing file', async () => {
      provider.seedFile('test.json', '{"data":"test"}');

      const result = await provider.readFile('test.json');
      expect(result).toBe('{"data":"test"}');
    });

    it('should throw on network error', async () => {
      provider.setFailureMode(true, CloudProviderError.NETWORK_ERROR);

      await expect(provider.readFile('test.json')).rejects.toThrow('Mock read failure');
    });

    it('should track read count', async () => {
      await provider.readFile('test.json');
      await provider.readFile('test.json');

      expect(provider.getCallCounts().reads).toBe(2);
    });
  });

  describe('writeFile', () => {
    it('should write file successfully', async () => {
      await provider.writeFile('test.json', '{"data":"new"}');

      const result = await provider.readFile('test.json');
      expect(result).toBe('{"data":"new"}');
    });

    it('should overwrite existing file', async () => {
      provider.seedFile('test.json', '{"data":"old"}');
      await provider.writeFile('test.json', '{"data":"new"}');

      const result = await provider.readFile('test.json');
      expect(result).toBe('{"data":"new"}');
    });

    it('should throw on auth error', async () => {
      provider.setFailureMode(true, CloudProviderError.AUTH_ERROR);

      await expect(provider.writeFile('test.json', 'data')).rejects.toThrow();
    });

    it('should track write count', async () => {
      await provider.writeFile('file1.json', 'data1');
      await provider.writeFile('file2.json', 'data2');

      expect(provider.getCallCounts().writes).toBe(2);
    });
  });

  describe('getMetadata', () => {
    it('should return null for non-existent file', async () => {
      const result = await provider.getMetadata('nonexistent.json');
      expect(result).toBeNull();
    });

    it('should return metadata for existing file', async () => {
      const testDate = new Date('2026-02-07T12:00:00Z');
      provider.seedFile('test.json', '{"data":"test"}', testDate);

      const result = await provider.getMetadata('test.json');
      expect(result).not.toBeNull();
      expect(result?.modified).toEqual(testDate);
      expect(result?.size).toBe(15); // Length of '{"data":"test"}'
    });

    it('should update modified time on write', async () => {
      const oldDate = new Date('2026-01-01T00:00:00Z');
      provider.seedFile('test.json', 'old', oldDate);

      await provider.writeFile('test.json', 'new');

      const metadata = await provider.getMetadata('test.json');
      expect(metadata?.modified.getTime()).toBeGreaterThan(oldDate.getTime());
    });
  });

  describe('exists', () => {
    it('should return false for non-existent file', async () => {
      const result = await provider.exists('nonexistent.json');
      expect(result).toBe(false);
    });

    it('should return true for existing file', async () => {
      provider.seedFile('test.json', 'data');

      const result = await provider.exists('test.json');
      expect(result).toBe(true);
    });
  });

  describe('deleteFile', () => {
    it('should delete existing file', async () => {
      provider.seedFile('test.json', 'data');

      await provider.deleteFile('test.json');

      expect(await provider.exists('test.json')).toBe(false);
    });

    it('should not throw when deleting non-existent file', async () => {
      await expect(provider.deleteFile('nonexistent.json')).resolves.not.toThrow();
    });

    it('should throw on rate limit error', async () => {
      provider.setFailureMode(true, CloudProviderError.RATE_LIMIT);

      await expect(provider.deleteFile('test.json')).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle AUTH_ERROR', async () => {
      provider.setFailureMode(true, CloudProviderError.AUTH_ERROR);

      await expect(provider.readFile('test.json')).rejects.toThrow('AUTH_ERROR');
    });

    it('should handle RATE_LIMIT', async () => {
      provider.setFailureMode(true, CloudProviderError.RATE_LIMIT);

      await expect(provider.writeFile('test.json', 'data')).rejects.toThrow('RATE_LIMIT');
    });

    it('should handle QUOTA_EXCEEDED', async () => {
      provider.setFailureMode(true, CloudProviderError.QUOTA_EXCEEDED);

      await expect(provider.writeFile('test.json', 'data')).rejects.toThrow('QUOTA_EXCEEDED');
    });
  });

  describe('reset', () => {
    it('should clear all files', async () => {
      provider.seedFile('file1.json', 'data1');
      provider.seedFile('file2.json', 'data2');

      provider.reset();

      expect(await provider.exists('file1.json')).toBe(false);
      expect(await provider.exists('file2.json')).toBe(false);
    });

    it('should reset call counts', async () => {
      await provider.readFile('test.json');
      await provider.writeFile('test.json', 'data');

      provider.reset();

      expect(provider.getCallCounts().reads).toBe(0);
      expect(provider.getCallCounts().writes).toBe(0);
    });

    it('should clear failure mode', async () => {
      provider.setFailureMode(true);
      provider.reset();

      // Should not throw after reset
      await expect(provider.readFile('test.json')).resolves.toBeNull();
    });
  });
});
