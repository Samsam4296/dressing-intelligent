/**
 * useProfileStore Unit Tests
 * Story 1.5: Création Premier Profil
 *
 * Tests for the Zustand profile store.
 * Uses direct store access (getState/setState) for testing without React.
 */

// Mock storage before importing the store
jest.mock('@/lib/storage', () => ({
  zustandStorage: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

import {
  useProfileStore,
  selectCurrentProfileId,
  selectHasCompletedOnboarding,
} from '../useProfileStore';

describe('useProfileStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useProfileStore.getState().reset();
  });

  describe('initial state', () => {
    it('has null currentProfileId initially', () => {
      const state = useProfileStore.getState();
      expect(state.currentProfileId).toBeNull();
    });

    it('has hasCompletedOnboarding = false initially', () => {
      const state = useProfileStore.getState();
      expect(state.hasCompletedOnboarding).toBe(false);
    });
  });

  describe('setCurrentProfile', () => {
    it('sets the current profile ID', () => {
      useProfileStore.getState().setCurrentProfile('profile-123');
      expect(useProfileStore.getState().currentProfileId).toBe('profile-123');
    });

    it('overwrites previous profile ID', () => {
      useProfileStore.getState().setCurrentProfile('profile-123');
      useProfileStore.getState().setCurrentProfile('profile-456');
      expect(useProfileStore.getState().currentProfileId).toBe('profile-456');
    });
  });

  describe('clearCurrentProfile', () => {
    it('clears the current profile ID', () => {
      useProfileStore.getState().setCurrentProfile('profile-123');
      useProfileStore.getState().clearCurrentProfile();
      expect(useProfileStore.getState().currentProfileId).toBeNull();
    });
  });

  describe('completeOnboarding', () => {
    it('sets hasCompletedOnboarding to true', () => {
      expect(useProfileStore.getState().hasCompletedOnboarding).toBe(false);
      useProfileStore.getState().completeOnboarding();
      expect(useProfileStore.getState().hasCompletedOnboarding).toBe(true);
    });

    it('remains true after being set', () => {
      useProfileStore.getState().completeOnboarding();
      useProfileStore.getState().completeOnboarding();
      expect(useProfileStore.getState().hasCompletedOnboarding).toBe(true);
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', () => {
      // Set some state
      useProfileStore.getState().setCurrentProfile('profile-123');
      useProfileStore.getState().completeOnboarding();

      expect(useProfileStore.getState().currentProfileId).toBe('profile-123');
      expect(useProfileStore.getState().hasCompletedOnboarding).toBe(true);

      // Reset
      useProfileStore.getState().reset();

      expect(useProfileStore.getState().currentProfileId).toBeNull();
      expect(useProfileStore.getState().hasCompletedOnboarding).toBe(false);
    });
  });

  describe('selectors', () => {
    it('selectCurrentProfileId returns the current profile ID', () => {
      useProfileStore.getState().setCurrentProfile('profile-789');
      const state = useProfileStore.getState();
      expect(selectCurrentProfileId(state)).toBe('profile-789');
    });

    it('selectHasCompletedOnboarding returns the onboarding status', () => {
      let state = useProfileStore.getState();
      expect(selectHasCompletedOnboarding(state)).toBe(false);

      useProfileStore.getState().completeOnboarding();

      state = useProfileStore.getState();
      expect(selectHasCompletedOnboarding(state)).toBe(true);
    });
  });

  describe('integration', () => {
    it('supports typical profile creation flow', () => {
      // Initial state - no profile, not onboarded
      expect(useProfileStore.getState().currentProfileId).toBeNull();
      expect(useProfileStore.getState().hasCompletedOnboarding).toBe(false);

      // User creates first profile
      useProfileStore.getState().setCurrentProfile('profile-first');
      useProfileStore.getState().completeOnboarding();

      // State after profile creation
      expect(useProfileStore.getState().currentProfileId).toBe('profile-first');
      expect(useProfileStore.getState().hasCompletedOnboarding).toBe(true);

      // User switches profile (Story 1.7)
      useProfileStore.getState().setCurrentProfile('profile-second');

      expect(useProfileStore.getState().currentProfileId).toBe('profile-second');
      expect(useProfileStore.getState().hasCompletedOnboarding).toBe(true); // Still onboarded

      // User logs out
      useProfileStore.getState().reset();

      expect(useProfileStore.getState().currentProfileId).toBeNull();
      expect(useProfileStore.getState().hasCompletedOnboarding).toBe(false);
    });
  });
});
