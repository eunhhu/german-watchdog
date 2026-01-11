import {
  DetectionResult,
  DetectionSettings,
  DetectionState,
  CardStatus
} from '../shared/types';
import {
  PhoneDetectionService,
  SleepDetectionService,
  ActivityMonitoringService,
  ProcessMonitoringService,
  ScreenMonitoringService
} from './services';

interface RecordingState {
  isRecording: boolean;
  duration: number;
  mediaRecorder: MediaRecorder | null;
  chunks: Blob[];
}

export class GermanWatchdog {
  private isRunning: boolean = false;
  private surveillanceStartTime: number | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private checkTimeout: ReturnType<typeof setTimeout> | null = null;
  private snoozeUntil: number | null = null;
  private consecutiveDetections: number = 0;
  private recordingState: RecordingState;

  private states: DetectionState;
  private settings: DetectionSettings;
  private lastDistractionTime: number = 0;

  private phoneService: PhoneDetectionService;
  private sleepService: SleepDetectionService;
  private activityService: ActivityMonitoringService;
  private processService: ProcessMonitoringService;
  private screenService: ScreenMonitoringService;

  constructor() {
    this.settings = {
      checkIntervalMin: 5000,
      checkIntervalMax: 15000,
      phoneDetectionThreshold: 0.7,
      sleepDetectionThreshold: 0.6,
      inactivityThreshold: 30000,
      distractionCooldown: 60000
    };

    this.states = {
      camera: false,
      screen: false,
      phone: false,
      sleep: false,
      activity: true,
      processes: []
    };

    this.recordingState = {
      isRecording: false,
      duration: 0,
      mediaRecorder: null,
      chunks: []
    };

    this.phoneService = new PhoneDetectionService(this.settings);
    this.sleepService = new SleepDetectionService(this.settings);
    this.activityService = new ActivityMonitoringService(this.settings);
    this.processService = new ProcessMonitoringService(this.settings);
    this.screenService = new ScreenMonitoringService(this.settings);
  }

  async init(): Promise<void> {
    this.bindEvents();
    this.loadWebhookUrl();
    this.updateWebhookStatus();
    this.setupExitHandler();
    this.log('German Watchdog initialized', 'info');
  }

  private loadWebhookUrl(): void {
    console.log('loadWebhookUrl called');
  }

  private bindEvents(): void {
    console.log('bindEvents called');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const permissionsBtn = document.getElementById('requestPermissionsBtn');
    const video = document.getElementById('surveillanceVideo') as HTMLVideoElement | null;
    const dismissAlertBtn = document.getElementById('dismissAlertBtn');
    const snoozeBtn = document.getElementById('snoozeBtn');

    console.log('startBtn:', startBtn);
    console.log('stopBtn:', stopBtn);

    startBtn?.addEventListener('click', () => {
      console.log('Start button clicked');
      this.startSurveillance();
    });
    stopBtn?.addEventListener('click', () => {
      console.log('Stop button clicked');
      this.stopSurveillance(false);
    });
    permissionsBtn?.addEventListener('click', () => this.requestPermissions());
    video?.addEventListener('ended', () => this.onVideoEnded());
    dismissAlertBtn?.addEventListener('click', () => this.dismissAlert());
    snoozeBtn?.addEventListener('click', () => this.snoozeAlert());
  }

  private setupExitHandler(): void {
    window.addEventListener('beforeunload', async () => {
      if (this.isRunning && this.surveillanceStartTime) {
        const duration = Math.floor((Date.now() - this.surveillanceStartTime) / 1000);
        await (window as unknown as { electronAPI?: { notifyExit: (message: string) => Promise<boolean> } })
          .electronAPI?.notifyExit(`Surveillance was forcefully terminated after ${duration} seconds`);
      }
    });
  }

  async requestPermissions(): Promise<void> {
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
      cameraStream.getTracks().forEach(track => track.stop());
      this.updateCardStatus('cameraCard', 'Active', 'active');

      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: 'monitor' },
          audio: false
        });
        screenStream.getTracks().forEach(track => track.stop());
        this.updateCardStatus('screenCard', 'Active', 'active');
      } catch (e) {
        this.log(`Screen permission denied: ${(e as Error).message}`, 'warning');
      }

      this.log('Permissions granted', 'info');
    } catch (e) {
      this.log(`Permission error: ${(e as Error).message}`, 'warning');
    }
  }

  async startSurveillance(): Promise<void> {
    console.log('startSurveillance called');
    if (this.isRunning) {
      console.log('Already running, returning');
      return;
    }

    this.isRunning = true;
    this.consecutiveDetections = 0;
    this.updateUIForRunning(true);

    this.surveillanceStartTime = Date.now();
    this.startTimer();
    console.log('Timer started');

    await this.startMonitoring();
    console.log('Monitoring started');

    await this.sendStartNotification();
    this.log('Surveillance started', 'info');

    this.startSurveillanceCycle();
  }

  private startSurveillanceCycle(): void {
    console.log('Starting surveillance cycle');
    this.runSurveillanceCycle();
  }

  private async runSurveillanceCycle(): Promise<void> {
    if (!this.isRunning) return;

    const video = document.getElementById('surveillanceVideo') as HTMLVideoElement | null;
    const overlay = document.getElementById('videoOverlay');

    console.log('[Surveillance] video element:', !!video);
    console.log('[Surveillance] overlay element:', !!overlay);
    console.log('[Surveillance] video readyState:', video?.readyState);
    console.log('[Surveillance] video networkState:', video?.networkState);

    if (overlay) {
      overlay.classList.add('hidden');
      console.log('[Surveillance] overlay hidden class added');
    }

    if (video) {
      video.currentTime = 0;
      console.log('[Surveillance] video currentTime set to 0');

      // Add error event listener
      video.onerror = (e) => {
        console.error('[Surveillance] Video error event:', e);
        console.error('[Surveillance] Video error code:', video.error?.code);
        console.error('[Surveillance] Video error message:', video.error?.message);
      };

      // Add canplay event listener for debugging
      video.oncanplay = () => {
        console.log('[Surveillance] Video canplay event fired');
      };

      video.onplaying = () => {
        console.log('[Surveillance] Video playing event fired');
      };

      video.onended = () => {
        console.log('[Surveillance] Video ended event fired');
      };

      // Ensure video is loaded before playing
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        console.log('[Surveillance] Video already has data, attempting play');
        this.attemptVideoPlay(video);
      } else {
        console.log('[Surveillance] Waiting for video to load...');
        video.oncanplaythrough = () => {
          console.log('[Surveillance] Video canplaythrough, attempting play');
          this.attemptVideoPlay(video);
        };
        video.load(); // Force reload
      }
    }

    this.updateCardStatus('cameraCard', 'Recording', 'active');

    if (!this.screenService.isUsingFallback()) {
      this.updateCardStatus('screenCard', 'Recording', 'active');
    }

    await this.runDetectionChecks();
  }

  private attemptVideoPlay(video: HTMLVideoElement): void {
    const playPromise = video.play();
    if (playPromise) {
      playPromise.then(() => {
        console.log('[Surveillance] video playing successfully');
      }).catch((e: Error) => {
        console.error('[Surveillance] video play rejected:', e.name, e.message);
        // Try again with muted if autoplay policy blocks it
        if (e.name === 'NotAllowedError') {
          console.log('[Surveillance] Trying with muted=true');
          video.muted = true;
          video.play().catch((e2) => {
            console.error('[Surveillance] video play with muted also failed:', e2);
          });
        }
      });
    }
  }

  private onVideoEnded(): void {
    if (!this.isRunning) return;

    const waitTime = this.getRandomInterval();

    this.updateCardStatus('cameraCard', 'Monitoring', 'inactive');
    if (!this.screenService.isUsingFallback()) {
      this.updateCardStatus('screenCard', 'Idle', 'inactive');
    }

    setTimeout(() => {
      if (this.isRunning) {
        this.runSurveillanceCycle();
      }
    }, waitTime);
  }

  private async sendStartNotification(): Promise<void> {
    try {
      await (window as unknown as { electronAPI?: { sendStartNotification: () => Promise<boolean> } })
        .electronAPI?.sendStartNotification();
    } catch (e) {
      console.error('Failed to send start notification:', e);
    }
  }

  private async sendStopNotification(): Promise<void> {
    if (this.surveillanceStartTime) {
      const duration = Math.floor((Date.now() - this.surveillanceStartTime) / 1000);
      try {
        await (window as unknown as { electronAPI?: { sendStopNotification: (duration: number) => Promise<boolean> } })
          .electronAPI?.sendStopNotification(duration);
      } catch (e) {
        console.error('Failed to send stop notification:', e);
      }
    }
  }

  private async startMonitoring(): Promise<void> {
    try {
      await this.phoneService.startCamera();
    } catch (e) {
      console.warn('Camera start failed:', e);
    }

    const screenStarted = await this.screenService.startMonitoring();
    if (screenStarted) {
      if (!this.screenService.isUsingFallback()) {
        this.updateCardStatus('screenCard', 'Recording', 'active');
        await this.startScreenRecording();
      }
    }

    this.activityService.startMonitoring();
    this.processService.startMonitoring();
  }

  private async startScreenRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' },
        audio: false
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      this.recordingState.chunks = [];
      this.recordingState.mediaRecorder = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordingState.chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordingState.chunks, { type: 'video/webm' });
        this.recordingState.chunks = [];
        console.log('Recording saved:', blob.size, 'bytes');
      };

      mediaRecorder.start(1000);
      this.recordingState.isRecording = true;
      this.log('Screen recording started', 'info');
    } catch (e) {
      console.error('Screen recording error:', e);
      this.log('Screen recording failed', 'warning');
    }
  }

  private stopScreenRecording(): void {
    if (this.recordingState.mediaRecorder && this.recordingState.isRecording) {
      this.recordingState.mediaRecorder.stop();
      this.recordingState.isRecording = false;
      this.log('Screen recording stopped', 'info');
    }
  }

  private stopMonitoring(): void {
    this.stopScreenRecording();
    this.phoneService.dispose();
    this.sleepService.dispose();
    this.screenService.dispose();
    this.activityService.dispose();
    this.processService.dispose();

    this.updateCardStatus('cameraCard', 'Inactive', 'inactive');
    this.updateCardStatus('screenCard', 'Inactive', 'inactive');
  }

  stopSurveillance(forced: boolean = false): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.updateUIForRunning(false);

    const video = document.getElementById('surveillanceVideo') as HTMLVideoElement | null;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }

    const overlay = document.getElementById('videoOverlay');
    const status = document.getElementById('videoStatus');
    if (overlay) overlay.classList.remove('hidden');
    if (status) status.textContent = forced ? '시스템 종료됨' : '시스템 유휴';

    this.stopTimer();
    this.stopDetectionLoop();
    this.stopMonitoring();

    if (!forced) {
      this.sendStopNotification();
    }

    this.log(forced ? 'Surveillance terminated' : 'Surveillance stopped', 'info');
  }

  private stopDetectionLoop(): void {
    if (this.checkTimeout) {
      clearTimeout(this.checkTimeout);
      this.checkTimeout = null;
    }
  }

  private startTimer(): void {
    this.timerInterval = setInterval(() => {
      if (this.surveillanceStartTime) {
        const elapsed = Date.now() - this.surveillanceStartTime;
        const hours = Math.floor(elapsed / 3600000);
        const minutes = Math.floor((elapsed % 3600000) / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);

        const timerDisplay = document.getElementById('timerDisplay');
        if (timerDisplay) {
          timerDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private getRandomInterval(): number {
    const min = this.settings.checkIntervalMin;
    const max = this.settings.checkIntervalMax;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private async runDetectionChecks(): Promise<DetectionResult> {
    console.log('Running detection checks...');
    const phoneCheck = await this.phoneService.check();
    const sleepCheck = await this.sleepService.check();
    const activityCheck = await this.activityService.check();
    const processCheck = await this.processService.check();

    if (phoneCheck.phoneDetected) {
      this.updateCardStatus('phoneCard', 'Phone Detected!', 'danger');
    } else {
      this.updateCardStatus('phoneCard', 'Not Detected', 'safe');
    }

    if (sleepCheck.sleepDetected) {
      this.updateCardStatus('sleepCard', 'User appears to be sleeping!', 'danger');
    } else {
      this.updateCardStatus('sleepCard', 'Awake', 'safe');
    }

    const activityInfo = this.activityService.getActivityInfo();
    if (activityInfo.isInactive) {
      this.updateCardStatus('activityCard', `Inactive (${Math.round(activityInfo.inactiveDuration / 1000)}s)`, 'warning');
    } else {
      this.updateCardStatus('activityCard', 'Active', 'safe');
    }

    const suspicious = this.processService.getSuspiciousProcesses();
    if (suspicious.length > 0) {
      const names = suspicious.map(p => p.name).join(', ');
      this.updateCardStatus('processCard', `Suspicious: ${names}`, 'danger');
    } else {
      const processes = this.processService.getProcesses();
      this.updateCardStatus('processCard', `${processes.length} processes`, 'safe');
    }

    const result = {
      phoneDetected: phoneCheck.phoneDetected,
      sleepDetected: sleepCheck.sleepDetected,
      inactive: activityCheck.inactive,
      suspiciousProcesses: processCheck.suspiciousProcesses
    };

    return result;
  }

  private isDistracted(results: DetectionResult): boolean {
    return results.phoneDetected || results.sleepDetected || results.inactive;
  }

  private triggerDistractionAlert(results: DetectionResult): void {
    const now = Date.now();
    if (now - this.lastDistractionTime < this.settings.distractionCooldown) {
      return;
    }

    this.lastDistractionTime = now;
    const alerts: string[] = [];

    if (results.phoneDetected) alerts.push('Phone detected in view');
    if (results.sleepDetected) alerts.push('User appears to be sleeping');
    if (results.inactive) alerts.push('No activity detected');

    const message = alerts.join(', ');
    this.showAlertModal(message);
    this.log(`DISTRACTION ALERT: ${message}`, 'alert');

    this.sendDiscordAlert(message);
  }

  private showAlertModal(message: string): void {
    const modal = document.getElementById('alertModal');
    const alertMessage = document.getElementById('alertMessage');
    const alertDetails = document.getElementById('alertDetails');

    if (alertMessage) alertMessage.textContent = message;
    if (alertDetails) alertDetails.textContent = `시각: ${new Date().toLocaleTimeString()}`;
    if (modal) modal.classList.remove('hidden');
  }

  private dismissAlert(): void {
    const modal = document.getElementById('alertModal');
    if (modal) modal.classList.add('hidden');
  }

  private snoozeAlert(): void {
    this.snoozeUntil = Date.now() + 300000;
    this.dismissAlert();
    this.log('Alert snoozed for 5 minutes', 'info');
  }

  private async sendDiscordAlert(message: string): Promise<void> {
    try {
      await (window as unknown as { electronAPI?: { sendDiscordAlert: (message: string) => Promise<boolean> } })
        .electronAPI?.sendDiscordAlert(message);
    } catch (e) {
      console.error('Failed to send Discord alert:', e);
    }
  }

  private updateWebhookStatus(): void {
    const statusElement = document.getElementById('webhookStatus');
    if (statusElement) {
      const webhookUrl = (window as unknown as { electronAPI?: { getWebhookUrl: () => Promise<string> } })
        .electronAPI?.getWebhookUrl();
      
      if (webhookUrl) {
        statusElement.textContent = '✅ 연결됨';
        statusElement.style.color = '#4CAF50';
      } else {
        statusElement.textContent = '❌ 미설정';
        statusElement.style.color = '#F44336';
      }
    }
  }

  private updateUIForRunning(running: boolean): void {
    const startBtn = document.getElementById('startBtn') as HTMLButtonElement | null;
    const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement | null;
    const statusIndicator = document.getElementById('statusIndicator');

    if (startBtn) startBtn.disabled = running;
    if (stopBtn) stopBtn.disabled = !running;
    if (statusIndicator) {
      if (running) {
        statusIndicator.classList.add('surveillance');
      } else {
        statusIndicator.classList.remove('surveillance');
      }
    }
  }

  private updateCardStatus(cardId: string, message: string, status: CardStatus): void {
    const card = document.getElementById(cardId);
    if (!card) return;

    const statusElement = card.querySelector('.card-content p');
    const indicator = card.querySelector('.card-indicator');

    if (statusElement) statusElement.textContent = message;
    if (indicator) {
      indicator.className = 'card-indicator ' + status;
    }
  }

  private log(message: string, type: 'info' | 'warning' | 'alert' = 'info'): void {
    const container = document.getElementById('logContainer');
    if (!container) return;

    const entry = document.createElement('div');
    entry.className = 'log-entry ' + type;

    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="log-time">[${time}]</span>${message}`;

    container.appendChild(entry);
    container.scrollTop = container.scrollHeight;
    console.log(`[Watchdog] ${message}`);
  }

  dispose(): void {
    this.stopSurveillance(true);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOMContentLoaded fired');
  const watchdog = new GermanWatchdog();
  console.log('GermanWatchdog instantiated');
  await watchdog.init();
  console.log('GermanWatchdog initialized');
  (window as unknown as { watchdog: GermanWatchdog }).watchdog = watchdog;
});
