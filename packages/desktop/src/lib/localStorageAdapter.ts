/**
 * localStorage adapter implementation for browser storage
 * Wraps synchronous localStorage API in async interface
 */

import type { StorageAdapter, StorageResult } from './storage';

export class LocalStorageAdapter implements StorageAdapter {
  /**
   * Get a value from localStorage
   * @param key Storage key
   * @returns Promise resolving to { value: string } or null if not found
   */
  async get(key: string): Promise<StorageResult | null> {
    try {
      const value = localStorage.getItem(key);
      if (value === null) {
        return null;
      }
      return { value };
    } catch (error) {
      console.error(`Error reading from localStorage (key: ${key}):`, error);
      return null;
    }
  }

  /**
   * Set a value in localStorage
   * @param key Storage key
   * @param value String value to store (no JSON processing here)
   */
  async set(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`Error writing to localStorage (key: ${key}):`, error);
      throw error;
    }
  }
}

export const localStorageAdapter = new LocalStorageAdapter();

