const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');
const path = require('path');

const homeDir = os.homedir();
const platform = process.platform;

const suggestedFolders = (() => {
  if (platform === 'win32') {
    return {
      'OneDrive': path.join(homeDir, 'OneDrive'),
      'Google Drive': path.join(homeDir, 'Google Drive'),
      'Dropbox': path.join(homeDir, 'Dropbox'),
    };
  }
  if (platform === 'darwin') {
    return {
      'iCloud Drive': path.join(homeDir, 'Library', 'Mobile Documents', 'com~apple~CloudDocs'),
      'Dropbox': path.join(homeDir, 'Dropbox'),
      'OneDrive': path.join(homeDir, 'OneDrive'),
      'Google Drive': path.join(homeDir, 'Google Drive'),
    };
  }
  return {
    'Dropbox': path.join(homeDir, 'Dropbox'),
    'Nextcloud': path.join(homeDir, 'Nextcloud'),
  };
})();

// Minimal storage shim backed by data:* IPC handlers
const STORAGE_SCHEMA_VERSION = 1;
const readRaw = async () => {
  const contents = await ipcRenderer.invoke('data:read');
  if (!contents) return {};
  try {
    const parsed = JSON.parse(contents);
    if (parsed.raw && typeof parsed.raw === 'object') return parsed.raw;
    return {};
  } catch (err) {
    return {};
  }
};

const writeRaw = async (raw) => {
  const payload = {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    exportDate: new Date().toISOString(),
    raw,
  };
  await ipcRenderer.invoke('data:write', JSON.stringify(payload, null, 2));
};

contextBridge.exposeInMainWorld('storage', {
  get: async (key) => {
    const raw = await readRaw();
    if (!(key in raw)) return null;
    return { value: raw[key] };
  },
  set: async (key, value) => {
    const raw = await readRaw();
    raw[key] = value;
    await writeRaw(raw);
    return { key, value };
  },
  delete: async (key) => {
    const raw = await readRaw();
    if (key in raw) {
      delete raw[key];
      await writeRaw(raw);
    }
    return { key, deleted: true };
  },
  list: async (prefix) => {
    const raw = await readRaw();
    const keys = Object.keys(raw).filter(k => !prefix || k.startsWith(prefix));
    return { keys, prefix };
  }
});

contextBridge.exposeInMainWorld('electronAPI', {
  selectDataFile: (startDir) => ipcRenderer.invoke('data:select', startDir),
  getDataFilePath: () => ipcRenderer.invoke('data:path'),
  readDataFile: () => ipcRenderer.invoke('data:read'),
  writeDataFile: (contents) => ipcRenderer.invoke('data:write', contents),
  saveAsDataFile: () => ipcRenderer.invoke('data:saveAs'),
  revealDataFile: () => ipcRenderer.invoke('data:reveal'),
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  importDataFile: () => ipcRenderer.invoke('data:import'),
  exportCsvFile: (payload) => ipcRenderer.invoke('data:exportCsv', payload),
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSaveDialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options),
  onDataChanged: (callback) => {
    ipcRenderer.removeAllListeners('data:changed');
    ipcRenderer.on('data:changed', (_event, payload) => callback(payload));
  },
  onMenuAction: (callback) => {
    ipcRenderer.removeAllListeners('menu:action');
    ipcRenderer.on('menu:action', (_event, payload) => callback(payload));
  },
  platform,
  homeDir,
  suggestedFolders,
});
