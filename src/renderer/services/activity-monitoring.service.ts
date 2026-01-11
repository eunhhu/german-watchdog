import { DetectionResult, DetectionSettings, UserActivity } from '../../shared/types';
import { BaseDetectionService } from './base-detection.service';

export class ActivityMonitoringService extends BaseDetectionService {
  private activityInfo: UserActivity;
  private activityListeners: Set<string>;
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  constructor(settings: DetectionSettings) {
    super(settings);
    this.activityInfo = {
      lastActivity: Date.now(),
      isInactive: false,
      inactiveDuration: 0
    };
    this.activityListeners = new Set([
      'mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'
    ]);
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

    const inactiveTime = Date.now() - this.activityInfo.lastActivity;
    this.activityInfo.inactiveDuration = inactiveTime;
    this.activityInfo.isInactive = inactiveTime > this.settings.inactivityThreshold;

    const result: DetectionResult = {
      phoneDetected: false,
      sleepDetected: false,
      inactive: this.activityInfo.isInactive,
      suspiciousProcesses: false
    };

    this.notifyResult(result);
    return result;
  }

  startMonitoring(): void {
    this.activityListeners.forEach(eventType => {
      document.addEventListener(eventType, this.handleActivity.bind(this), { passive: true });
    });

    this.checkInterval = setInterval(() => {
      if (this.isActive) {
        this.check();
      }
    }, 1000);

    this.activate();
  }

  private handleActivity(): void {
    this.activityInfo.lastActivity = Date.now();
    this.activityInfo.isInactive = false;
  }

  getActivityInfo(): UserActivity {
    return { ...this.activityInfo };
  }

  dispose(): void {
    this.activityListeners.forEach(eventType => {
      document.removeEventListener(eventType, this.handleActivity.bind(this));
    });

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.deactivate();
  }
}
