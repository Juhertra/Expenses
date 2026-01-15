/// <reference types="vite/client" />

interface ElectronAPI {
  selectDataFile: (startDir?: string) => Promise<string | null>;
  getDataFilePath: () => Promise<string | null>;
  readDataFile: () => Promise<string | null>;
  writeDataFile: (contents: string) => Promise<string | void>;
  saveAsDataFile: () => Promise<string | null>;
  revealDataFile: () => Promise<string | null>;
  getAppInfo: () => Promise<{
    appVersion: string;
    schemaVersion: number;
    dataFilePath: string | null;
    dataFileLastModified: string | null;
    userDataPath: string | null;
  }>;
  importDataFile: () => Promise<{ filePath: string; contents: string } | null>;
  exportCsvFile: (payload: { defaultPath?: string; contents: string }) => Promise<string | null>;
  onDataChanged: (callback: (payload: { path: string; mtimeMs: number }) => void) => void;
  onMenuAction: (callback: (payload: { action: string }) => void) => void;
  platform: string;
  homeDir: string;
  suggestedFolders: Record<string, string>;
}

interface Window {
  electronAPI?: ElectronAPI;
}

