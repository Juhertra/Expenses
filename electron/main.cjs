const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');

const CONFIG_FILE = 'config.json';
const DEFAULT_DATA_FILE = 'expense-tracker.json';
const SCHEMA_VERSION = 1;

let mainWindow;
let watchedPath = null;
let watchHandler = null;

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

  const config = await readConfig();
  config.dataFilePath = result.filePath;
  await writeConfig(config);
  watchDataFile(result.filePath);
  return result.filePath;
};

const readDataFile = async () => {
  const filePath = await resolveDataFilePath(false);
  if (!filePath || !fsSync.existsSync(filePath)) {
    return null;
  }
  return fs.readFile(filePath, 'utf-8');
};

const atomicWrite = async (filePath, contents) => {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmpPath = `${filePath}.tmp`;
  const bakPath = `${filePath}.bak`;

  await fs.writeFile(tmpPath, contents, 'utf-8');

  if (fsSync.existsSync(filePath)) {
    try {
      await fs.copyFile(filePath, bakPath);
    } catch (error) {
      // Ignore backup errors to avoid blocking save.
    }
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore if file already moved/removed.
    }
  }

  await fs.rename(tmpPath, filePath);
};

const writeDataFile = async (contents, targetPath) => {
  const filePath = targetPath || (await resolveDataFilePath(true));
  await atomicWrite(filePath, contents);
  watchDataFile(filePath);
  return filePath;
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

  const config = await readConfig();
  config.dataFilePath = result.filePath;
  await writeConfig(config);
  watchDataFile(result.filePath);
  return result.filePath;
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
        { label: 'Keyboard Shortcuts', accelerator: 'CmdOrCtrl+/', click: () => sendMenuAction('show-shortcuts') },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

app.whenReady().then(() => {
  createWindow();
  buildMenu();

  if (app.isPackaged) {
    try {
      // eslint-disable-next-line global-require
      const { autoUpdater } = require('electron-updater');
      autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    } catch (error) {
      // Ignore auto-update errors in environments without updater support.
    }
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
ipcMain.handle('data:path', async () => resolveDataFilePath(false));
ipcMain.handle('data:read', async () => readDataFile());
ipcMain.handle('data:write', async (_event, contents) => writeDataFile(contents));
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
