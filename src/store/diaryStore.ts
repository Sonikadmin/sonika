import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HearingDiaryEntry } from '../types';
import { nanoid } from '../utils/nanoid';

interface DiaryStore {
  entries: HearingDiaryEntry[];
  currentEntryId: string | null;
  startSession: (profileId: string, profileName: string) => void;
  endSession: () => void;
  clearOldEntries: (daysToKeep?: number) => void;
}

export const useDiaryStore = create<DiaryStore>()(
  persist(
    (set, get) => ({
      entries: [],
      currentEntryId: null,

      startSession: (profileId, profileName) => {
        const id = nanoid();
        const entry: HearingDiaryEntry = {
          id,
          profileId,
          profileName,
          startTime: Date.now(),
          endTime: null,
          duration: 0,
        };
        set((s) => ({
          entries: [...s.entries, entry],
          currentEntryId: id,
        }));
      },

      endSession: () => {
        const { currentEntryId } = get();
        if (!currentEntryId) return;
        set((s) => ({
          entries: s.entries.map((e) =>
            e.id === currentEntryId
              ? { ...e, endTime: Date.now(), duration: Math.floor((Date.now() - e.startTime) / 60000) }
              : e
          ),
          currentEntryId: null,
        }));
      },

      clearOldEntries: (daysToKeep = 90) => {
        const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
        set((s) => ({ entries: s.entries.filter((e) => e.startTime >= cutoff) }));
      },
    }),
    {
      name: 'sonika-diary',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
