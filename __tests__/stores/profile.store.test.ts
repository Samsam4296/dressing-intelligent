/**
 * Profile Store Tests
 *
 * Tests for Zustand profile store state management.
 * @priority P1 - Core profile management
 */

import { useProfileStore, MAX_PROFILES } from '@/stores/profile.store';
import { createMockProfile, createMockProfiles, resetProfileFactory } from '../support/factories';

// Mock storage
jest.mock('@/lib/storage', () => ({
  zustandStorage: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
  STORAGE_KEYS: {
    AUTH_STATE: 'auth-state',
    PROFILE_STATE: 'profile-state',
    SETTINGS_STATE: 'settings-state',
    WARDROBE_CACHE: 'wardrobe-cache',
    RECOMMENDATIONS_CACHE: 'recommendations-cache',
    LAST_SYNC: 'last-sync',
  },
}));

describe('Profile Store', () => {
  beforeEach(() => {
    resetProfileFactory();
    useProfileStore.getState().reset();
  });

  describe('Constants', () => {
    it('[P1] MAX_PROFILES is 3 (MVP requirement)', () => {
      // GIVEN/WHEN: Checking constant
      // THEN: MAX_PROFILES is 3
      expect(MAX_PROFILES).toBe(3);
    });
  });

  describe('Initial State', () => {
    it('[P1] has correct initial state values', () => {
      // GIVEN: Fresh store
      const state = useProfileStore.getState();

      // THEN: Initial state is correct
      expect(state.profiles).toEqual([]);
      expect(state.activeProfileId).toBeNull();
      expect(state.activeProfile).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isSwitching).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('setProfiles', () => {
    it('[P1] sets profiles array', () => {
      // GIVEN: Mock profiles
      const profiles = createMockProfiles(2);

      // WHEN: Setting profiles
      useProfileStore.getState().setProfiles(profiles);

      // THEN: Profiles are set
      expect(useProfileStore.getState().profiles).toEqual(profiles);
    });

    it('[P1] sets first profile as active when no active profile', () => {
      // GIVEN: Mock profiles
      const profiles = createMockProfiles(2);

      // WHEN: Setting profiles with no prior active profile
      useProfileStore.getState().setProfiles(profiles);

      // THEN: First profile becomes active
      const state = useProfileStore.getState();
      expect(state.activeProfileId).toBe(profiles[0].id);
      expect(state.activeProfile).toEqual(profiles[0]);
    });

    it('[P1] preserves active profile if still in list', () => {
      // GIVEN: Existing active profile
      const profiles = createMockProfiles(3);
      useProfileStore.getState().setProfiles(profiles);
      useProfileStore.getState().setActiveProfile(profiles[1].id);

      // WHEN: Setting profiles with same IDs
      const updatedProfiles = profiles.map((p) => ({ ...p, display_name: 'Updated' }));
      useProfileStore.getState().setProfiles(updatedProfiles);

      // THEN: Active profile is preserved (with updates)
      const state = useProfileStore.getState();
      expect(state.activeProfileId).toBe(profiles[1].id);
      expect(state.activeProfile?.display_name).toBe('Updated');
    });
  });

  describe('addProfile', () => {
    it('[P1] adds profile to list', () => {
      // GIVEN: One existing profile
      const existing = createMockProfile();
      useProfileStore.getState().setProfiles([existing]);

      // WHEN: Adding new profile
      const newProfile = createMockProfile();
      useProfileStore.getState().addProfile(newProfile);

      // THEN: Profile is added
      const profiles = useProfileStore.getState().profiles;
      expect(profiles.length).toBe(2);
      expect(profiles).toContainEqual(newProfile);
    });

    it('[P1] sets error when MAX_PROFILES reached', () => {
      // GIVEN: MAX_PROFILES already exist
      const profiles = createMockProfiles(MAX_PROFILES);
      useProfileStore.getState().setProfiles(profiles);

      // WHEN: Trying to add another profile
      useProfileStore.getState().addProfile(createMockProfile());

      // THEN: Error is set
      expect(useProfileStore.getState().error).toContain(`${MAX_PROFILES}`);
      expect(useProfileStore.getState().profiles.length).toBe(MAX_PROFILES);
    });

    it('[P1] clears error on successful add', () => {
      // GIVEN: Existing error
      useProfileStore.getState().setError('Previous error');

      // WHEN: Adding profile successfully
      useProfileStore.getState().addProfile(createMockProfile());

      // THEN: Error is cleared
      expect(useProfileStore.getState().error).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('[P1] updates profile in list', () => {
      // GIVEN: Existing profiles
      const profiles = createMockProfiles(2);
      useProfileStore.getState().setProfiles(profiles);

      // WHEN: Updating first profile
      useProfileStore.getState().updateProfile(profiles[0].id, { display_name: 'Updated Name' });

      // THEN: Profile is updated
      const updated = useProfileStore.getState().profiles.find((p) => p.id === profiles[0].id);
      expect(updated?.display_name).toBe('Updated Name');
    });

    it('[P1] updates active profile if it is the one being updated', () => {
      // GIVEN: Active profile
      const profiles = createMockProfiles(1);
      useProfileStore.getState().setProfiles(profiles);

      // WHEN: Updating active profile
      useProfileStore.getState().updateProfile(profiles[0].id, { display_name: 'Active Updated' });

      // THEN: Active profile is also updated
      expect(useProfileStore.getState().activeProfile?.display_name).toBe('Active Updated');
    });
  });

  describe('removeProfile', () => {
    it('[P1] removes profile from list', () => {
      // GIVEN: Multiple profiles
      const profiles = createMockProfiles(3);
      useProfileStore.getState().setProfiles(profiles);

      // WHEN: Removing middle profile
      useProfileStore.getState().removeProfile(profiles[1].id);

      // THEN: Profile is removed
      const remaining = useProfileStore.getState().profiles;
      expect(remaining.length).toBe(2);
      expect(remaining.find((p) => p.id === profiles[1].id)).toBeUndefined();
    });

    it('[P1] switches to first profile when active profile removed', () => {
      // GIVEN: Active profile is second in list
      const profiles = createMockProfiles(3);
      useProfileStore.getState().setProfiles(profiles);
      useProfileStore.getState().setActiveProfile(profiles[1].id);

      // WHEN: Removing active profile
      useProfileStore.getState().removeProfile(profiles[1].id);

      // THEN: First remaining profile becomes active
      const state = useProfileStore.getState();
      expect(state.activeProfileId).toBe(profiles[0].id);
      expect(state.activeProfile).toEqual(profiles[0]);
    });

    it('[P1] clears active profile when last profile removed', () => {
      // GIVEN: Single profile
      const profile = createMockProfile();
      useProfileStore.getState().setProfiles([profile]);

      // WHEN: Removing last profile
      useProfileStore.getState().removeProfile(profile.id);

      // THEN: Active profile is cleared
      const state = useProfileStore.getState();
      expect(state.profiles).toEqual([]);
      expect(state.activeProfileId).toBeNull();
      expect(state.activeProfile).toBeNull();
    });
  });

  describe('setActiveProfile', () => {
    it('[P1] sets active profile by ID', () => {
      // GIVEN: Multiple profiles
      const profiles = createMockProfiles(3);
      useProfileStore.getState().setProfiles(profiles);

      // WHEN: Setting second profile as active
      useProfileStore.getState().setActiveProfile(profiles[1].id);

      // THEN: Second profile is active
      const state = useProfileStore.getState();
      expect(state.activeProfileId).toBe(profiles[1].id);
      expect(state.activeProfile).toEqual(profiles[1]);
    });

    it('[P1] does nothing for invalid profile ID', () => {
      // GIVEN: Existing profiles
      const profiles = createMockProfiles(2);
      useProfileStore.getState().setProfiles(profiles);

      // WHEN: Setting non-existent profile ID
      useProfileStore.getState().setActiveProfile('non-existent-id');

      // THEN: Active profile unchanged (first profile)
      expect(useProfileStore.getState().activeProfileId).toBe(profiles[0].id);
    });

    it('[P1] clears error when setting active profile', () => {
      // GIVEN: Error and profiles
      const profiles = createMockProfiles(2);
      useProfileStore.getState().setProfiles(profiles);
      useProfileStore.getState().setError('Previous error');

      // WHEN: Setting active profile
      useProfileStore.getState().setActiveProfile(profiles[1].id);

      // THEN: Error is cleared
      expect(useProfileStore.getState().error).toBeNull();
    });
  });

  describe('clearActiveProfile', () => {
    it('[P1] clears active profile', () => {
      // GIVEN: Active profile set
      const profiles = createMockProfiles(2);
      useProfileStore.getState().setProfiles(profiles);

      // WHEN: Clearing active profile
      useProfileStore.getState().clearActiveProfile();

      // THEN: Active profile is null
      const state = useProfileStore.getState();
      expect(state.activeProfileId).toBeNull();
      expect(state.activeProfile).toBeNull();
    });
  });

  describe('Loading States', () => {
    it('[P1] setLoading updates isLoading', () => {
      // WHEN: Setting loading
      useProfileStore.getState().setLoading(true);

      // THEN: isLoading is true
      expect(useProfileStore.getState().isLoading).toBe(true);
    });

    it('[P1] setSwitching updates isSwitching', () => {
      // WHEN: Setting switching
      useProfileStore.getState().setSwitching(true);

      // THEN: isSwitching is true
      expect(useProfileStore.getState().isSwitching).toBe(true);
    });
  });

  describe('Helper Methods', () => {
    it('[P1] canAddProfile returns true when under limit', () => {
      // GIVEN: One profile
      useProfileStore.getState().setProfiles(createMockProfiles(1));

      // THEN: Can add more profiles
      expect(useProfileStore.getState().canAddProfile()).toBe(true);
    });

    it('[P1] canAddProfile returns false at limit', () => {
      // GIVEN: MAX_PROFILES exist
      useProfileStore.getState().setProfiles(createMockProfiles(MAX_PROFILES));

      // THEN: Cannot add more profiles
      expect(useProfileStore.getState().canAddProfile()).toBe(false);
    });

    it('[P1] getProfileById returns profile for valid ID', () => {
      // GIVEN: Profiles
      const profiles = createMockProfiles(3);
      useProfileStore.getState().setProfiles(profiles);

      // WHEN: Getting profile by ID
      const result = useProfileStore.getState().getProfileById(profiles[1].id);

      // THEN: Correct profile returned
      expect(result).toEqual(profiles[1]);
    });

    it('[P1] getProfileById returns undefined for invalid ID', () => {
      // GIVEN: Profiles
      useProfileStore.getState().setProfiles(createMockProfiles(2));

      // WHEN: Getting non-existent profile
      const result = useProfileStore.getState().getProfileById('non-existent');

      // THEN: Returns undefined
      expect(result).toBeUndefined();
    });
  });

  describe('reset', () => {
    it('[P1] resets to initial state', () => {
      // GIVEN: Modified state
      useProfileStore.getState().setProfiles(createMockProfiles(2));
      useProfileStore.getState().setLoading(true);
      useProfileStore.getState().setSwitching(true);
      useProfileStore.getState().setError('Error');

      // WHEN: Resetting
      useProfileStore.getState().reset();

      // THEN: All values reset to initial
      const state = useProfileStore.getState();
      expect(state.profiles).toEqual([]);
      expect(state.activeProfileId).toBeNull();
      expect(state.activeProfile).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isSwitching).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
