/**
 * useRequireProfile Hook
 * Story 1.5: Création Premier Profil
 *
 * Navigation guard that redirects to create-profile if user has no profile.
 * Used in the main app area to ensure user has created a profile.
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useProfiles } from './useProfiles';
import { logger } from '@/lib/logger';

/**
 * Navigation guard for main app screens
 *
 * Redirects to create-profile if user has no profiles.
 * Call this at the top of screens that require a profile (e.g., Home).
 *
 * @param enabled - Whether to run the check (default true)
 * @returns Object with loading state and profile info
 *
 * Usage:
 * ```typescript
 * const { isLoading, hasProfile } = useRequireProfile();
 *
 * if (isLoading) return <LoadingScreen />;
 * if (!hasProfile) return null; // Redirect in progress
 * ```
 */
export const useRequireProfile = (enabled = true) => {
  const router = useRouter();
  const { data: profiles, isLoading, isError } = useProfiles(undefined, enabled);

  const hasProfile = profiles && profiles.length > 0;

  useEffect(() => {
    // Only redirect when we have data and user has no profile
    if (!isLoading && !hasProfile && !isError) {
      logger.info('User has no profile, redirecting to create-profile', {
        feature: 'profiles',
        action: 'useRequireProfile',
      });
      router.replace('/(auth)/create-profile');
    }
  }, [isLoading, hasProfile, isError, router]);

  return {
    isLoading,
    isError,
    hasProfile,
    profileCount: profiles?.length ?? 0,
  };
};
