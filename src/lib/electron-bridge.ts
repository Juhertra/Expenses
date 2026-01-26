/**
 * Electron bridge and platform helpers.
 * Provides safe wrappers so renderer code can run in web and Electron.
 */

export const isElectron = () =>
  typeof window !== 'undefined' &&
  !!((window as any).process && (window as any).process.type === 'renderer');

export const isMac = () => typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
export const isWindows = () => typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('WIN');

export const getPathSeparator = () => (isWindows() ? '\\' : '/');

// Storage wrapper
export const storage = {
  async get(key: string, shared?: boolean) {
    try {
      if ((window as any).storage) {
        return await (window as any).storage.get(key, shared);
      }
      // Dev-only fallback (web). Avoid in production/Electron to ensure file-backed persistence.
      if (!isElectron() && typeof localStorage !== 'undefined' && !(import.meta as any)?.env?.PROD) {
        const value = localStorage.getItem(key);
        return value ? { key, value, shared: false } : null;
      }
    } catch (err) {
      console.error('Storage get error', err);
    }
    return null;
  },
  async set(key: string, value: string, shared?: boolean) {
    try {
      if ((window as any).storage) {
        return await (window as any).storage.set(key, value, shared);
      }
      if (!isElectron() && typeof localStorage !== 'undefined' && !(import.meta as any)?.env?.PROD) {
        localStorage.setItem(key, value);
        return { key, value, shared: false };
      }
    } catch (err) {
      console.error('Storage set error', err);
    }
    return null;
  },
  async delete(key: string, shared?: boolean) {
    try {
      if ((window as any).storage) {
        return await (window as any).storage.delete(key, shared);
      }
      if (!isElectron() && typeof localStorage !== 'undefined' && !(import.meta as any)?.env?.PROD) {
        localStorage.removeItem(key);
        return { key, deleted: true, shared: false };
      }
    } catch (err) {
      console.error('Storage delete error', err);
    }
    return null;
  },
  async list(prefix?: string, shared?: boolean) {
    try {
      if ((window as any).storage) {
        return await (window as any).storage.list(prefix, shared);
      }
      if (!isElectron() && typeof localStorage !== 'undefined' && !(import.meta as any)?.env?.PROD) {
        const keys = Object.keys(localStorage).filter(k => !prefix || k.startsWith(prefix));
        return { keys, prefix, shared: false };
      }
    } catch (err) {
      console.error('Storage list error', err);
    }
    return { keys: [], prefix, shared: false };
  }
};

// File system helpers (stub for Electron IPC integration)
export const fileSystem = {
  supportsDirectoryPicker: () => typeof (window as any).showDirectoryPicker !== 'undefined',
  async showDirectoryPicker() {
    if (isElectron()) {
      // Expect preload to expose an IPC-backed picker if needed
      if ((window as any).electronAPI?.showDirectoryPicker) {
        return (window as any).electronAPI.showDirectoryPicker();
      }
      return null;
    }
    if ('showDirectoryPicker' in window) {
      return await (window as any).showDirectoryPicker({ mode: 'readwrite', startIn: 'documents' });
    }
    return null;
  }
};

export const getModifierKey = () => (isMac() ? '⌘' : 'Ctrl');
export const getModifierKeyName = () => (isMac() ? 'Cmd' : 'Ctrl');
