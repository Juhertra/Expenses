/// <reference types="vite/client" />

interface ElectronAPI {
  selectDataFile: (startDir?: string) => Promise<string | null>;
  createDataFile: (payload?: { startDir?: string; initialContents?: string }) => Promise<string | null>;
  openDataFile: (startDir?: string) => Promise<string | null>;
  getDataFilePath: () => Promise<string | null>;
  readDataFile: () => Promise<string | null>;
  readDataFileState: () => Promise<{
    filePath: string | null;
    contents: string | null;
    exists: boolean;
    mtimeMs: number | null;
    readError: string | null;
  }>;
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
  exportCsvFile: (payload: { defaultPath?: string; contents?: string }) => Promise<string | null>;
  showSaveDialog: (options?: Record<string, unknown>) => Promise<{ canceled: boolean; filePath?: string }>;
  showOpenDialog: (options?: Record<string, unknown>) => Promise<{ canceled: boolean; filePaths?: string[] }>;
  checkForUpdates: () => Promise<{ started: boolean }>;
  onDataChanged: (callback: (payload: { path: string; mtimeMs: number }) => void) => void;
  onMenuAction: (callback: (payload: { action: string }) => void) => void;
  onUpdateStatus: (callback: (payload: { status: string; version?: string | null; message?: string }) => void) => void;
  platform: string;
  homeDir: string;
  suggestedFolders: Array<{ name: string; path: string }>;
}

interface Window {
  electronAPI?: ElectronAPI;
  electronTheme?: {
    getTheme: () => string;
    setTheme: (theme: string) => void;
  };
}



