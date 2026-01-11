export interface DetectionState {
  camera: boolean;
  screen: boolean;
  phone: boolean;
  sleep: boolean;
  activity: boolean;
  processes: string[];
}

export interface DetectionResult {
  phoneDetected: boolean;
  sleepDetected: boolean;
  inactive: boolean;
  suspiciousProcesses: boolean;
}

export interface DetectionSettings {
  checkIntervalMin: number;
  checkIntervalMax: number;
  phoneDetectionThreshold: number;
  sleepDetectionThreshold: number;
  inactivityThreshold: number;
  distractionCooldown: number;
}

export interface AlertDetails {
  type: AlertType;
  message: string;
  timestamp: Date;
}

export type AlertType = 'phone' | 'sleep' | 'inactive' | 'process' | 'general' | 'start' | 'stop' | 'forced_stop';

export interface WebhookPayload {
  embeds: Embed[];
}

export interface Embed {
  title: string;
  description: string;
  color: number;
  timestamp: string;
  fields: EmbedField[];
}

export interface EmbedField {
  name: string;
  value: string;
  inline: boolean;
}

export interface ProcessInfo {
  name: string;
  pid: number;
  suspicious: boolean;
}

export interface UserActivity {
  lastActivity: number;
  isInactive: boolean;
  inactiveDuration: number;
}

export type CardStatus = 'active' | 'inactive' | 'safe' | 'warning' | 'danger';

export interface CardState {
  status: CardStatus;
  message: string;
}

export interface ScreenRecordingOptions {
  width: number;
  height: number;
  frameRate: number;
  bitRate: number;
}

export interface RecordingState {
  isRecording: boolean;
  duration: number;
  mediaRecorder: MediaRecorder | null;
  chunks: Blob[];
}
