/**
 * useSyncPendingSwitch Hook
 * Story 1.7: Switch Entre Profils
 *
 * Syncs pending offline profile switches when network connection is restored.
 *
 * AC#11: Offline modifications synchronized on reconnection
 */

import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { switchProfileService } from '../services/switchProfileService';
import { getPendingSwitch, clearPendingSwitch } from './useProfiles';
import { logger } from '@/lib/logger';
import { showToast } from '@/shared/components/Toast';

// ============================================
// Hook
// ============================================

/**
 * Hook to sync pending profile switches when network is restored
 *
 * Listens for network state changes and syncs any pending offline switches.
 * Should be called once at the app root level (e.g., in _layout.tsx).
 *
 * AC#11: Offline modifications synchronized on reconnection
 *
 * @example
 * ```tsx
 * // In app/(tabs)/_layout.tsx
 * export default function TabsLayout() {
 *   useSyncPendingSwitch();
 *
 *   return <Tabs>...</Tabs>;
 * }
 * ```
 */
export const useSyncPendingSwitch = () => {
  // Track if we've already synced to avoid duplicate syncs
  const hasSynced = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      // Only sync when connected and we haven't already synced this session
      if (state.isConnected && !hasSynced.current) {
        try {
          const pendingSwitch = await getPendingSwitch();

          if (pendingSwitch) {
            // Check if pending switch is recent (within 24 hours)
            const isRecent = Date.now() - pendingSwitch.timestamp < 24 * 60 * 60 * 1000;

            if (isRecent) {
              logger.info('Syncing pending profile switch', {
                feature: 'profiles',
                action: 'syncPendingSwitch',
                extra: { profileId: pendingSwitch.profileId },
              });

              const result = await switchProfileService.syncPendingSwitch(pendingSwitch.profileId);

              if (result.data) {
                // Clear pending switch
                await clearPendingSwitch();
                hasSynced.current = true;

                showToast({
                  type: 'success',
                  message: 'Profil synchronisé',
                });

                logger.info('Pending switch synced successfully', {
                  feature: 'profiles',
                  action: 'syncPendingSwitch',
                });
              } else if (result.error) {
                logger.warn('Failed to sync pending switch', {
                  feature: 'profiles',
                  action: 'syncPendingSwitch',
                  extra: { error: result.error.message },
                });
              }
            } else {
              // Clear stale pending switch
              await clearPendingSwitch();
              logger.info('Cleared stale pending switch', {
                feature: 'profiles',
                action: 'syncPendingSwitch',
              });
            }
          }
        } catch (error) {
          logger.error(error, {
            feature: 'profiles',
            action: 'syncPendingSwitch',
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);
};

export default useSyncPendingSwitch;
