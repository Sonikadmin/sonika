import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audiogram, AudiogramThresholds } from '../types';
import { emptyAudiogram } from '../services/Audiogram';

interface AudiogramStore {
  audiogram: Audiogram;
  setThreshold: (ear: 'left' | 'right', freq: number, db: number | null) => void;
  setAll: (audiogram: Audiogram) => void;
  resetEar: (ear: 'left' | 'right') => void;
  reset: () => void;
}

export const useAudiogramStore = create<AudiogramStore>()(
  persist(
    (set) => ({
      audiogram: emptyAudiogram(),

      setThreshold: (ear, freq, db) =>
        set((s) => ({
          audiogram: {
            ...s.audiogram,
            [ear]: { ...s.audiogram[ear], [freq]: db } as AudiogramThresholds,
            source: 'manual',
            updatedAt: Date.now(),
          },
        })),

      setAll: (audiogram) => set({ audiogram }),

      resetEar: (ear) =>
        set((s) => ({
          audiogram: {
            ...s.audiogram,
            [ear]: emptyAudiogram()[ear],
            updatedAt: Date.now(),
          },
        })),

      reset: () => set({ audiogram: emptyAudiogram() }),
    }),
    {
      name: 'sonika-audiogram',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
