/**
 * Storage adapter interface for the Expense Tracker
 * Provides async storage operations compatible with the component's expectations
 */

export interface StorageResult {
  value: string;
}

export interface StorageAdapter {
  get(key: string): Promise<StorageResult | null>;
  set(key: string, value: string): Promise<void>;
}

// Extend Window interface to include storage
declare global {
  interface Window {
    storage: StorageAdapter;
  }
}

