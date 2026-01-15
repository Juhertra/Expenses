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
