/**
 * useDeleteProfileModal Hook
 * Story 1.9: Suppression de Profil
 *
 * Custom hook that manages all state and logic for DeleteProfileModal.
 * Separates business logic from UI rendering in the modal component.
 *
 * NOTE: This is distinct from useDeleteProfile in useProfiles.ts which is
 * the raw TanStack Query mutation. This hook orchestrates the full modal flow.
 *
 * Features:
 * - Validation (block last profile deletion)
 * - Service call to profileService.deleteProfile()
 * - Cache invalidation via TanStack Query
 * - Success/error feedback (haptics, toast, Sentry)
 *
 * AC#2: Profile deletion with cascade (handled by DB + Storage cleanup)
 * AC#3: Only non-active profiles deletable via UI. If active profile is
 *       deleted by other means (API direct), useValidateActiveProfile (Story 1.7)
 *       handles auto-switch on next render via profileKeys.all invalidation.
 * AC#4: Block deletion of last profile
 *
 * Auto-switch behavior (AC#3):
 * When this hook invalidates profileKeys.all after deletion, any component
 * using useValidateActiveProfile will automatically detect the orphaned active
 * profile state and switch to the first available profile. The invalidation
 * triggers a refetch which useValidateActiveProfile monitors.
 */

import { useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import * as Sentry from '@sentry/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { profileService } from '../services/profileService';
import { profileKeys } from './useProfiles';
import { showToast } from '@/shared/components/Toast';
import type { Profile } from '../types/profile.types';

// ============================================
// Types
// ============================================

interface UseDeleteProfileModalOptions {
  /** Profile to delete */
  profile: Profile | null;
  /** All profiles (to check if last profile) */
  profiles: Profile[];
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when profile is successfully deleted */
  onProfileDeleted?: () => void;
}

interface UseDeleteProfileModalReturn {
  // State
  isPending: boolean;
  canDelete: boolean;
  isLastProfile: boolean;

  // Actions
  handleDelete: () => Promise<void>;
  resetAndClose: () => void;
}

// ============================================
// Hook
// ============================================

/**
 * Hook for managing DeleteProfileModal state and logic
 *
 * Note: This hook is distinct from useDeleteProfile in useProfiles.ts which is
 * the TanStack Query mutation. This hook manages the complete modal logic.
 *
 * @example
 * ```tsx
 * const {
 *   isPending, canDelete, isLastProfile,
 *   handleDelete, resetAndClose
 * } = useDeleteProfileModal({
 *   profile,
 *   profiles,
 *   onClose,
 *   onProfileDeleted,
 * });
 * ```
 */
export const useDeleteProfileModal = ({
  profile,
  profiles,
  onClose,
  onProfileDeleted,
}: UseDeleteProfileModalOptions): UseDeleteProfileModalReturn => {
  // Loading state
  const [isPending, setIsPending] = useState(false);

  // Query client for cache invalidation
  const queryClient = useQueryClient();

  // Check if this is the last profile (AC#4)
  const isLastProfile = profiles.length <= 1;
  const canDelete = !isLastProfile && profile !== null;

  /**
   * Reset and close modal
   */
  const resetAndClose = useCallback(() => {
    onClose();
  }, [onClose]);

  /**
   * Handle successful deletion
   */
  const handleDeleteSuccess = useCallback(() => {
    // Success haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Success toast
    showToast({
      type: 'success',
      message: 'Profil supprimé avec succès',
    });

    // Invalidate cache to refresh profiles list
    queryClient.invalidateQueries({ queryKey: profileKeys.all });

    // CRITICAL: Call onProfileDeleted BEFORE closing (learning Story 1.8)
    onProfileDeleted?.();

    // Close modal
    resetAndClose();
  }, [queryClient, resetAndClose, onProfileDeleted]);

  /**
   * Handle deletion error
   */
  const handleDeleteError = useCallback(
    (error: Error) => {
      // Log error to Sentry (NEVER console.log per project-context.md)
      Sentry.captureException(error, {
        tags: {
          feature: 'profiles',
          action: 'deleteProfile',
        },
        extra: {
          profileId: profile?.id,
          profileName: profile?.display_name,
        },
      });

      // Error haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      // Error toast
      showToast({
        type: 'error',
        message: error.message || 'Erreur lors de la suppression du profil',
      });
    },
    [profile?.id, profile?.display_name]
  );

  /**
   * Handle profile deletion (AC#2, AC#4)
   */
  const handleDelete = useCallback(async () => {
    // Block if last profile (AC#4)
    if (!canDelete || !profile) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast({
        type: 'error',
        message: 'Vous devez conserver au moins un profil',
      });
      return;
    }

    setIsPending(true);

    try {
      // Call service to delete profile (AC#2)
      const result = await profileService.deleteProfile(profile.id);

      if (result.error) {
        handleDeleteError(new Error(result.error.message));
      } else {
        handleDeleteSuccess();
      }
    } catch (err) {
      handleDeleteError(err instanceof Error ? err : new Error('Erreur inattendue'));
    } finally {
      setIsPending(false);
    }
  }, [canDelete, profile, handleDeleteSuccess, handleDeleteError]);

  return {
    // State
    isPending,
    canDelete,
    isLastProfile,

    // Actions
    handleDelete,
    resetAndClose,
  };
};
