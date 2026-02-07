/**
 * Cloud Sync Service Tests
 *
 * Tests merge logic, backoff strategy, retry ceiling, and error handling
 * using MockCloudProvider (no network required).
 */

import { CloudSyncService } from '../CloudSyncService';
import { MockCloudProvider } from '../__mocks__/MockCloudProvider';
import { CloudProviderError } from '../CloudProvider';
import { encryptData } from '../encryption';

// Mock storage service
jest.mock('../../storage/storageService', () => ({
  getExpenses: jest.fn(),
  setExpenses: jest.fn(),
}));

import { getExpenses, setExpenses } from '../../storage/storageService';

describe('CloudSyncService', () => {
  let mockProvider: MockCloudProvider;
  let syncService: CloudSyncService;
  let testKey: Buffer;

  beforeEach(() => {
    mockProvider = new MockCloudProvider();
    testKey = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
    syncService = new CloudSyncService(mockProvider, testKey);

    // Reset mocks
    (getExpenses as jest.Mock).mockResolvedValue([]);
    (setExpenses as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    mockProvider.reset();
    jest.clearAllMocks();
  });

  describe('syncNow (manual sync)', () => {
    it('should upload local data when no cloud file exists', async () => {
      (getExpenses as jest.Mock).mockResolvedValue([
        { id: 1, description: 'Coffee', amount: 5.0 },
      ]);

      const result = await syncService.syncNow();

      expect(result.success).toBe(true);
      expect(result.uploadedBytes).toBeGreaterThan(0);
      expect(mockProvider.getCallCounts().writes).toBe(1);
    });

    it('should download cloud data when no local sync yet', async () => {
      // Seed cloud with encrypted data
      const cloudData = {
        version: '1.0.0',
        data: {
          expenses: [{ id: 2, description: 'Lunch', amount: 12.0 }],
        },
      };
      const encrypted = await encryptData(JSON.stringify(cloudData), testKey);
      mockProvider.seedFile('expense-tracker.json.encrypted', encrypted, new Date());

      const result = await syncService.syncNow();

      expect(result.success).toBe(true);
      expect(result.downloadedBytes).toBeGreaterThan(0);
      expect(setExpenses).toHaveBeenCalled();
    });

    it('should respect retry ceiling (60 attempts/hour)', async () => {
      // Exhaust retry ceiling
      for (let i = 0; i < 60; i++) {
        await syncService.syncNow();
      }

      // 61st attempt should fail
      const result = await syncService.syncNow();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many sync attempts');
    });

    it('should reset backoff on manual sync', async () => {
      // Trigger failure to increase backoff
      mockProvider.setFailureMode(true, CloudProviderError.NETWORK_ERROR);
      await syncService.autoSync();

      const statusBefore = syncService.getSyncStatus();
      expect(statusBefore.backoffDelay).toBeGreaterThan(30000);

      // Manual sync should reset backoff
      mockProvider.setFailureMode(false);
      await syncService.syncNow();

      const statusAfter = syncService.getSyncStatus();
      expect(statusAfter.backoffDelay).toBe(30000);
    });
  });

  describe('autoSync (automatic sync)', () => {
    it('should increase backoff exponentially on repeated failures', async () => {
      mockProvider.setFailureMode(true, CloudProviderError.NETWORK_ERROR);

      // First failure: 30s → 60s
      await syncService.autoSync();
      expect(syncService.getSyncStatus().backoffDelay).toBe(60000);

      // Second failure: 60s → 120s
      await syncService.autoSync();
      expect(syncService.getSyncStatus().backoffDelay).toBe(120000);

      // Third failure: 120s → 240s
      await syncService.autoSync();
      expect(syncService.getSyncStatus().backoffDelay).toBe(240000);

      // Fourth failure: 240s → 300s (capped)
      await syncService.autoSync();
      expect(syncService.getSyncStatus().backoffDelay).toBe(300000);

      // Should stay at cap
      await syncService.autoSync();
      expect(syncService.getSyncStatus().backoffDelay).toBe(300000);
    });

    it('should reset backoff and retry count on success', async () => {
      // Cause failures
      mockProvider.setFailureMode(true);
      await syncService.autoSync();
      await syncService.autoSync();

      expect(syncService.getSyncStatus().backoffDelay).toBeGreaterThan(30000);
      expect(syncService.getSyncStatus().syncAttemptsThisHour).toBeGreaterThan(0);

      // Successful sync should reset
      mockProvider.setFailureMode(false);
      await syncService.autoSync();

      expect(syncService.getSyncStatus().backoffDelay).toBe(30000);
      expect(syncService.getSyncStatus().syncAttemptsThisHour).toBe(0);
    });

    it('should respect retry ceiling', async () => {
      for (let i = 0; i < 60; i++) {
        await syncService.autoSync();
      }

      const result = await syncService.autoSync();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Retry ceiling');
    });
  });

  describe('merge logic', () => {
    it('should merge local and cloud expenses by ID (append new)', async () => {
      const localExpenses = [
        { id: 1, description: 'Local Coffee', amount: 5.0 },
      ];
      const cloudExpenses = [
        { id: 1, description: 'Local Coffee', amount: 5.0 }, // Same
        { id: 2, description: 'Cloud Lunch', amount: 12.0 }, // New
      ];

      (getExpenses as jest.Mock).mockResolvedValue(localExpenses);

      const cloudData = {
        version: '1.0.0',
        data: { expenses: cloudExpenses },
      };
      const encrypted = await encryptData(JSON.stringify(cloudData), testKey);
      mockProvider.seedFile('expense-tracker.json.encrypted', encrypted, new Date());

      await syncService.syncNow();

      // Should merge: keep ID 1, add ID 2
      expect(setExpenses).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 1, description: 'Local Coffee' }),
          expect.objectContaining({ id: 2, description: 'Cloud Lunch' }),
        ])
      );
    });

    it('should keep local expense if ID exists (last-write-wins)', async () => {
      const localExpenses = [
        { id: 1, description: 'Local Version', amount: 10.0 },
      ];
      const cloudExpenses = [
        { id: 1, description: 'Cloud Version', amount: 15.0 },
      ];

      (getExpenses as jest.Mock).mockResolvedValue(localExpenses);

      const cloudData = {
        version: '1.0.0',
        data: { expenses: cloudExpenses },
      };
      const encrypted = await encryptData(JSON.stringify(cloudData), testKey);
      mockProvider.seedFile('expense-tracker.json.encrypted', encrypted, new Date());

      await syncService.syncNow();

      // Should keep local version (ID 1 exists locally)
      expect(setExpenses).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 1, description: 'Local Version' }),
        ])
      );
    });

    it('should handle empty cloud data', async () => {
      const localExpenses = [{ id: 1, description: 'Local', amount: 5.0 }];
      (getExpenses as jest.Mock).mockResolvedValue(localExpenses);

      const cloudData = {
        version: '1.0.0',
        data: { expenses: [] },
      };
      const encrypted = await encryptData(JSON.stringify(cloudData), testKey);
      mockProvider.seedFile('expense-tracker.json.encrypted', encrypted, new Date());

      const result = await syncService.syncNow();

      expect(result.success).toBe(true);
      // Local data should remain
      expect(setExpenses).toHaveBeenCalledWith(localExpenses);
    });
  });

  describe('error handling', () => {
    it('should return AUTH_ERROR message on authentication failure', async () => {
      mockProvider.setFailureMode(true, CloudProviderError.AUTH_ERROR);

      const result = await syncService.syncNow();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication failed');
      expect(syncService.getSyncStatus().lastError).toContain('AUTH_ERROR');
    });

    it('should return RATE_LIMIT message and max backoff', async () => {
      mockProvider.setFailureMode(true, CloudProviderError.RATE_LIMIT);

      const result = await syncService.autoSync();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit');
      expect(syncService.getSyncStatus().backoffDelay).toBe(300000); // Max backoff
    });

    it('should return QUOTA_EXCEEDED message', async () => {
      mockProvider.setFailureMode(true, CloudProviderError.QUOTA_EXCEEDED);

      const result = await syncService.syncNow();

      expect(result.success).toBe(false);
      expect(result.error).toContain('quota exceeded');
    });

    it('should return NETWORK_ERROR message', async () => {
      mockProvider.setFailureMode(true, CloudProviderError.NETWORK_ERROR);

      const result = await syncService.syncNow();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should reject invalid cloud data format', async () => {
      const invalidData = { random: 'data' };
      const encrypted = await encryptData(JSON.stringify(invalidData), testKey);
      mockProvider.seedFile('expense-tracker.json.encrypted', encrypted, new Date());

      const result = await syncService.syncNow();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid data format');
    });

    it('should fail on decryption error (wrong key)', async () => {
      const wrongKey = Buffer.from('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', 'hex');
      const wrongService = new CloudSyncService(mockProvider, wrongKey);

      const cloudData = { version: '1.0.0', data: { expenses: [] } };
      const encrypted = await encryptData(JSON.stringify(cloudData), testKey);
      mockProvider.seedFile('expense-tracker.json.encrypted', encrypted, new Date());

      const result = await wrongService.syncNow();

      expect(result.success).toBe(false);
    });
  });

  describe('sync status', () => {
    it('should track last sync time', async () => {
      const before = new Date();
      await syncService.syncNow();
      const after = new Date();

      const status = syncService.getSyncStatus();
      expect(status.lastSyncTime).not.toBeNull();
      expect(status.lastSyncTime!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(status.lastSyncTime!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should track sync attempts', async () => {
      await syncService.syncNow();
      await syncService.syncNow();

      expect(syncService.getSyncStatus().syncAttemptsThisHour).toBe(2);
    });

    it('should prevent concurrent syncs', async () => {
      // Start first sync (won't complete immediately due to async)
      const promise1 = syncService.syncNow();

      // Try second sync while first is in progress
      const result2 = await syncService.syncNow();

      expect(result2.success).toBe(false);
      expect(result2.error).toContain('already in progress');

      await promise1; // Clean up
    });
  });

  describe('resetState', () => {
    it('should reset all sync state', async () => {
      // Build up state
      await syncService.syncNow();
      mockProvider.setFailureMode(true);
      await syncService.autoSync();

      const statusBefore = syncService.getSyncStatus();
      expect(statusBefore.lastSyncTime).not.toBeNull();
      expect(statusBefore.syncAttemptsThisHour).toBeGreaterThan(0);

      // Reset
      syncService.resetState();

      const statusAfter = syncService.getSyncStatus();
      expect(statusAfter.lastSyncTime).toBeNull();
      expect(statusAfter.syncAttemptsThisHour).toBe(0);
      expect(statusAfter.backoffDelay).toBe(30000);
      expect(statusAfter.lastError).toBeNull();
    });
  });
});
