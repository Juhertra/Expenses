/**
 * Electron bridge and platform helpers.
 * Provides safe wrappers so renderer code can run in web and Electron.
 */

export const isElectron = () =>
  typeof window !== 'undefined' &&
  (!!(window.process && window.process.type === 'renderer') || !!window.electronAPI);

export const isMac = () => typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
export const isWindows = () => typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('WIN');

export const getPathSeparator = () => (isWindows() ? '\\' : '/');

// Storage wrapper
export const storage = {
  async get(key: string, shared?: boolean) {
    try {
      if (window.storage) {
        return await window.storage.get(key, shared);
      }
      // Dev-only fallback (web). Avoid in production/Electron to ensure file-backed persistence.
      if (!isElectron() && typeof localStorage !== 'undefined' && !import.meta.env?.PROD) {
        const value = localStorage.getItem(key);
        return value ? { key, value, shared: false } : null;
      }
    } catch (err) {
      console.error('Storage get error', err);
      throw err;
    }
    return null;
  },
  async set(key: string, value: string, shared?: boolean) {
    try {
      if (window.storage) {
        return await window.storage.set(key, value, shared);
      }
      if (!isElectron() && typeof localStorage !== 'undefined' && !import.meta.env?.PROD) {
        localStorage.setItem(key, value);
        return { key, value, shared: false };
      }
    } catch (err) {
      console.error('Storage set error', err);
      throw err;
    }
    return null;
  },
  async delete(key: string, shared?: boolean) {
    try {
      if (window.storage) {
        return await window.storage.delete?.(key, shared);
      }
      if (!isElectron() && typeof localStorage !== 'undefined' && !import.meta.env?.PROD) {
        localStorage.removeItem(key);
        return { key, deleted: true, shared: false };
      }
    } catch (err) {
      console.error('Storage delete error', err);
      throw err;
    }
    return null;
  },
  async list(prefix?: string, shared?: boolean) {
    try {
      if (window.storage) {
        return await window.storage.list?.(prefix, shared);
      }
      if (!isElectron() && typeof localStorage !== 'undefined' && !import.meta.env?.PROD) {
        const keys = Object.keys(localStorage).filter(k => !prefix || k.startsWith(prefix));
        return { keys, prefix, shared: false };
      }
    } catch (err) {
      console.error('Storage list error', err);
      throw err;
    }
    return { keys: [], prefix, shared: false };
  }
};

// File system helpers (stub for Electron IPC integration)
export const fileSystem = {
  supportsDirectoryPicker: () => {
    // Electron doesn't use directory picker API, but has file-based storage
    if (isElectron()) {
      return !!(window.electronAPI?.selectDataFile);
    }
    // Web uses File System Access API
    return typeof window.showDirectoryPicker !== 'undefined';
  },
  async showDirectoryPicker() {
    if (isElectron()) {
      // In Electron, trigger file selection dialog
      const electronAPI = window.electronAPI;
      if (electronAPI?.selectDataFile) {
        // Get suggested cloud folder path or use documents
        const homeDir = electronAPI.homeDir || '';
        const result = await electronAPI.selectDataFile(homeDir);

        // Electron returns file path string, but web expects directory handle.
        // Return a sentinel object cast to the expected type — consumers check .kind === 'electron-file'.
        if (result) {
          return { name: 'Electron Storage', kind: 'electron-file' } as unknown as FileSystemDirectoryHandle;
        }
      }
      return null;
    }
    if (window.showDirectoryPicker) {
      return await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'documents' });
    }
    return null;
  }
};

export const getModifierKey = () => (isMac() ? '⌘' : 'Ctrl');
export const getModifierKeyName = () => (isMac() ? 'Cmd' : 'Ctrl');

