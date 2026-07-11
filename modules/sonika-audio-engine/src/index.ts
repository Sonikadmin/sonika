import { NativeModule, requireNativeModule } from 'expo-modules-core';

export interface EQBandConfig {
  frequency: number;
  gain: number;
}

export interface AudioEngineOptions {
  micSource: 'smartphone' | 'bluetooth' | 'combined';
  audioOutput: 'bone_conduction' | 'bluetooth_headphones' | 'jack';
  leftEQ: EQBandConfig[];
  rightEQ: EQBandConfig[];
  leftVolume: number;
  rightVolume: number;
  amplification: number;
  stereoBalance: number;
  sonikaClean: boolean;
  conversationMode: boolean;
  monoMode: boolean;
  monoChannel: 'left' | 'right';
  /** low_latency = buffer minimi; high_quality = buffer ampi + compressione AGC */
  audioQuality?: 'low_latency' | 'high_quality';
  /** Notifica del foreground service silenziosa e minimale */
  discreteMode?: boolean;
}

export interface VolumeLevelEvent {
  level: number;
}

export interface NativeAudioDevice {
  id: string;
  name: string;
  type: 'microphone' | 'headphones' | 'unknown';
  isInput: boolean;
  isOutput: boolean;
  connected: boolean;
}

export interface AudioDevicesChangedEvent {
  devices: NativeAudioDevice[];
}

// EventsMap requires functions — wrap payload in a function signature
type SonikaEvents = {
  onVolumeLevel: (event: VolumeLevelEvent) => void;
  onAudioDevicesChanged: (event: AudioDevicesChangedEvent) => void;
};

declare class SonikaAudioEngineModuleType extends NativeModule<SonikaEvents> {
  start(options: AudioEngineOptions): Promise<void>;
  stop(): Promise<void>;
  updateSettings(settings: Partial<AudioEngineOptions>): void;
  isRunning(): boolean;
  getAudioDevices(): NativeAudioDevice[];
  /** Tono puro per il test dell'udito. ear: 'left' | 'right' | 'both'. amplitude 0..1 */
  playTone(frequency: number, ear: string, amplitude: number): void;
  stopTone(): void;
  /** True se l'ottimizzazione batteria può interrompere Sonika in background (Android). */
  isBatteryOptimized(): boolean;
}

const nativeModule: SonikaAudioEngineModuleType =
  requireNativeModule('SonikaAudioEngine');

export default nativeModule;
