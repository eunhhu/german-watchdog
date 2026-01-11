import { DetectionSettings } from '../../shared/types';

export class ScreenMonitoringService {
  private stream: MediaStream | null = null;
  private isActive: boolean = false;
  private onStreamEnded?: () => void;
  private readonly settings: DetectionSettings;
  private fallbackMode: boolean = true;

  constructor(settings: DetectionSettings) {
    this.settings = settings;
  }

  async startMonitoring(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          displaySurface: 'monitor',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      this.stream.getVideoTracks()[0].onended = () => {
        this.handleStreamEnded();
      };

      this.isActive = true;
      this.fallbackMode = false;
      return true;
    } catch (error) {
      console.warn('Screen recording not available, using camera-only mode:', error);
      this.isActive = true;
      this.fallbackMode = true;
      return true;
    }
  }

  isUsingFallback(): boolean {
    return this.fallbackMode;
  }

  private handleStreamEnded(): void {
    if (!this.fallbackMode) {
      this.isActive = false;
      if (this.onStreamEnded) {
        this.onStreamEnded();
      }
    }
  }

  setOnStreamEnded(callback: () => void): void {
    this.onStreamEnded = callback;
  }

  isRunning(): boolean {
    return this.isActive;
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.isActive = false;
  }

  dispose(): void {
    this.stop();
  }
}
