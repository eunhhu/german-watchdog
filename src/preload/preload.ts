import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  requestCameraPermission: (): Promise<{ granted: boolean }> =>
    ipcRenderer.invoke('request-camera-permission'),
  requestScreenPermission: (): Promise<{ granted: boolean }> =>
    ipcRenderer.invoke('request-screen-permission'),
  getWebhookUrl: (): Promise<string> =>
    ipcRenderer.invoke('get-webhook-url'),
  log: (message: string): Promise<boolean> =>
    ipcRenderer.invoke('log', message),
  notifyExit: (message: string): Promise<boolean> =>
    ipcRenderer.invoke('notify-exit', message)
});
