/**
 * useValidateActiveProfile Hook
 * Story 1.7: Switch Entre Profils
 *
 * Validates that the current active profile still exists.
 * Automatically switches to the first available profile if active profile is deleted.
 *
 * AC#18: If active profile is deleted, first remaining profile becomes active automatically
 */

import { useEffect, useRef } from 'react';
import { useProfiles, useSwitchProfile } from './useProfiles';
import { useCurrentProfileId } from '../stores/useProfileStore';
import { logger } from '@/lib/logger';
import { showToast } from '@/shared/components/Toast';

// ============================================
// Hook
// ============================================

/**
 * Hook to validate and auto-recover active profile
 *
 * Monitors profile list and current active profile ID.
 * If the active profile no longer exists (was deleted), automatically
 * switches to the first available profile.
 *
 * Should be called once at the app root level (e.g., in _layout.tsx).
 *
 * AC#18: Given le profil actif est supprimé (Story 1.9 future)
 *        When l'utilisateur revient sur l'app
 *        Then le premier profil restant devient actif automatiquement
 *
 * @example
 * ```tsx
 * // In app/(tabs)/_layout.tsx
 * export default function TabsLayout() {
 *   useValidateActiveProfile();
 *
 *   return <Tabs>...</Tabs>;
 * }
 * ```
 */
export const useValidateActiveProfile = () => {
  const currentProfileId = useCurrentProfileId();
  const { data: profiles, isSuccess } = useProfiles();
  const { mutate: switchProfile } = useSwitchProfile();

  // Track if we've already attempted recovery to avoid loops
  const hasAttemptedRecovery = useRef(false);

  useEffect(() => {
    // Only run when profiles are loaded successfully
    if (!isSuccess || !profiles) {
      return;
    }

    const profileList = Array.isArray(profiles) ? profiles : [];

    // If no profiles exist, nothing to validate
    if (profileList.length === 0) {
      return;
    }

    // If no current profile ID is set, switch to first available
    if (!currentProfileId) {
      const firstProfile = profileList[0];
      if (firstProfile && !hasAttemptedRecovery.current) {
        hasAttemptedRecovery.current = true;

        logger.info('No active profile set, switching to first available', {
          feature: 'profiles',
          action: 'validateActiveProfile',
          extra: { profileId: firstProfile.id },
        });

        switchProfile(firstProfile.id);
      }
      return;
    }

    // Check if current profile still exists in the list
    const profileExists = profileList.some((p) => p.id === currentProfileId);

    if (!profileExists && !hasAttemptedRecovery.current) {
      // Active profile was deleted, switch to first available
      const firstProfile = profileList[0];

      if (firstProfile) {
        hasAttemptedRecovery.current = true;

        logger.warn('Active profile no longer exists, switching to first available', {
          feature: 'profiles',
          action: 'validateActiveProfile',
          extra: {
            deletedProfileId: currentProfileId,
            newProfileId: firstProfile.id,
          },
        });

        // Story 1.14 AC#3: Show Toast when profile was deleted on another device
        showToast({
          type: 'warning',
          message: 'Votre profil a été supprimé. Veuillez en sélectionner un autre.',
        });

        switchProfile(firstProfile.id);
      }
    } else if (profileExists) {
      // Reset recovery flag when profile is valid
      hasAttemptedRecovery.current = false;
    }
  }, [currentProfileId, profiles, isSuccess, switchProfile]);
};

export default useValidateActiveProfile;
