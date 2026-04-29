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
}

export interface VolumeLevelEvent {
  level: number;
}

// EventsMap requires functions — wrap payload in a function signature
type SonikaEvents = {
  onVolumeLevel: (event: VolumeLevelEvent) => void;
};

declare class SonikaAudioEngineModuleType extends NativeModule<SonikaEvents> {
  start(options: AudioEngineOptions): Promise<void>;
  stop(): Promise<void>;
  updateSettings(settings: Partial<AudioEngineOptions>): void;
  isRunning(): boolean;
}

const nativeModule: SonikaAudioEngineModuleType =
  requireNativeModule('SonikaAudioEngine');

export default nativeModule;
