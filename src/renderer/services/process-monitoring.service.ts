import { DetectionResult, DetectionSettings, ProcessInfo } from '../../shared/types';
import { BaseDetectionService } from './base-detection.service';

export class ProcessMonitoringService extends BaseDetectionService {
  private processes: ProcessInfo[] = [];
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private readonly suspiciousPatterns: string[];

  constructor(settings: DetectionSettings) {
    super(settings);
    this.suspiciousPatterns = [
      'screen recording', 'screen recorder', 'obs', 'bandicam',
      'camtasia', 'virtual camera', 'camera bypass', 'screenshot'
    ];
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

    const processes = await this.getRunningProcesses();
    this.processes = processes;

    const suspicious = this.checkSuspiciousProcesses(processes);

    const result: DetectionResult = {
      phoneDetected: false,
      sleepDetected: false,
      inactive: false,
      suspiciousProcesses: suspicious.length > 0
    };

    this.notifyResult(result);
    return result;
  }

  async getRunningProcesses(): Promise<ProcessInfo[]> {
    try {
      return this.simulateProcessDetection();
    } catch (error) {
      console.error('Process detection error:', error);
      return [];
    }
  }

  private simulateProcessDetection(): ProcessInfo[] {
    const possibleProcesses = [
      { name: 'chrome', pid: 1000 + Math.floor(Math.random() * 1000) },
      { name: 'safari', pid: 2000 + Math.floor(Math.random() * 1000) },
      { name: 'firefox', pid: 3000 + Math.floor(Math.random() * 1000) },
      { name: 'spotify', pid: 4000 + Math.floor(Math.random() * 1000) },
      { name: 'slack', pid: 5000 + Math.floor(Math.random() * 1000) },
      { name: 'discord', pid: 6000 + Math.floor(Math.random() * 1000) },
      { name: 'zoom', pid: 7000 + Math.floor(Math.random() * 1000) },
      { name: 'teams', pid: 8000 + Math.floor(Math.random() * 1000) },
      { name: 'terminal', pid: 9000 + Math.floor(Math.random() * 1000) },
      { name: 'vscode', pid: 10000 + Math.floor(Math.random() * 1000) }
    ];

    const count = Math.floor(Math.random() * 5) + 3;
    const selected: ProcessInfo[] = [];

    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * possibleProcesses.length);
      const proc = possibleProcesses[idx];
      
      if (!selected.find(p => p.name === proc.name)) {
        const isSuspicious = this.suspiciousPatterns.some(
          pattern => proc.name.toLowerCase().includes(pattern)
        );
        selected.push({
          ...proc,
          suspicious: isSuspicious
        });
      }
    }

    return selected;
  }

  private checkSuspiciousProcesses(processes: ProcessInfo[]): ProcessInfo[] {
    return processes.filter(p => p.suspicious);
  }

  startMonitoring(): void {
    this.checkInterval = setInterval(async () => {
      if (this.isActive) {
        await this.check();
      }
    }, 5000);

    this.activate();
  }

  getProcesses(): ProcessInfo[] {
    return [...this.processes];
  }

  getSuspiciousProcesses(): ProcessInfo[] {
    return this.processes.filter(p => p.suspicious);
  }

  dispose(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.processes = [];
    this.deactivate();
  }
}
