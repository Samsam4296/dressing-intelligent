/**
 * Profile Store (Zustand)
 * Story 1.5: Création Premier Profil
 * Story 1.7: Switch Entre Profils
 *
 * UI state for profile management.
 * CRITICAL: This is for UI state ONLY. Server state uses TanStack Query.
 * Per project-context.md State Management Decision Tree.
 *
 * AC#5: UI reflects immediately via currentProfileId
 * AC#6: Profile actif persisted (survives restart)
 * AC#17: Cold start restores active profile from storage
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage';

// ============================================
// State Interface
// ============================================

interface ProfileStoreState {
  /**
   * Currently active profile ID (persisted for app restart)
   * Used to quickly restore UI state without waiting for server
   */
  currentProfileId: string | null;

  /**
   * Whether profile onboarding has been completed
   * Used to determine navigation flow
   */
  hasCompletedOnboarding: boolean;

  // ============================================
  // Actions
  // ============================================

  /**
   * Set the current active profile ID
   */
  setCurrentProfile: (profileId: string) => void;

  /**
   * Clear the current profile (on logout)
   */
  clearCurrentProfile: () => void;

  /**
   * Mark onboarding as complete
   */
  completeOnboarding: () => void;

  /**
   * Reset store (for logout)
   */
  reset: () => void;
}

// ============================================
// Initial State
// ============================================

const initialState = {
  currentProfileId: null,
  hasCompletedOnboarding: false,
};

// ============================================
// Store
// ============================================

/**
 * Profile store with MMKV persistence
 *
 * Usage:
 * ```typescript
 * // Get current profile ID
 * const profileId = useProfileStore(state => state.currentProfileId);
 *
 * // Set current profile
 * const setProfile = useProfileStore(state => state.setCurrentProfile);
 * setProfile('uuid-here');
 *
 * // Check onboarding status
 * const hasOnboarded = useProfileStore(state => state.hasCompletedOnboarding);
 * ```
 */
export const useProfileStore = create<ProfileStoreState>()(
  persist(
    (set) => ({
      ...initialState,

      setCurrentProfile: (profileId) => set({ currentProfileId: profileId }),

      clearCurrentProfile: () => set({ currentProfileId: null }),

      completeOnboarding: () => set({ hasCompletedOnboarding: true }),

      reset: () => set(initialState),
    }),
    {
      name: 'profile-store',
      storage: createJSONStorage(() => zustandStorage),
      // Only persist these fields
      partialize: (state) => ({
        currentProfileId: state.currentProfileId,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
    }
  )
);

// ============================================
// Selectors (for performance optimization)
// ============================================

/**
 * Select current profile ID
 */
export const selectCurrentProfileId = (state: ProfileStoreState) => state.currentProfileId;

/**
 * Select onboarding status
 */
export const selectHasCompletedOnboarding = (state: ProfileStoreState) =>
  state.hasCompletedOnboarding;

// ============================================
// Convenience Hooks (Story 1.7)
// ============================================

/**
 * Hook to get current profile ID with automatic re-render on change
 *
 * @example
 * ```typescript
 * const currentProfileId = useCurrentProfileId();
 * // Will re-render when currentProfileId changes
 * ```
 */
export const useCurrentProfileId = () => useProfileStore(selectCurrentProfileId);

/**
 * Hook to get setCurrentProfile action
 *
 * @example
 * ```typescript
 * const setCurrentProfile = useSetCurrentProfile();
 * setCurrentProfile('new-profile-id');
 * ```
 */
export const useSetCurrentProfile = () => useProfileStore((state) => state.setCurrentProfile);
