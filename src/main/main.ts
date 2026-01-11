import { app, BrowserWindow, ipcMain, screen, IpcMainInvokeEvent } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function getWebhookUrl(): string {
  // Try environment variable first
  if (process.env.DISCORD_WEBHOOK_URL) {
    return process.env.DISCORD_WEBHOOK_URL;
  }

  // Try config file
  const configPath = path.join(__dirname, '../../config.json');
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.discordWebhookUrl) {
        return config.discordWebhookUrl;
      }
    }
  } catch (e) {
    console.error('Failed to read config:', e);
  }

  return '';
}

function createWindow(): void {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    x: Math.floor((width - 1200) / 2),
    y: Math.floor((height - 800) / 2),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js')
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1a1a1a',
      symbolColor: '#ffffff',
      height: 40
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../../index.html'));
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function requestCameraPermission(): Promise<{ granted: boolean }> {
  return { granted: true };
}

async function requestScreenPermission(): Promise<{ granted: boolean }> {
  return { granted: true };
}

async function getWebhookUrlHandler(): Promise<string> {
  return getWebhookUrl();
}

async function log(_event: IpcMainInvokeEvent, message: string): Promise<boolean> {
  console.log(`[Renderer] ${message}`);
  return true;
}

async function notifyExit(_event: IpcMainInvokeEvent, message: string): Promise<boolean> {
  console.log(`[Exit Notification] ${message}`);
  const webhookUrl = getWebhookUrl();
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: '💥 Surveillance Forcefully Stopped!',
            description: message,
            color: 0xf44336,
            timestamp: new Date().toISOString(),
            fields: [
              { name: 'Time', value: new Date().toLocaleTimeString(), inline: true }
            ]
          }]
        })
      });
    } catch (e) {
      console.error('Failed to send exit notification:', e);
    }
  }
  return true;
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('request-camera-permission', requestCameraPermission);
  ipcMain.handle('request-screen-permission', requestScreenPermission);
  ipcMain.handle('get-webhook-url', getWebhookUrlHandler);
  ipcMain.handle('log', log);
  ipcMain.handle('notify-exit', notifyExit);

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
