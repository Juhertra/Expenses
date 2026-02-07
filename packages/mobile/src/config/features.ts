/**
 * Feature Flags and Configuration
 *
 * Controls which features are enabled based on environment and user configuration.
 */

/**
 * Cloud sync configuration
 */
interface SyncConfig {
  enabled: boolean;
  provider?: 'dropbox' | 'google-drive' | 'onedrive';
  clientId?: string;
  encryptionEnabled: boolean;
}

/**
 * Get cloud sync configuration
 *
 * Checks environment variables and stored configuration to determine if
 * cloud sync is available and properly configured.
 */
export function getSyncConfig(): SyncConfig {
  // SYNC_ENABLED: Keep OFF by default until device testing is complete
  // Set EXPO_PUBLIC_ENABLE_SYNC=true in .env to enable after testing
  const syncEnabled = process.env.EXPO_PUBLIC_ENABLE_SYNC === 'true';
  const dropboxClientId = process.env.EXPO_PUBLIC_DROPBOX_CLIENT_ID;

  if (!syncEnabled || !dropboxClientId) {
    return {
      enabled: false,
      encryptionEnabled: true,
    };
  }

  return {
    enabled: true,
    provider: 'dropbox',
    clientId: dropboxClientId,
    encryptionEnabled: true,
  };
}

/**
 * Check if cloud sync is enabled and configured
 */
export function isSyncEnabled(): boolean {
  return getSyncConfig().enabled;
}

/**
 * Check if encryption is enabled for cloud sync
 *
 * Should always be true in production. Only disable for local testing.
 */
export function isEncryptionEnabled(): boolean {
  return getSyncConfig().encryptionEnabled;
}

/**
 * Feature flags for gradual rollout
 */
export const features = {
  /**
   * Enable cloud sync UI (Settings screen, Sync button)
   * Only shown if sync is properly configured.
   */
  cloudSync: isSyncEnabled(),

  /**
   * Enable manual "Sync Now" button
   * Allows users to trigger sync on demand instead of waiting for auto-sync.
   */
  manualSync: true,

  /**
   * Enable automatic background sync
   * Syncs in background when app is active and network is available.
   */
  autoSync: false, // Disabled until Phase 4 is fully tested

  /**
   * Show sync status indicator
   * Displays sync progress, errors, and last sync time.
   */
  syncStatus: isSyncEnabled(),
};
