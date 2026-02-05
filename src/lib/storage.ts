/**
 * Storage adapter interface for the Expense Tracker
 * Provides async storage operations compatible with the component's expectations
 */

export interface StorageResult {
  value: string;
}

export interface StorageAdapter {
  get(key: string, shared?: boolean): Promise<StorageResult | null>;
  set(key: string, value: string, shared?: boolean): Promise<void>;
  delete?(key: string, shared?: boolean): Promise<unknown>;
  list?(prefix?: string, shared?: boolean): Promise<{ keys: string[]; prefix?: string }>;
}

// Extend Window interface with storage and platform APIs
declare global {
  interface Window {
    storage: StorageAdapter;

    // Electron renderer exposes process on window
    process?: { type: string };

    // File System Access API (not in all lib.dom versions)
    showDirectoryPicker?: (options?: Record<string, unknown>) => Promise<FileSystemDirectoryHandle>;
  }
}

