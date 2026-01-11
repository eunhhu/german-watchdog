const { contextBridge, ipcRenderer } = require('electron');

console.log('[Preload] Starting...');

contextBridge.exposeInMainWorld('electronAPI', {
  requestCameraPermission: () => ipcRenderer.invoke('request-camera-permission'),
  requestScreenPermission: () => ipcRenderer.invoke('request-screen-permission'),
  getWebhookUrl: () => ipcRenderer.invoke('get-webhook-url'),
  log: (message) => ipcRenderer.invoke('log', message),
  notifyExit: (message) => ipcRenderer.invoke('notify-exit', message),
  sendDiscordAlert: (message) => ipcRenderer.invoke('send-discord-alert', message),
  sendStartNotification: () => ipcRenderer.invoke('send-start-notification'),
  sendStopNotification: (duration) => ipcRenderer.invoke('send-stop-notification', duration)
});

console.log('[Preload] electronAPI exposed');
