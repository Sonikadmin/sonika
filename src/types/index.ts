export type MicSource = 'smartphone' | 'bluetooth' | 'combined';
export type AudioOutput = 'bone_conduction' | 'bluetooth_headphones' | 'jack';

export interface EQBand {
  id: string;
  frequency: number;
  gain: number; // dB, -12 to +12
  label: string;
}

export interface ChannelEQ {
  bands: EQBand[];
  volume: number; // 0-1
}

export interface AudioProfile {
  id: string;
  name: string;
  icon: string;
  leftEQ: ChannelEQ;
  rightEQ: ChannelEQ;
  stereoBalance: number; // -1 (full left) to +1 (full right)
  amplification: number; // 1-10
  sonikaClean: boolean;
  conversationMode: boolean;
  preferredMicSource: MicSource;
  preferredOutput: AudioOutput;
  isPreset: boolean;
  createdAt: number;
}

export interface BluetoothDevice {
  id: string;
  name: string;
  type: 'microphone' | 'headphones' | 'bone_conduction' | 'unknown';
  connected: boolean;
  rssi?: number;
}

export interface AudioState {
  isRunning: boolean;
  micSource: MicSource;
  audioOutput: AudioOutput;
  sonikaClean: boolean;
  conversationMode: boolean;
  monoMode: boolean;
  monoChannel: 'left' | 'right';
  amplification: number;
  stereoBalance: number;
  volumeLevel: number;
  leftVolume: number;
  rightVolume: number;
  leftEQ: EQBand[];
  rightEQ: EQBand[];
  connectedDevices: BluetoothDevice[];
  selectedBluetoothMicId: string | null;
  selectedBluetoothOutputId: string | null;
}

/** Soglie uditive in dB HL per frequenza (Hz). null = non misurata. */
export type AudiogramThresholds = Record<number, number | null>;

export interface Audiogram {
  left: AudiogramThresholds;
  right: AudiogramThresholds;
  source: 'manual' | 'photo';
  updatedAt: number;
}

export interface HearingDiaryEntry {
  id: string;
  profileId: string;
  profileName: string;
  startTime: number;
  endTime: number | null;
  duration: number;
}

export interface SmartNotificationSettings {
  doorbell: boolean;
  intercom: boolean;
  babyCrying: boolean;
  emergencySirens: boolean;
  alarms: boolean;
}

export interface AppSettings {
  preferredOutput: AudioOutput;
  preferredMicSource: MicSource;
  preferredBluetoothOutputId: string | null;
  preferredBluetoothMicId: string | null;
  audioQuality: 'low_latency' | 'high_quality';
  discreteMode: boolean;
  autoStart: boolean;
  autoNoiseReduction: boolean;
  smartNotifications: SmartNotificationSettings;
  darkMode: boolean;
  defaultProfileId: string;
  showOnboarding: boolean;
  /** Chiave API Anthropic per la lettura AI dell'esame audiometrico (opzionale). */
  anthropicApiKey?: string;
}
