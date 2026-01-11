import {
  DetectionResult,
  DetectionSettings,
  ProcessInfo
} from '../../shared/types';

export interface IDetectionService {
  check(): Promise<DetectionResult>;
  dispose(): void;
}

export abstract class BaseDetectionService implements IDetectionService {
  protected isActive: boolean = false;
  protected settings: DetectionSettings;
  protected onResult?: (result: DetectionResult) => void;

  constructor(settings: DetectionSettings) {
    this.settings = settings;
  }

  abstract check(): Promise<DetectionResult>;
  abstract dispose(): void;

  public activate(): void {
    this.isActive = true;
  }

  public deactivate(): void {
    this.isActive = false;
  }

  public isRunning(): boolean {
    return this.isActive;
  }

  public setOnResult(callback: (result: DetectionResult) => void): void {
    this.onResult = callback;
  }

  protected notifyResult(result: DetectionResult): void {
    if (this.onResult && this.isActive) {
      this.onResult(result);
    }
  }
}
