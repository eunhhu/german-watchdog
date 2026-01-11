import { DetectionResult, DetectionSettings } from '../../shared/types';
import { BaseDetectionService } from './base-detection.service';

export class PhoneDetectionService extends BaseDetectionService {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private lastPhoneDetected: boolean = false;
  private consecutivePhoneFrames: number = 0;
  private readonly phoneDetectionThreshold: number = 3;

  constructor(settings: DetectionSettings) {
    super(settings);
    this.phoneDetectionThreshold = Math.round(settings.phoneDetectionThreshold * 10);
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

    const phoneDetected = await this.detectPhoneInFrame();

    const result: DetectionResult = {
      phoneDetected,
      sleepDetected: false,
      inactive: false,
      suspiciousProcesses: false
    };

    this.notifyResult(result);
    return result;
  }

  private async detectPhoneInFrame(): Promise<boolean> {
    try {
      if (!this.stream) {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false
        });
      }

      const hasPhone = await this.analyzeFrameForPhone();

      if (hasPhone) {
        this.consecutivePhoneFrames++;
      } else {
        this.consecutivePhoneFrames = Math.max(0, this.consecutivePhoneFrames - 1);
      }

      const stableDetection = this.consecutivePhoneFrames >= this.phoneDetectionThreshold;
      this.lastPhoneDetected = stableDetection;

      return stableDetection;
    } catch (error) {
      console.error('Phone detection error:', error);
      return this.lastPhoneDetected;
    }
  }

  private async analyzeFrameForPhone(): Promise<number> {
    if (!this.stream) return 0;

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
      this.canvas.width = 320;
      this.canvas.height = 240;
      this.context = this.canvas.getContext('2d');
    }

    const video = this.videoElement;
    if (video.readyState < 2) {
      await new Promise<void>(resolve => {
        video.addEventListener('loadeddata', () => resolve(), { once: true });
      });
    }

    if (this.context && video.readyState >= 2) {
      this.context.drawImage(video, 0, 0, 320, 240);
      return this.detectPhoneShape();
    }

    return this.simulatePhoneDetection();
  }

  private detectPhoneShape(): number {
    if (!this.context) return 0;

    try {
      const imageData = this.context.getImageData(0, 0, 320, 240);
      const data = imageData.data;

      let brightPixels = 0;
      let darkPixels = 0;
      let edgeCount = 0;
      const prevRow = new Array(320).fill(0);

      for (let y = 1; y < 240 - 1; y++) {
        for (let x = 1; x < 320 - 1; x++) {
          const idx = (y * 320 + x) * 4;
          const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          
          if (gray > 200) brightPixels++;
          if (gray < 50) darkPixels++;

          const prevGray = (data[idx - 4] + data[idx - 3] + data[idx - 2]) / 3;
          if (Math.abs(gray - prevGray) > 50) {
            edgeCount++;
            if (prevRow[x] > 0) {
              const cornerScore = this.calculateCornerScore(data, y, x);
              if (cornerScore > 20) return 0.9;
            }
            prevRow[x] = 1;
          } else {
            prevRow[x] = 0;
          }
        }
      }

      const totalPixels = 320 * 240;
      const brightRatio = brightPixels / totalPixels;
      const edgeRatio = edgeCount / totalPixels;

      const phoneScore = (brightRatio > 0.15 ? 0.4 : 0) + 
                        (edgeRatio > 0.08 ? 0.3 : 0) + 
                        (edgeRatio < 0.3 ? 0.3 : 0);
      return phoneScore;
    } catch {
      return 0;
    }
  }

  private calculateCornerScore(data: Uint8ClampedArray, y: number, x: number): number {
    let score = 0;
    const idx = (y * 320 + x) * 4;
    const neighbors = [-4, 4, -320, 320, -324, -316, 316, 324];
    
    for (const offset of neighbors) {
      const nIdx = idx + offset;
      if (nIdx >= 0 && nIdx < data.length) {
        const gray = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3;
        const centerGray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        if (Math.abs(gray - centerGray) > 80) score++;
      }
    }
    return score;
  }

  private simulatePhoneDetection(): number {
    const random = Math.random();
    const threshold = 0.1;
    return random < threshold ? random + 0.7 : random * 0.2;
  }

  async startCamera(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false
      });
      this.activate();
    } catch (error) {
      console.error('Failed to start camera:', error);
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
    this.deactivate();
  }
}
