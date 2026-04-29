import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings } from '../types';

interface SettingsStore {
  settings: AppSettings;
  updateSettings: (changes: Partial<AppSettings>) => void;
  updateSmartNotifications: (changes: Partial<AppSettings['smartNotifications']>) => void;
}

const defaultSettings: AppSettings = {
  preferredOutput: 'bluetooth_headphones',
  preferredMicSource: 'smartphone',
  preferredBluetoothOutputId: null,
  preferredBluetoothMicId: null,
  audioQuality: 'low_latency',
  discreteMode: false,
  autoStart: false,
  autoNoiseReduction: false,
  smartNotifications: {
    doorbell: true,
    intercom: true,
    babyCrying: true,
    emergencySirens: true,
    alarms: true,
  },
  darkMode: true,
  defaultProfileId: 'home',
  showOnboarding: true,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,

      updateSettings: (changes) =>
        set((s) => ({ settings: { ...s.settings, ...changes } })),

      updateSmartNotifications: (changes) =>
        set((s) => ({
          settings: {
            ...s.settings,
            smartNotifications: { ...s.settings.smartNotifications, ...changes },
          },
        })),
    }),
    {
      name: 'sonika-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
