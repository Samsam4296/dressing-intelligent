/**
 * Switch Profile Service
 * Story 1.7: Switch Entre Profils
 *
 * API calls for switching active profile with Supabase RPC.
 * CRITICAL: All methods return { data, error } format per project-context.md
 * CRITICAL: Use logger (NEVER console.log) per project-context.md
 *
 * AC#3: Switch executes in less than 1 second (NFR-P4)
 * AC#4: All new profile data is loaded
 * AC#6: Active profile persisted in MMKV
 * AC#11: Offline modifications synchronized on reconnection
 * AC#14: Errors logged to Sentry
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { captureError, logger } from '@/lib/logger';
import type { ProfileError } from '../types/profile.types';

// ============================================
// Types
// ============================================

export interface SwitchResult {
  /** Previous active profile ID */
  previousProfileId: string | null;
  /** New active profile ID */
  newProfileId: string;
  /** Whether switch was performed offline */
  offline?: boolean;
}

export interface SwitchProfileResponse {
  data: SwitchResult | null;
  error: ProfileError | null;
}

// ============================================
// Service
// ============================================

/**
 * Service for switching active profile
 *
 * Uses the RPC function `switch_active_profile` for atomic switch operation.
 * Falls back to direct UPDATE if RPC is not available.
 */
export const switchProfileService = {
  /**
   * Switch to a new active profile
   *
   * @param newProfileId - Profile UUID to activate
   * @returns SwitchProfileResponse with result or error
   *
   * @example
   * ```typescript
   * const result = await switchProfileService.switchProfile('uuid-here');
   * if (result.error) {
   *   showToast({ type: 'error', message: result.error.message });
   * } else {
   *   // Update local state
   *   setCurrentProfileId(result.data.newProfileId);
   * }
   * ```
   */
  async switchProfile(newProfileId: string): Promise<SwitchProfileResponse> {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: {
          code: 'CONFIG_ERROR',
          message: "Le service n'est pas configuré",
        },
      };
    }

    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return {
          data: null,
          error: {
            code: 'AUTH_ERROR',
            message: 'Utilisateur non authentifié',
          },
        };
      }

      // Get current active profile (for return value)
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      const previousProfileId = currentProfile?.id || null;

      // Try RPC function first (atomic transaction)
      const { data: rpcResult, error: rpcError } = await supabase.rpc('switch_active_profile', {
        p_user_id: user.id,
        p_new_profile_id: newProfileId,
      });

      if (rpcError) {
        // RPC might not exist, fall back to direct update
        if (rpcError.code === '42883') {
          // Function does not exist
          logger.info('RPC switch_active_profile not found, using fallback', {
            feature: 'profiles',
            action: 'switchProfile',
          });

          // Fallback: Use direct UPDATE (trigger handles deactivation)
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ is_active: true })
            .eq('id', newProfileId)
            .eq('user_id', user.id);

          if (updateError) {
            throw updateError;
          }
        } else {
          throw rpcError;
        }
      }

      logger.info('Profile switched successfully', {
        feature: 'profiles',
        action: 'switchProfile',
        extra: {
          previousProfileId,
          newProfileId,
        },
      });

      return {
        data: {
          previousProfileId,
          newProfileId,
        },
        error: null,
      };
    } catch (error) {
      captureError(error, 'profiles', 'switchProfile', { newProfileId });

      // Map error to user-friendly message
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';

      if (errorMessage.includes('not found') || errorMessage.includes('not owned')) {
        return {
          data: null,
          error: {
            code: 'PROFILE_NOT_FOUND',
            message: 'Profil introuvable ou non autorisé',
          },
        };
      }

      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        return {
          data: null,
          error: {
            code: 'NETWORK_ERROR',
            message: 'Erreur de connexion. Vérifiez votre connexion internet',
          },
        };
      }

      return {
        data: null,
        error: {
          code: 'SWITCH_ERROR',
          message: 'Impossible de changer de profil',
        },
      };
    }
  },

  /**
   * Sync a pending profile switch (for offline scenarios)
   *
   * Called when network connection is restored to sync offline switch.
   *
   * @param newProfileId - Profile UUID that was switched to offline
   * @returns SwitchProfileResponse with result or error
   */
  async syncPendingSwitch(newProfileId: string): Promise<SwitchProfileResponse> {
    logger.info('Syncing pending profile switch', {
      feature: 'profiles',
      action: 'syncPendingSwitch',
      extra: { newProfileId },
    });

    return this.switchProfile(newProfileId);
  },
};
