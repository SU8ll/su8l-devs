const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopNotify', (title, body) =>
  ipcRenderer.invoke('notify', { title, body })
);
