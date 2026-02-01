/**
 * Profile Store
 *
 * Manages profile state including multiple profiles and active profile selection.
 * Supports up to 3 profiles per user (MVP requirement).
 * Persisted to MMKV with AES-256 encryption.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage, STORAGE_KEYS } from '@/lib/storage';
import type { Profile } from '@/types/database.types';

// Maximum profiles allowed (MVP requirement)
export const MAX_PROFILES = 3;

// Profile state types
export interface ProfileState {
  // Profiles data
  profiles: Profile[];
  activeProfileId: string | null;
  activeProfile: Profile | null;

  // Loading states
  isLoading: boolean;
  isSwitching: boolean;

  // Error handling
  error: string | null;
}

// Profile actions types
export interface ProfileActions {
  // Profile management
  setProfiles: (profiles: Profile[]) => void;
  addProfile: (profile: Profile) => void;
  updateProfile: (profileId: string, updates: Partial<Profile>) => void;
  removeProfile: (profileId: string) => void;

  // Active profile
  setActiveProfile: (profileId: string) => void;
  clearActiveProfile: () => void;

  // Loading states
  setLoading: (isLoading: boolean) => void;
  setSwitching: (isSwitching: boolean) => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;

  // Helpers
  canAddProfile: () => boolean;
  getProfileById: (profileId: string) => Profile | undefined;

  // Reset
  reset: () => void;
}

// Combined store type
export type ProfileStore = ProfileState & ProfileActions;

// Initial state
const initialState: ProfileState = {
  profiles: [],
  activeProfileId: null,
  activeProfile: null,
  isLoading: false,
  isSwitching: false,
  error: null,
};

// Create the store
export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...initialState,

      // Profile management
      setProfiles: (profiles) => {
        const { activeProfileId } = get();
        const activeProfile = activeProfileId
          ? (profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null)
          : (profiles[0] ?? null);

        set({
          profiles,
          activeProfile,
          activeProfileId: activeProfile?.id ?? null,
        });
      },

      addProfile: (profile) => {
        const { profiles } = get();
        if (profiles.length >= MAX_PROFILES) {
          set({ error: `Maximum ${MAX_PROFILES} profils autorisés` });
          return;
        }
        set({
          profiles: [...profiles, profile],
          error: null,
        });
      },

      updateProfile: (profileId, updates) => {
        const { profiles, activeProfileId } = get();
        const updatedProfiles = profiles.map((p) =>
          p.id === profileId ? { ...p, ...updates } : p
        );
        set({
          profiles: updatedProfiles,
          activeProfile:
            activeProfileId === profileId
              ? (updatedProfiles.find((p) => p.id === profileId) ?? null)
              : get().activeProfile,
        });
      },

      removeProfile: (profileId) => {
        const { profiles, activeProfileId } = get();
        const remainingProfiles = profiles.filter((p) => p.id !== profileId);

        // If removing active profile, switch to first remaining
        let newActiveProfile = get().activeProfile;
        let newActiveProfileId = activeProfileId;

        if (activeProfileId === profileId) {
          newActiveProfile = remainingProfiles[0] ?? null;
          newActiveProfileId = newActiveProfile?.id ?? null;
        }

        set({
          profiles: remainingProfiles,
          activeProfile: newActiveProfile,
          activeProfileId: newActiveProfileId,
        });
      },

      // Active profile management
      setActiveProfile: (profileId) => {
        const { profiles } = get();
        const profile = profiles.find((p) => p.id === profileId);
        if (profile) {
          set({
            activeProfileId: profileId,
            activeProfile: profile,
            error: null,
          });
        }
      },

      clearActiveProfile: () =>
        set({
          activeProfileId: null,
          activeProfile: null,
        }),

      // Loading states
      setLoading: (isLoading) => set({ isLoading }),
      setSwitching: (isSwitching) => set({ isSwitching }),

      // Error handling
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // Helpers
      canAddProfile: () => get().profiles.length < MAX_PROFILES,
      getProfileById: (profileId) => get().profiles.find((p) => p.id === profileId),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: STORAGE_KEYS.PROFILE_STATE,
      storage: createJSONStorage(() => zustandStorage),
      // Only persist these fields
      partialize: (state) => ({
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
        activeProfile: state.activeProfile,
      }),
    }
  )
);

// Selector hooks for optimized re-renders
export const useProfiles = () => useProfileStore((state) => state.profiles);
export const useActiveProfile = () => useProfileStore((state) => state.activeProfile);
export const useActiveProfileId = () => useProfileStore((state) => state.activeProfileId);
export const useProfileLoading = () => useProfileStore((state) => state.isLoading);
export const useProfileSwitching = () => useProfileStore((state) => state.isSwitching);
export const useCanAddProfile = () =>
  useProfileStore((state) => state.profiles.length < MAX_PROFILES);
