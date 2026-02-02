/**
 * Profile Factory
 *
 * Factory functions for creating test profile data.
 * Uses deterministic data with override support.
 */

import type { Profile } from '@/types/database.types';

let profileIdCounter = 1;

/**
 * Create a mock Profile object
 */
export const createMockProfile = (overrides: Partial<Profile> = {}): Profile => {
  const id = `profile-${profileIdCounter++}`;
  return {
    id,
    user_id: 'user-1',
    name: `Profile ${profileIdCounter}`,
    avatar_url: null,
    gender: 'neutral',
    style_preferences: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as Profile;
};

/**
 * Create multiple mock profiles
 */
export const createMockProfiles = (count: number, overrides: Partial<Profile> = {}): Profile[] => {
  return Array.from({ length: count }, () => createMockProfile(overrides));
};

/**
 * Reset factory counter (call in beforeEach)
 */
export const resetProfileFactory = (): void => {
  profileIdCounter = 1;
};
