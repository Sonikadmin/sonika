/**
 * AudioEngine — thin TypeScript wrapper around the SonikaAudioEngine native module.
 *
 * iOS:  AVAudioEngine + tap PCM → biquad EQ (L/R independent) → gain/balance → output
 * Android: AudioRecord + AudioTrack loop → biquad EQ → gain/balance → AudioTrack
 *
 * Both platforms achieve <20 ms round-trip latency with PERFORMANCE_MODE_LOW_LATENCY.
 */
import NativeAudioEngine from '../../modules/sonika-audio-engine/src';
import { EQBand, MicSource, AudioOutput } from '../types';

export interface AudioEngineSettings {
  micSource: MicSource;
  audioOutput: AudioOutput;
  leftEQ: EQBand[];
  rightEQ: EQBand[];
  leftVolume: number;
  rightVolume: number;
  amplification: number;
  stereoBalance: number;
  sonikaClean: boolean;
  conversationMode: boolean;
  monoMode: boolean;
  monoChannel: 'left' | 'right';
  audioQuality?: 'low_latency' | 'high_quality';
  discreteMode?: boolean;
}

type VolumeCallback = (level: number) => void;

class AudioEngine {
  private volumeSub: { remove: () => void } | null = null;
  private volumeCallback: VolumeCallback | null = null;

  async start(settings: AudioEngineSettings): Promise<void> {
    // Subscribe to volume level events before starting
    this.volumeSub = NativeAudioEngine.addListener('onVolumeLevel', (e: { level: number }) => {
      this.volumeCallback?.(e.level);
    });

    await NativeAudioEngine.start({
      micSource:       settings.micSource,
      audioOutput:     settings.audioOutput,
      leftEQ:          settings.leftEQ.map((b) => ({ frequency: b.frequency, gain: b.gain })),
      rightEQ:         settings.rightEQ.map((b) => ({ frequency: b.frequency, gain: b.gain })),
      leftVolume:      settings.leftVolume,
      rightVolume:     settings.rightVolume,
      amplification:   settings.amplification,
      stereoBalance:   settings.stereoBalance,
      sonikaClean:     settings.sonikaClean,
      conversationMode: settings.conversationMode,
      monoMode:        settings.monoMode,
      monoChannel:     settings.monoChannel,
      audioQuality:    settings.audioQuality ?? 'low_latency',
      discreteMode:    settings.discreteMode ?? false,
    });
  }

  async stop(): Promise<void> {
    await NativeAudioEngine.stop();
    this.volumeSub?.remove();
    this.volumeSub = null;
    this.volumeCallback?.(0);
  }

  updateSettings(settings: Partial<AudioEngineSettings>): void {
    const patch: Record<string, unknown> = {};
    if (settings.leftEQ)         patch.leftEQ         = settings.leftEQ.map((b) => ({ frequency: b.frequency, gain: b.gain }));
    if (settings.rightEQ)        patch.rightEQ        = settings.rightEQ.map((b) => ({ frequency: b.frequency, gain: b.gain }));
    if (settings.leftVolume      != null) patch.leftVolume      = settings.leftVolume;
    if (settings.rightVolume     != null) patch.rightVolume     = settings.rightVolume;
    if (settings.amplification   != null) patch.amplification   = settings.amplification;
    if (settings.stereoBalance   != null) patch.stereoBalance   = settings.stereoBalance;
    if (settings.sonikaClean     != null) patch.sonikaClean     = settings.sonikaClean;
    if (settings.conversationMode != null) patch.conversationMode = settings.conversationMode;
    if (settings.monoMode        != null) patch.monoMode        = settings.monoMode;
    if (settings.monoChannel)    patch.monoChannel    = settings.monoChannel;
    if (settings.micSource)      patch.micSource      = settings.micSource;
    if (settings.audioOutput)    patch.audioOutput    = settings.audioOutput;
    if (settings.audioQuality)   patch.audioQuality   = settings.audioQuality;
    NativeAudioEngine.updateSettings(patch as any);
  }

  /** Tono puro per il test dell'udito (frequency Hz, ear left/right/both, amplitude 0..1). */
  playTone(frequency: number, ear: 'left' | 'right' | 'both', amplitude: number): void {
    NativeAudioEngine.playTone(frequency, ear, amplitude);
  }

  stopTone(): void {
    NativeAudioEngine.stopTone();
  }

  onVolumeLevel(cb: VolumeCallback): void {
    this.volumeCallback = cb;
  }

  isRunning(): boolean {
    return NativeAudioEngine.isRunning();
  }
}

export const audioEngine = new AudioEngine();
