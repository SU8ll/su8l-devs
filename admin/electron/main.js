const { app, BrowserWindow, shell, ipcMain, session, Notification } = require('electron');
const path = require('path');

// Required for Windows toast notifications to actually be delivered.
app.setAppUserModelId('eu.su8ldevs.admin');

function registerNotificationIpc() {
  ipcMain.handle('notify', (_event, payload) => {
    try {
      const { title, body } = payload || {};
      if (!Notification.isSupported()) return { shown: false };
      const n = new Notification({
        title: String(title || 'SU8L Admin'),
        body: String(body || ''),
        icon: path.join(__dirname, '..', 'renderer', 'logo.png'),
        silent: true,
      });
      n.on('click', () => {
        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
          if (win.isMinimized()) win.restore();
          win.focus();
        }
      });
      n.show();
      return { shown: true };
    } catch {
      return { shown: false };
    }
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 620,
    backgroundColor: '#0f0f12',
    title: 'SU8L DEVs - Admin Panel',
    icon: path.join(__dirname, '..', 'renderer', 'logo.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // The panel calls the public HTTPS API directly; CORS is disabled for
      // desktop clients so the file:// renderer can talk to it.
      webSecurity: false,
    },
  });

  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'notifications');
  });
  registerNotificationIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
