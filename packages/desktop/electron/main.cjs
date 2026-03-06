const { app, BrowserWindow, ipcMain, dialog, shell, Menu, session } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');

// Content Security Policy
const CSP_PRODUCTION = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // Tailwind needs inline styles
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

const CSP_DEVELOPMENT = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' http://localhost:*", // Vite HMR
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: http://localhost:*",
  "font-src 'self' http://localhost:*",
  "connect-src 'self' http://localhost:* ws://localhost:*", // Vite WebSocket
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

const CONFIG_FILE = 'config.json';
const DEFAULT_DATA_FILE = 'expense-tracker.json';
const SCHEMA_VERSION = 1;

let mainWindow;
let watchedPath = null;
let watchHandler = null;
let autoUpdaterInstance = null;

const sendMenuAction = (action) => {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length === 0 && mainWindow) {
    mainWindow.webContents.send('menu:action', { action });
    return;
  }
  windows.forEach((win) => {
    win.webContents.send('menu:action', { action });
  });
};

const broadcastToWindows = (channel, payload) => {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length === 0 && mainWindow) {
    mainWindow.webContents.send(channel, payload);
    return;
  }
  windows.forEach((win) => {
    win.webContents.send(channel, payload);
  });
};

const getConfigPath = () => path.join(app.getPath('userData'), CONFIG_FILE);

const readConfig = async () => {
  try {
    const contents = await fs.readFile(getConfigPath(), 'utf-8');
    return JSON.parse(contents);
  } catch (error) {
    return {};
  }
};

const writeConfig = async (config) => {
  const data = JSON.stringify(config, null, 2);
  await fs.writeFile(getConfigPath(), data, 'utf-8');
};

const getDefaultDataPath = () =>
  path.join(app.getPath('userData'), DEFAULT_DATA_FILE);

const resolveDataFilePath = async (createDefault = true) => {
  const config = await readConfig();
  if (config.dataFilePath) {
    return config.dataFilePath;
  }
  if (!createDefault) {
    return null;
  }
  const defaultPath = getDefaultDataPath();
  config.dataFilePath = defaultPath;
  await writeConfig(config);
  return defaultPath;
};

const configureDataFilePath = async (filePath) => {
  const config = await readConfig();
  config.dataFilePath = filePath;
  await writeConfig(config);
  watchDataFile(filePath);
  return filePath;
};

const selectDataFile = async (startDir) => {
  const baseDir = startDir || app.getPath('documents');
  const defaultPath = path.join(baseDir, DEFAULT_DATA_FILE);
  const result = await dialog.showSaveDialog({
    title: 'Select data file location',
    defaultPath,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  return configureDataFilePath(result.filePath);
};

const openDataFile = async (startDir) => {
  const baseDir = startDir || app.getPath('documents');
  const result = await dialog.showOpenDialog({
    title: 'Open data file',
    defaultPath: baseDir,
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });

  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }

  return configureDataFilePath(result.filePaths[0]);
};

const readDataFile = async () => {
  const filePath = await resolveDataFilePath(false);
  if (!filePath || !fsSync.existsSync(filePath)) {
    return null;
  }
  return fs.readFile(filePath, 'utf-8');
};

const readDataFileState = async () => {
  const filePath = await resolveDataFilePath(false);
  if (!filePath) {
    return {
      filePath: null,
      contents: null,
      exists: false,
      mtimeMs: null,
      readError: null,
    };
  }

  const exists = fsSync.existsSync(filePath);
  if (!exists) {
    return {
      filePath,
      contents: null,
      exists: false,
      mtimeMs: null,
      readError: null,
    };
  }

  try {
    const [contents, stats] = await Promise.all([
      fs.readFile(filePath, 'utf-8'),
      fs.stat(filePath),
    ]);
    return {
      filePath,
      contents,
      exists: true,
      mtimeMs: stats.mtimeMs,
      readError: null,
    };
  } catch (error) {
    return {
      filePath,
      contents: null,
      exists: true,
      mtimeMs: null,
      readError: error instanceof Error ? error.message : 'Failed to read data file',
    };
  }
};

const atomicWrite = async (filePath, contents) => {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmpPath = `${filePath}.tmp`;
  const bakPath = `${filePath}.bak`;

  // Write new contents to tmp file first
  await fs.writeFile(tmpPath, contents, 'utf-8');

  const originalExists = fsSync.existsSync(filePath);
  let movedOriginalToBackup = false;

  try {
    if (originalExists) {
      if (fsSync.existsSync(bakPath)) {
        await fs.unlink(bakPath);
      }
      // Move original to backup first, preserving recoverability.
      await fs.rename(filePath, bakPath);
      movedOriginalToBackup = true;
    }

    try {
      await fs.rename(tmpPath, filePath);
    } catch (renameErr) {
      if (fsSync.existsSync(filePath)) {
        await fs.unlink(filePath);
        await fs.rename(tmpPath, filePath);
      } else {
        throw renameErr;
      }
    }

    if (movedOriginalToBackup && fsSync.existsSync(bakPath)) {
      await fs.unlink(bakPath);
    }
  } catch (error) {
    if (fsSync.existsSync(tmpPath)) {
      await fs.unlink(tmpPath).catch(() => {});
    }

    // Rollback: restore from backup if write failed after moving the original.
    if (movedOriginalToBackup && fsSync.existsSync(bakPath) && !fsSync.existsSync(filePath)) {
      await fs.rename(bakPath, filePath).catch(() => {});
    }

    throw error;
  }
};
const writeDataFile = async (contents, targetPath, expectedMtimeMs = null) => {
  const filePath = targetPath || (await resolveDataFilePath(false));
  if (!filePath) {
    throw new Error('No data file path configured. Please select a location first.');
  }

  // Validate contents before writing
  if (!contents || typeof contents !== 'string') {
    throw new Error('Invalid contents: must be a non-empty string');
  }

  try {
    const parsed = JSON.parse(contents);
    // Validate schema version
    if (!parsed.schemaVersion || typeof parsed.schemaVersion !== 'number') {
      throw new Error('Invalid data: missing or invalid schemaVersion');
    }
    if (parsed.schemaVersion > SCHEMA_VERSION) {
      console.warn(`Writing data with newer schema version ${parsed.schemaVersion}`);
    }
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error('Invalid contents: not valid JSON');
    }
    throw err;
  }

  const fileExists = fsSync.existsSync(filePath);
  if (fileExists) {
    const currentStats = await fs.stat(filePath);
    if (expectedMtimeMs === null || expectedMtimeMs === undefined) {
      const conflictError = new Error('Shared data file changed and must be reloaded before saving.');
      conflictError.code = 'DATA_FILE_CONFLICT';
      throw conflictError;
    }
    if (Math.abs(currentStats.mtimeMs - Number(expectedMtimeMs)) > 1) {
      const conflictError = new Error('Shared data file changed on another device. Reload before saving.');
      conflictError.code = 'DATA_FILE_CONFLICT';
      conflictError.currentMtimeMs = currentStats.mtimeMs;
      conflictError.expectedMtimeMs = Number(expectedMtimeMs);
      throw conflictError;
    }
  } else if (expectedMtimeMs !== null && expectedMtimeMs !== undefined) {
    const conflictError = new Error('Shared data file was removed or moved. Reload before saving.');
    conflictError.code = 'DATA_FILE_CONFLICT';
    throw conflictError;
  }

  await atomicWrite(filePath, contents);
  const writtenStats = await fs.stat(filePath);
  watchDataFile(filePath);
  return { filePath, mtimeMs: writtenStats.mtimeMs };
};

const watchDataFile = (filePath) => {
  if (!filePath) return;
  if (watchHandler && watchedPath) {
    fsSync.unwatchFile(watchedPath, watchHandler);
  }

  watchHandler = (curr, prev) => {
    if (curr.mtimeMs !== prev.mtimeMs && mainWindow) {
      mainWindow.webContents.send('data:changed', {
        path: filePath,
        mtimeMs: curr.mtimeMs,
      });
    }
  };

  fsSync.watchFile(filePath, { interval: 1000 }, watchHandler);
  watchedPath = filePath;
};

const saveAsDataFile = async () => {
  const defaultPath = path.join(app.getPath('documents'), DEFAULT_DATA_FILE);
  const result = await dialog.showSaveDialog({
    title: 'Save data file as',
    defaultPath,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  return configureDataFilePath(result.filePath);
};

const createDataFile = async (startDir, initialContents) => {
  const baseDir = startDir || app.getPath('documents');
  const defaultPath = path.join(baseDir, DEFAULT_DATA_FILE);
  const result = await dialog.showSaveDialog({
    title: 'Create shared data file',
    defaultPath,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  await configureDataFilePath(result.filePath);
  if (initialContents) {
    await writeDataFile(initialContents, result.filePath, null);
  }
  return result.filePath;
};

const setupAutoUpdater = () => {
  if (!app.isPackaged || autoUpdaterInstance) {
    return autoUpdaterInstance;
  }

  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.logger = console;

    autoUpdater.on('checking-for-update', () => {
      broadcastToWindows('update:status', { status: 'checking' });
    });

    autoUpdater.on('update-available', (info) => {
      broadcastToWindows('update:status', {
        status: 'available',
        version: info?.version || null,
      });
    });

    autoUpdater.on('update-not-available', (info) => {
      broadcastToWindows('update:status', {
        status: 'not-available',
        version: info?.version || null,
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      broadcastToWindows('update:status', {
        status: 'downloaded',
        version: info?.version || null,
      });
      // The in-app modal in the renderer handles the "Restart now / Not now" prompt.
    });

    autoUpdater.on('error', (error) => {
      broadcastToWindows('update:status', {
        status: 'error',
        message: error instanceof Error ? error.message : 'Update check failed',
      });
    });

    autoUpdaterInstance = autoUpdater;
    return autoUpdaterInstance;
  } catch (error) {
    broadcastToWindows('update:status', {
      status: 'error',
      message: error instanceof Error ? error.message : 'Updater unavailable',
    });
    return null;
  }
};

const checkForUpdates = async () => {
  const autoUpdater = setupAutoUpdater();
  if (!autoUpdater) {
    return { started: false };
  }

  await autoUpdater.checkForUpdates();
  return { started: true };
};

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  mainWindow.setMenuBarVisibility(true);

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  if (!app.isPackaged) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  resolveDataFilePath(false).then((pathValue) => {
    if (pathValue) {
      watchDataFile(pathValue);
    }
  });
};

const buildMenu = () => {
  const template = [
    ...(process.platform === 'darwin'
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about', label: 'About', click: () => sendMenuAction('open-settings') },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        { label: 'New', accelerator: 'CmdOrCtrl+N', click: () => sendMenuAction('new-file') },
        { label: 'Open...', accelerator: 'CmdOrCtrl+O', click: () => sendMenuAction('open-file') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => sendMenuAction('save') },
        { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => sendMenuAction('save-as') },
        { type: 'separator' },
        { label: 'Export Backup...', accelerator: 'CmdOrCtrl+E', click: () => sendMenuAction('export') },
        { label: 'Import Backup...', accelerator: 'CmdOrCtrl+I', click: () => sendMenuAction('import') },
        { type: 'separator' },
        { label: 'Reveal Data File', accelerator: 'CmdOrCtrl+R', click: () => sendMenuAction('reveal') },
        ...(process.platform === 'darwin' ? [] : [{ type: 'separator' }, { role: 'quit' }]),
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => sendMenuAction('open-settings') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Check for Updates', click: () => sendMenuAction('check-for-updates') },
        { label: 'Keyboard Shortcuts', accelerator: 'CmdOrCtrl+/', click: () => sendMenuAction('show-shortcuts') },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

app.whenReady().then(() => {
  // Apply Content Security Policy
  const csp = app.isPackaged ? CSP_PRODUCTION : CSP_DEVELOPMENT;
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });

  createWindow();
  buildMenu();

  if (app.isPackaged) {
    checkForUpdates().catch((error) => {
      broadcastToWindows('update:status', {
        status: 'error',
        message: error instanceof Error ? error.message : 'Update check failed',
      });
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('data:select', async (_event, startDir) => selectDataFile(startDir));
ipcMain.handle('data:open', async (_event, startDir) => openDataFile(startDir));
ipcMain.handle('data:create', async (_event, payload) =>
  createDataFile(payload?.startDir, payload?.initialContents || null)
);
ipcMain.handle('data:path', async () => resolveDataFilePath(false));
ipcMain.handle('data:read', async () => readDataFile());
ipcMain.handle('data:readState', async () => readDataFileState());
ipcMain.handle('data:write', async (_event, payloadOrContents) => {
  if (typeof payloadOrContents === 'string') {
    return writeDataFile(payloadOrContents);
  }
  const payload = payloadOrContents || {};
  return writeDataFile(payload.contents, payload.targetPath, payload.expectedMtimeMs ?? null);
});
ipcMain.handle('data:saveAs', async () => saveAsDataFile());
ipcMain.handle('data:reveal', async () => {
  const filePath = await resolveDataFilePath(false);
  if (filePath) {
    await shell.showItemInFolder(filePath);
  }
  return filePath;
});
// Generic open/save dialogs for renderer use
ipcMain.handle('dialog:showSaveDialog', async (_event, options) => {
  return dialog.showSaveDialog(options || {});
});
ipcMain.handle('dialog:showOpenDialog', async (_event, options) => {
  return dialog.showOpenDialog(options || {});
});
ipcMain.handle('data:import', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Import backup file',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });

  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const contents = await fs.readFile(filePath, 'utf-8');
  return { filePath, contents };
});
ipcMain.handle('data:exportCsv', async (_event, payload) => {
  const { defaultPath, contents } = payload || {};
  const result = await dialog.showSaveDialog({
    title: 'Export CSV',
    defaultPath: defaultPath || path.join(app.getPath('documents'), 'expenses.csv'),
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  await fs.writeFile(result.filePath, contents || '', 'utf-8');
  return result.filePath;
});
ipcMain.handle('app:info', async () => {
  const filePath = await resolveDataFilePath(false);
  let lastModified = null;
  if (filePath && fsSync.existsSync(filePath)) {
    try {
      const stats = fsSync.statSync(filePath);
      lastModified = stats.mtime.toISOString();
    } catch (error) {
      lastModified = null;
    }
  }
  return {
    appVersion: app.getVersion(),
    schemaVersion: SCHEMA_VERSION,
    dataFilePath: filePath || null,
    dataFileLastModified: lastModified,
    userDataPath: app.getPath('userData'),
  };
});
ipcMain.handle('app:checkForUpdates', async () => checkForUpdates());
ipcMain.handle('app:installUpdate', () => {
  const updater = autoUpdaterInstance;
  if (updater) updater.quitAndInstall();
});
ipcMain.handle('app:deferUpdate', (_event, shouldAutoInstall) => {
  const updater = autoUpdaterInstance;
  if (updater) updater.autoInstallOnAppQuit = shouldAutoInstall;
});


