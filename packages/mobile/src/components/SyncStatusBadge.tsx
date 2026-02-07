/**
 * Sync Status Badge
 *
 * Shows current sync state with icon and color.
 * Provides visual feedback for sync status.
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import type { SyncState } from '../sync/CloudSyncService';

interface SyncStatusBadgeProps {
  syncStatus: SyncState;
  /** Compact mode shows only icon, no text */
  compact?: boolean;
}

export function SyncStatusBadge({ syncStatus, compact = false }: SyncStatusBadgeProps) {
  const { isSyncing, lastError, lastSyncTime } = syncStatus;

  // Determine status
  let icon = '';
  let statusText = '';
  let statusColor = '#999';

  if (isSyncing) {
    statusText = 'Syncing...';
    statusColor = '#007AFF';
  } else if (lastError) {
    icon = '⚠️';
    statusText = 'Sync Error';
    statusColor = '#FF3B30';
  } else if (lastSyncTime) {
    icon = '✓';
    statusText = 'Synced';
    statusColor = '#34C759';
  } else {
    icon = '☁️';
    statusText = 'Not Synced';
    statusColor = '#999';
  }

  if (compact) {
    return (
      <View style={styles.compact}>
        {isSyncing ? (
          <ActivityIndicator size="small" color={statusColor} />
        ) : (
          <Text style={[styles.icon, { color: statusColor }]}>{icon}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderColor: statusColor }]}>
      {isSyncing ? (
        <ActivityIndicator size="small" color={statusColor} style={styles.spinner} />
      ) : (
        <Text style={[styles.icon, { color: statusColor }]}>{icon}</Text>
      )}
      <View style={styles.textContainer}>
        <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
        {lastSyncTime && !isSyncing && (
          <Text style={styles.timeText}>
            {formatRelativeTime(lastSyncTime)}
          </Text>
        )}
        {lastError && (
          <Text style={styles.errorText} numberOfLines={1}>
            {lastError}
          </Text>
        )}
      </View>
    </View>
  );
}

/**
 * Format last sync time as relative string
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  compact: {
    padding: 4,
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  spinner: {
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  errorText: {
    fontSize: 11,
    color: '#FF3B30',
    marginTop: 2,
  },
});
