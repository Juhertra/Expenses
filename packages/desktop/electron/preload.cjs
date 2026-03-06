const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');
const path = require('path');

const homeDir = os.homedir();
const platform = process.platform;

// Build suggested cloud folders as an array of { name, path } objects
const suggestedFolders = (() => {
  const folders = {};

  if (platform === 'win32') {
    folders['OneDrive'] = path.join(homeDir, 'OneDrive');
    folders['Google Drive'] = path.join(homeDir, 'Google Drive');
    folders['Dropbox'] = path.join(homeDir, 'Dropbox');
  } else if (platform === 'darwin') {
    folders['iCloud Drive'] = path.join(homeDir, 'Library', 'Mobile Documents', 'com~apple~CloudDocs');
    folders['Dropbox'] = path.join(homeDir, 'Dropbox');
    folders['OneDrive'] = path.join(homeDir, 'OneDrive');
    folders['Google Drive'] = path.join(homeDir, 'Google Drive');
  } else {
    folders['Dropbox'] = path.join(homeDir, 'Dropbox');
    folders['Nextcloud'] = path.join(homeDir, 'Nextcloud');
  }

  // Convert to array format expected by cloud detection
  return Object.entries(folders).map(([name, folderPath]) => ({
    name,
    path: folderPath
  }));
})();

// Minimal storage shim backed by data:* IPC handlers
const STORAGE_SCHEMA_VERSION = 1;
const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024; // 10MB limit

// Write queue to prevent race conditions
// Multiple concurrent writes would cause data loss without serialization
let writeQueue = Promise.resolve();
let cachedRaw = null;
let cacheValid = false;
let cachedFileMtimeMs = null;
let lastWriteMtimeMs = null;
const buildRawFromData = (payload) => {
  if (!payload || typeof payload.data !== 'object' || !payload.data) {
    return null;
  }

  return {
    'household-expenses': JSON.stringify(payload.data.expenses ?? []),
    'household-recurring': JSON.stringify(payload.data.recurring ?? []),
    'household-partner-names': JSON.stringify(
      payload.data.partnerNames ?? { partner1: 'Partner 1', partner2: 'Partner 2' }
    ),
    'household-settings': JSON.stringify(payload.data.householdSettings ?? {}),
    'household-settlements': JSON.stringify(payload.data.settlements ?? []),
  };
};

const readRaw = async () => {
  if (cacheValid && cachedRaw !== null) {
    return cachedRaw;
  }

  const state = await ipcRenderer.invoke('data:readState');
  cachedFileMtimeMs = state?.mtimeMs ?? null;

  if (state?.readError) {
    throw new Error('Failed to read shared data file: ' + state.readError);
  }

  if (!state?.contents) {
    cachedRaw = {};
    return {};
  }

  try {
    const parsed = JSON.parse(state.contents);

    if (parsed.schemaVersion && parsed.schemaVersion > STORAGE_SCHEMA_VERSION) {
      console.warn('Data file schema version ' + parsed.schemaVersion + ' is newer than supported version ' + STORAGE_SCHEMA_VERSION);
    }

    const raw = (parsed.raw && typeof parsed.raw === 'object')
      ? parsed.raw
      : buildRawFromData(parsed);

    if (!raw) {
      throw new Error('Data file is missing the expected storage payload.');
    }

    cachedRaw = raw;
    return raw;
  } catch (err) {
    cachedRaw = null;
    const message = err instanceof Error ? err.message : 'Data file is unreadable';
    throw new Error('Shared data file is unreadable or partially synced. ' + message);
  }
};

const writeRaw = async (raw) => {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid raw data: must be an object');
  }

  const payload = {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    exportDate: new Date().toISOString(),
    raw,
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const payloadSize = Buffer.byteLength(jsonString, 'utf8');
  if (payloadSize > MAX_PAYLOAD_SIZE) {
    throw new Error('Payload too large: ' + payloadSize + ' bytes (max ' + MAX_PAYLOAD_SIZE + ')');
  }

  const writeResult = await ipcRenderer.invoke('data:write', {
    contents: jsonString,
    expectedMtimeMs: cachedFileMtimeMs,
  });

  cachedRaw = { ...raw };
  cachedFileMtimeMs = writeResult?.mtimeMs ?? cachedFileMtimeMs;
  lastWriteMtimeMs = writeResult?.mtimeMs ?? Date.now();
};

// Serialize all write operations to prevent race conditions
const serializedWrite = (operation) => {
  writeQueue = writeQueue.then(async () => {
    cacheValid = true;
    try {
      return await operation();
    } finally {
      cacheValid = false;
    }
  }).catch((err) => {
    cacheValid = false;
    console.error('Serialized write error:', err);
    throw err;
  });
  return writeQueue;
};

contextBridge.exposeInMainWorld('storage', {
  get: async (key) => {
    const raw = await readRaw();
    if (!(key in raw)) return null;
    return { value: raw[key] };
  },
  set: (key, value) => {
    return serializedWrite(async () => {
      const raw = await readRaw();
      raw[key] = value;
      await writeRaw(raw);
      return { key, value };
    });
  },
  delete: (key) => {
    return serializedWrite(async () => {
      const raw = await readRaw();
      if (key in raw) {
        delete raw[key];
        await writeRaw(raw);
      }
      return { key, deleted: true };
    });
  },
  list: async (prefix) => {
    const raw = await readRaw();
    const keys = Object.keys(raw).filter(k => !prefix || k.startsWith(prefix));
    return { keys, prefix };
  }
});

contextBridge.exposeInMainWorld('electronAPI', {
  selectDataFile: (startDir) => ipcRenderer.invoke('data:select', startDir),
  createDataFile: (payload) => ipcRenderer.invoke('data:create', payload),
  openDataFile: (startDir) => ipcRenderer.invoke('data:open', startDir),
  getDataFilePath: () => ipcRenderer.invoke('data:path'),
  readDataFile: () => ipcRenderer.invoke('data:read'),
  readDataFileState: () => ipcRenderer.invoke('data:readState'),
  writeDataFile: (contents) => ipcRenderer.invoke('data:write', contents),
  saveAsDataFile: () => ipcRenderer.invoke('data:saveAs'),
  revealDataFile: () => ipcRenderer.invoke('data:reveal'),
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  importDataFile: () => ipcRenderer.invoke('data:import'),
  exportCsvFile: (payload) => ipcRenderer.invoke('data:exportCsv', payload),
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSaveDialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options),
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
  installUpdate: () => ipcRenderer.invoke('app:installUpdate'),
  deferUpdate: (shouldAutoInstall) => ipcRenderer.invoke('app:deferUpdate', shouldAutoInstall),
  onDataChanged: (callback) => {
    ipcRenderer.removeAllListeners('data:changed');
    ipcRenderer.on('data:changed', (_event, payload) => {
      if (lastWriteMtimeMs && Math.abs(payload.mtimeMs - lastWriteMtimeMs) < 2000) {
        return;
      }
      callback(payload);
    });
  },
  onMenuAction: (callback) => {
    ipcRenderer.removeAllListeners('menu:action');
    ipcRenderer.on('menu:action', (_event, payload) => callback(payload));
  },
  onUpdateStatus: (callback) => {
    ipcRenderer.removeAllListeners('update:status');
    ipcRenderer.on('update:status', (_event, payload) => callback(payload));
  },
  platform,
  homeDir,
  suggestedFolders,
});
