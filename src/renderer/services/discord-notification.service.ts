import { WebhookPayload, AlertDetails, AlertType } from '../../shared/types';

export interface INotificationService {
  sendAlert(alert: AlertDetails): Promise<boolean>;
  testConnection(): Promise<boolean>;
  setWebhookUrl(url: string): void;
}

export class DiscordNotificationService implements INotificationService {
  private webhookUrl: string = '';
  private isConfigured: boolean = false;

  setWebhookUrl(url: string): void {
    this.webhookUrl = url.trim();
    this.isConfigured = this.isValidWebhookUrl(this.webhookUrl);
  }

  private isValidWebhookUrl(url: string): boolean {
    return url.length > 0 && 
           (url.includes('discord.com/api/webhooks') || 
            url.startsWith('https://discord.com/api/webhooks'));
  }

  async sendAlert(alert: AlertDetails): Promise<boolean> {
    if (!this.isConfigured || !this.webhookUrl) {
      console.warn('Discord webhook not configured');
      return false;
    }

    const payload = this.buildPayload(alert);

    try {
      return await this.sendToDiscord(payload);
    } catch (error) {
      console.error('Failed to send Discord notification:', error);
      return false;
    }
  }

  private buildPayload(alert: AlertDetails): WebhookPayload {
    const colorMap: Record<AlertType, number> = {
      phone: 0xFF6B6B,
      sleep: 0xFFD93D,
      inactive: 0x6BCB77,
      process: 0xFF8C42,
      general: 0x4A90D9,
      start: 0x4CAF50,
      stop: 0x4A90D9,
      forced_stop: 0xF44336
    };

    return {
      embeds: [{
        title: this.getAlertTitle(alert.type),
        description: alert.message,
        color: colorMap[alert.type] || 0x4A90D9,
        timestamp: alert.timestamp.toISOString(),
        fields: [
          {
            name: 'Time',
            value: alert.timestamp.toLocaleTimeString(),
            inline: true
          },
          {
            name: 'Type',
            value: this.getTypeLabel(alert.type),
            inline: true
          }
        ]
      }]
    };
  }

  private getAlertTitle(type: AlertType): string {
    const titles: Record<AlertType, string> = {
      phone: '📱 Phone Detected!',
      sleep: '😴 Sleep Detected!',
      inactive: '⚠️ User Inactive!',
      process: '⚙️ Suspicious Process!',
      general: '⚠️ Distraction Detected!',
      start: '🎬 Surveillance Started',
      stop: '🛑 Surveillance Stopped',
      forced_stop: '💥 Surveillance Forcefully Stopped!'
    };
    return titles[type] || '⚠️ Alert';
  }

  private getTypeLabel(type: AlertType): string {
    const labels: Record<AlertType, string> = {
      phone: 'Phone Detection',
      sleep: 'Sleep Detection',
      inactive: 'Inactivity',
      process: 'Suspicious Process',
      general: 'Distraction Alert',
      start: 'Surveillance Start',
      stop: 'Surveillance Stop',
      forced_stop: 'Forced Termination'
    };
    return labels[type] || 'Alert';
  }

  private async sendToDiscord(payload: WebhookPayload): Promise<boolean> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      return response.ok;
    } catch (error) {
      console.error('Discord API error:', error);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    const testPayload: WebhookPayload = {
      embeds: [{
        title: '🔔 Test Notification',
        description: 'German Watchdog notification test successful!',
        color: 0x4CAF50,
        timestamp: new Date().toISOString(),
        fields: []
      }]
    };

    return this.sendToDiscord(testPayload);
  }

  isReady(): boolean {
    return this.isConfigured;
  }

  getWebhookUrl(): string {
    return this.webhookUrl;
  }

  dispose(): void {
    this.webhookUrl = '';
    this.isConfigured = false;
  }
}
