/**
 * useRequireNoProfile Hook
 * Story 1.5: Création Premier Profil
 *
 * Subtask 8.4: Navigation guard that redirects to home if user already has a profile.
 * Used to prevent access to create-profile screen after first profile is created.
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useProfiles } from './useProfiles';
import { logger } from '@/lib/logger';

/**
 * Navigation guard for create-profile screen
 *
 * Redirects to home if user already has at least one profile.
 * Call this at the top of CreateProfileScreen.
 *
 * @param enabled - Whether to run the check (default true)
 * @returns Object with loading state and profile count
 *
 * Usage:
 * ```typescript
 * const { isLoading, hasProfile } = useRequireNoProfile();
 *
 * if (isLoading) return <LoadingScreen />;
 * // If hasProfile is true, redirect already happened
 * ```
 */
export const useRequireNoProfile = (enabled = true) => {
  const router = useRouter();
  const { data: profiles, isLoading, isError } = useProfiles(undefined, enabled);

  const hasProfile = profiles && profiles.length > 0;

  useEffect(() => {
    // Only redirect when we have data and user has profile
    if (!isLoading && hasProfile) {
      logger.info('User already has profile, redirecting to home', {
        feature: 'profiles',
        action: 'useRequireNoProfile',
      });
      router.replace('/(tabs)/');
    }
  }, [isLoading, hasProfile, router]);

  return {
    isLoading,
    isError,
    hasProfile,
    profileCount: profiles?.length ?? 0,
  };
};
