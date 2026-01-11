import { DetectionResult, DetectionSettings } from '../../shared/types';
import { BaseDetectionService } from './base-detection.service';

export class SleepDetectionService extends BaseDetectionService {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private lastSleepDetected: boolean = false;
  private consecutiveSleepFrames: number = 0;
  private readonly sleepDetectionThreshold: number = 5;
  private eyeOpenHistory: number[] = [];

  constructor(settings: DetectionSettings) {
    super(settings);
    this.sleepDetectionThreshold = Math.round(settings.sleepDetectionThreshold * 10);
  }

  async check(): Promise<DetectionResult> {
    if (!this.isActive) {
      return {
        phoneDetected: false,
        sleepDetected: false,
        inactive: false,
        suspiciousProcesses: false
      };
    }

    const sleepDetected = await this.detectSleep();

    const result: DetectionResult = {
      phoneDetected: false,
      sleepDetected,
      inactive: false,
      suspiciousProcesses: false
    };

    this.notifyResult(result);
    return result;
  }

  private async detectSleep(): Promise<boolean> {
    try {
      if (!this.stream) {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false
        });
      }

      const sleepScore = await this.analyzeFrameForSleep();

      this.eyeOpenHistory.push(sleepScore);
      if (this.eyeOpenHistory.length > 30) {
        this.eyeOpenHistory.shift();
      }

      const avgEyeOpenness = this.eyeOpenHistory.reduce((a, b) => a + b, 0) / this.eyeOpenHistory.length;

      if (avgEyeOpenness < 0.3) {
        this.consecutiveSleepFrames++;
      } else {
        this.consecutiveSleepFrames = Math.max(0, this.consecutiveSleepFrames - 1);
      }

      const stableDetection = this.consecutiveSleepFrames >= this.sleepDetectionThreshold;
      this.lastSleepDetected = stableDetection;

      return stableDetection;
    } catch (error) {
      console.error('Sleep detection error:', error);
      return this.lastSleepDetected;
    }
  }

  private async analyzeFrameForSleep(): Promise<number> {
    if (!this.stream) return 0.5;

    if (!this.videoElement) {
      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.stream;
      this.videoElement.playsInline = true;
      this.videoElement.autoplay = true;
      this.videoElement.muted = true;
      await this.videoElement.play().catch(() => {});
    }

    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 160;
      this.canvas.height = 120;
      this.context = this.canvas.getContext('2d');
    }

    const video = this.videoElement;
    if (video.readyState < 2) {
      await new Promise<void>(resolve => {
        video.addEventListener('loadeddata', () => resolve(), { once: true });
      });
    }

    if (this.context && video.readyState >= 2) {
      this.context.drawImage(video, 0, 0, 160, 120);
      return this.detectFaceAndEyes();
    }

    return this.simulateSleepDetection();
  }

  private detectFaceAndEyes(): number {
    if (!this.context) return 0.5;

    try {
      const imageData = this.context.getImageData(0, 0, 160, 120);
      const data = imageData.data;

      const skinRegions = this.detectSkinTone(data);
      const brightnessVariance = this.calculateBrightnessVariance(data);

      if (skinRegions.length < 3) return 0.2;

      let totalEyeOpenness = 0;
      let faceCount = 0;

      for (const region of skinRegions) {
        if (region.width > 30 && region.height > 40) {
          const eyeOpenness = this.detectEyesInRegion(data, region);
          totalEyeOpenness += eyeOpenness;
          faceCount++;
        }
      }

      if (faceCount === 0) return 0.3;

      const avgEyeOpenness = totalEyeOpenness / faceCount;

      const headStillnessScore = Math.min(1, brightnessVariance / 50);
      const sleepScore = (1 - avgEyeOpenness) * 0.6 + (1 - headStillnessScore) * 0.4;

      return 1 - sleepScore;
    } catch {
      return 0.5;
    }
  }

  private detectSkinTone(data: Uint8ClampedArray): { x: number; y: number; width: number; height: number }[] {
    const regions: { x: number; y: number; width: number; height: number }[] = [];
    const width = 160;
    const height = 120;

    for (let y = 10; y < height - 10; y += 20) {
      for (let x = 10; x < width - 10; x += 20) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        const isSkin = r > 95 && g > 40 && b > 20 &&
                      r > g && r > b &&
                      Math.abs(r - g) > 15 &&
                      (r - b) > 15;

        if (isSkin) {
          let found = false;
          for (const region of regions) {
            if (Math.abs(region.x - x) < 25 && Math.abs(region.y - y) < 25) {
              region.x = Math.min(region.x, x);
              region.y = Math.min(region.y, y);
              region.width = Math.max(region.x + region.width, x) - region.x;
              region.height = Math.max(region.y + region.height, y) - region.y;
              found = true;
              break;
            }
          }
          if (!found) {
            regions.push({ x, y, width: 15, height: 15 });
          }
        }
      }
    }

    return regions;
  }

  private detectEyesInRegion(data: Uint8ClampedArray, region: { x: number; y: number; width: number; height: number }): number {
    const width = 160;
    const startY = region.y + region.height * 0.25;
    const endY = region.y + region.height * 0.55;
    const startX = region.x + region.width * 0.2;
    const endX = region.x + region.width * 0.8;

    let darkPixels = 0;
    let totalPixels = 0;

    for (let y = Math.floor(startY); y < Math.floor(endY); y++) {
      for (let x = Math.floor(startX); x < Math.floor(endX); x++) {
        const idx = (y * width + x) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        if (brightness < 100) {
          darkPixels++;
        }
        totalPixels++;
      }
    }

    const darkRatio = darkPixels / totalPixels;
    return Math.min(1, darkRatio * 3);
  }

  private calculateBrightnessVariance(data: Uint8ClampedArray): number {
    const brightness: number[] = [];
    const step = 4;

    for (let i = 0; i < data.length; i += step * 4) {
      brightness.push((data[i] + data[i + 1] + data[i + 2]) / 3);
    }

    const mean = brightness.reduce((a, b) => a + b, 0) / brightness.length;
    const variance = brightness.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / brightness.length;

    return Math.sqrt(variance);
  }

  private simulateSleepDetection(): number {
    const random = Math.random();
    const threshold = 0.08;
    return random < threshold ? random * 0.4 : random * 0.6 + 0.3;
  }

  async startCamera(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false
      });
      this.activate();
    } catch (error) {
      console.error('Failed to start camera for sleep detection:', error);
      throw error;
    }
  }

  dispose(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.videoElement = null;
    this.canvas = null;
    this.context = null;
    this.eyeOpenHistory = [];
    this.deactivate();
  }
}
