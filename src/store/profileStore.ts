import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioProfile } from '../types';
import { PRESET_PROFILES } from '../constants/profiles';

interface ProfileStore {
  profiles: AudioProfile[];
  activeProfileId: string;
  setActiveProfile: (id: string) => void;
  updateProfile: (id: string, changes: Partial<AudioProfile>) => void;
  addProfile: (profile: AudioProfile) => void;
  deleteProfile: (id: string) => void;
  resetCustomProfile: () => void;
  renameProfile: (id: string, name: string) => void;
  getActiveProfile: () => AudioProfile | undefined;
}

const defaultCustomProfile = PRESET_PROFILES.find((p) => p.id === 'custom')!;

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      profiles: PRESET_PROFILES,
      activeProfileId: 'home',

      setActiveProfile: (id) => set({ activeProfileId: id }),

      updateProfile: (id, changes) =>
        set((s) => ({
          profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...changes } : p)),
        })),

      addProfile: (profile) =>
        set((s) => ({ profiles: [...s.profiles, profile] })),

      deleteProfile: (id) => {
        const presetIds = PRESET_PROFILES.map((p) => p.id);
        if (presetIds.includes(id)) return;
        set((s) => ({
          profiles: s.profiles.filter((p) => p.id !== id),
          activeProfileId: s.activeProfileId === id ? 'home' : s.activeProfileId,
        }));
      },

      resetCustomProfile: () =>
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === 'custom' ? { ...defaultCustomProfile, name: p.name } : p
          ),
        })),

      renameProfile: (id, name) =>
        set((s) => ({
          profiles: s.profiles.map((p) => (p.id === id ? { ...p, name } : p)),
        })),

      getActiveProfile: () => {
        const { profiles, activeProfileId } = get();
        return profiles.find((p) => p.id === activeProfileId);
      },
    }),
    {
      name: 'sonika-profiles',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
