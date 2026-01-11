import { app, BrowserWindow, ipcMain, screen, IpcMainInvokeEvent } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file manually
function loadEnv(): void {
  const envPath = path.join(__dirname, '../../.env');
  console.log('Loading .env from:', envPath);
  
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    console.log('.env content length:', content.length);
    
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim();
          console.log(`Set ${key.trim()}=${valueParts.join('=').trim().substring(0, 20)}...`);
        }
      }
    });
  } else {
    console.log('.env file not found at:', envPath);
  }
}

loadEnv();

let mainWindow: BrowserWindow | null = null;

function getWebhookUrl(): string {
  const envUrl = process.env.DISCORD_WEBHOOK_URL;
  if (envUrl) {
    return envUrl;
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
    return sendDiscordNotification(webhookUrl, {
      title: '💥 감시 강제 종료!',
      description: message,
      color: 0xf44336
    });
  }
  return false;
}

async function sendDiscordAlert(_event: IpcMainInvokeEvent, message: string): Promise<boolean> {
  console.log(`[Discord Alert] ${message}`);
  const webhookUrl = getWebhookUrl();
  if (webhookUrl) {
    return sendDiscordNotification(webhookUrl, {
      title: '⚠️ 산만함 감지!',
      description: message,
      color: 0xff6b6b
    });
  }
  return false;
}

async function sendStartNotification(_event: IpcMainInvokeEvent): Promise<boolean> {
  const webhookUrl = getWebhookUrl();
  if (webhookUrl) {
    return sendDiscordNotification(webhookUrl, {
      title: '🎬 감시 시작됨',
      description: '감시 모니터링이 시작되었습니다',
      color: 0x4caf50
    });
  }
  return false;
}

async function sendStopNotification(_event: IpcMainInvokeEvent, duration: number): Promise<boolean> {
  const webhookUrl = getWebhookUrl();
  if (webhookUrl) {
    return sendDiscordNotification(webhookUrl, {
      title: '🛑 감시 종료됨',
      description: `감시가 ${duration}초 동안 실행되었습니다`,
      color: 0x4a90d9
    });
  }
  return false;
}

interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
}

function sendDiscordNotification(webhookUrl: string, embed: DiscordEmbed): Promise<boolean> {
  return new Promise((resolve) => {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          ...embed,
          timestamp: new Date().toISOString(),
          fields: [
            { name: '시각', value: new Date().toLocaleTimeString(), inline: true }
          ]
        }]
      })
    }).then(response => {
      resolve(response.ok);
    }).catch(error => {
      console.error('Discord notification failed:', error);
      resolve(false);
    });
  });
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('request-camera-permission', requestCameraPermission);
  ipcMain.handle('request-screen-permission', requestScreenPermission);
  ipcMain.handle('get-webhook-url', getWebhookUrlHandler);
  ipcMain.handle('log', log);
  ipcMain.handle('notify-exit', notifyExit);
  ipcMain.handle('send-discord-alert', sendDiscordAlert);
  ipcMain.handle('send-start-notification', sendStartNotification);
  ipcMain.handle('send-stop-notification', sendStopNotification);

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
