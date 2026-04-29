import { create } from 'zustand';
import { AudioState, EQBand, MicSource, AudioOutput, BluetoothDevice } from '../types';
import { flatEQBands } from '../utils/audio';

interface AudioStore extends AudioState {
  setIsRunning: (v: boolean) => void;
  togglePower: () => void;
  setMicSource: (src: MicSource) => void;
  setAudioOutput: (out: AudioOutput) => void;
  toggleSonikaClean: () => void;
  toggleConversationMode: () => void;
  setMonoMode: (enabled: boolean, channel: 'left' | 'right') => void;
  setAmplification: (val: number) => void;
  setStereoBalance: (val: number) => void;
  setVolumeLevel: (val: number) => void;
  setLeftVolume: (val: number) => void;
  setRightVolume: (val: number) => void;
  setLeftEQ: (bands: EQBand[]) => void;
  setRightEQ: (bands: EQBand[]) => void;
  updateLeftBand: (id: string, gain: number) => void;
  updateRightBand: (id: string, gain: number) => void;
  setConnectedDevices: (devices: BluetoothDevice[]) => void;
  addConnectedDevice: (device: BluetoothDevice) => void;
  removeConnectedDevice: (id: string) => void;
  setSelectedBluetoothMic: (id: string | null) => void;
  setSelectedBluetoothOutput: (id: string | null) => void;
  applyProfileSettings: (profile: {
    leftEQ: { bands: EQBand[]; volume: number };
    rightEQ: { bands: EQBand[]; volume: number };
    stereoBalance: number;
    amplification: number;
    sonikaClean: boolean;
    conversationMode: boolean;
    preferredMicSource: MicSource;
    preferredOutput: AudioOutput;
  }) => void;
}

export const useAudioStore = create<AudioStore>()((set, get) => ({
  isRunning: false,
  micSource: 'smartphone',
  audioOutput: 'bluetooth_headphones',
  sonikaClean: false,
  conversationMode: false,
  monoMode: false,
  monoChannel: 'left',
  amplification: 2,
  stereoBalance: 0,
  volumeLevel: 0,
  leftVolume: 0.8,
  rightVolume: 0.8,
  leftEQ: flatEQBands(),
  rightEQ: flatEQBands(),
  connectedDevices: [],
  selectedBluetoothMicId: null,
  selectedBluetoothOutputId: null,

  setIsRunning: (v) => set({ isRunning: v }),
  togglePower: () => set((s) => ({ isRunning: !s.isRunning, volumeLevel: s.isRunning ? 0 : 0 })),
  setMicSource: (src) => set({ micSource: src }),
  setAudioOutput: (out) => set({ audioOutput: out }),
  toggleSonikaClean: () => set((s) => ({ sonikaClean: !s.sonikaClean })),
  toggleConversationMode: () => set((s) => ({ conversationMode: !s.conversationMode })),
  setMonoMode: (enabled, channel) => set({ monoMode: enabled, monoChannel: channel }),
  setAmplification: (val) => set({ amplification: Math.max(1, Math.min(10, val)) }),
  setStereoBalance: (val) => set({ stereoBalance: Math.max(-1, Math.min(1, val)) }),
  setVolumeLevel: (val) => set({ volumeLevel: val }),
  setLeftVolume: (val) => set({ leftVolume: Math.max(0, Math.min(1, val)) }),
  setRightVolume: (val) => set({ rightVolume: Math.max(0, Math.min(1, val)) }),
  setLeftEQ: (bands) => set({ leftEQ: bands }),
  setRightEQ: (bands) => set({ rightEQ: bands }),
  updateLeftBand: (id, gain) =>
    set((s) => ({
      leftEQ: s.leftEQ.map((b) => (b.id === id ? { ...b, gain } : b)),
    })),
  updateRightBand: (id, gain) =>
    set((s) => ({
      rightEQ: s.rightEQ.map((b) => (b.id === id ? { ...b, gain } : b)),
    })),
  setConnectedDevices: (devices) => set({ connectedDevices: devices }),
  addConnectedDevice: (device) =>
    set((s) => ({
      connectedDevices: [...s.connectedDevices.filter((d) => d.id !== device.id), device],
    })),
  removeConnectedDevice: (id) =>
    set((s) => ({
      connectedDevices: s.connectedDevices.filter((d) => d.id !== id),
    })),
  setSelectedBluetoothMic: (id) => set({ selectedBluetoothMicId: id }),
  setSelectedBluetoothOutput: (id) => set({ selectedBluetoothOutputId: id }),
  applyProfileSettings: (profile) =>
    set({
      leftEQ: profile.leftEQ.bands,
      rightEQ: profile.rightEQ.bands,
      leftVolume: profile.leftEQ.volume,
      rightVolume: profile.rightEQ.volume,
      stereoBalance: profile.stereoBalance,
      amplification: profile.amplification,
      sonikaClean: profile.sonikaClean,
      conversationMode: profile.conversationMode,
      micSource: profile.preferredMicSource,
      audioOutput: profile.preferredOutput,
    }),
}));
