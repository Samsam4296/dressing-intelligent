/**
 * useEditProfile Hook
 * Story 1.8: Modification de Profil
 *
 * Custom hook that manages all state and logic for editing a profile.
 * Separates business logic from UI rendering in EditProfileModal.
 *
 * Features:
 * - Form state management (name, avatar)
 * - Validation with error messages
 * - Optimistic updates with rollback
 * - Avatar upload handling
 * - Success/error feedback (haptics, toast, Sentry)
 */

import { useState, useCallback, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import * as Sentry from '@sentry/react-native';
import { useUpdateProfile, useUploadAvatar } from './useProfiles';
import { useShakeAnimation } from '@/features/auth';
import { showToast } from '@/shared/components/Toast';
import { validateProfileName } from '../types/profile.types';
import type { Profile, NameValidationResult } from '../types/profile.types';

// ============================================
// Types
// ============================================

interface UseEditProfileOptions {
  /** Profile to edit */
  profile: Profile | null;
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when profile is successfully updated */
  onProfileUpdated?: () => void;
}

interface UseEditProfileReturn {
  // Form state
  name: string;
  setName: (name: string) => void;
  avatarUri: string | null;
  avatarChanged: boolean;

  // Validation
  nameValidation: NameValidationResult;
  isValidName: boolean;

  // Derived state
  hasChanges: boolean;
  canSubmit: boolean;
  isPending: boolean;

  // Animation
  shakeStyle: ReturnType<typeof useShakeAnimation>['shakeStyle'];

  // Actions
  handleSave: () => void;
  handleAvatarSelected: (uri: string) => void;
  resetAndClose: () => void;
}

// ============================================
// Hook
// ============================================

/**
 * Hook for managing profile editing state and logic
 *
 * @example
 * ```tsx
 * const {
 *   name, setName, avatarUri, avatarChanged,
 *   nameValidation, isValidName, hasChanges, canSubmit, isPending,
 *   shakeStyle, handleSave, handleAvatarSelected, resetAndClose
 * } = useEditProfile({
 *   profile,
 *   visible,
 *   onClose,
 *   onProfileUpdated,
 * });
 * ```
 */
export const useEditProfile = ({
  profile,
  visible,
  onClose,
  onProfileUpdated,
}: UseEditProfileOptions): UseEditProfileReturn => {
  // Form state - pre-filled with current profile values (AC#1)
  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarChanged, setAvatarChanged] = useState(false);

  // Mutation hooks
  const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfile();
  const { mutate: uploadAvatar, isPending: isUploading } = useUploadAvatar();

  // Shake animation for validation error
  const { shakeStyle, triggerShake } = useShakeAnimation();

  // Combined loading state
  const isPending = isUpdating || isUploading;

  // Pre-fill form when profile changes (AC#1)
  useEffect(() => {
    if (profile && visible) {
      setName(profile.display_name || '');
      setAvatarUri(profile.avatar_url || null);
      setAvatarChanged(false);
    }
  }, [profile, visible]);

  // Validation (AC#3)
  const nameValidation = validateProfileName(name);
  const isValidName = name.length === 0 || nameValidation.isValid;

  // Check if any changes were made
  const hasNameChanged = profile ? name.trim() !== (profile.display_name || '') : false;
  const hasChanges = hasNameChanged || avatarChanged;

  // Can submit only if valid name and changes exist
  const canSubmit = nameValidation.isValid && hasChanges && !isPending;

  /**
   * Reset form and close modal
   */
  const resetAndClose = useCallback(() => {
    setName('');
    setAvatarUri(null);
    setAvatarChanged(false);
    onClose();
  }, [onClose]);

  /**
   * Handle successful update
   */
  const handleUpdateSuccess = useCallback(() => {
    // Success haptic feedback (works on both iOS and Android via expo-haptics)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Success toast
    showToast({
      type: 'success',
      message: 'Profil modifié avec succès',
    });

    // Notify parent BEFORE closing to avoid race conditions
    onProfileUpdated?.();

    // Reset and close
    resetAndClose();
  }, [resetAndClose, onProfileUpdated]);

  /**
   * Handle update error (AC#5: keep form open with data)
   */
  const handleUpdateError = useCallback(
    (error: Error) => {
      // Log error to Sentry (per project-context.md - NEVER console.log in production)
      Sentry.captureException(error, {
        tags: {
          feature: 'profiles',
          action: 'updateProfile',
        },
        extra: {
          profileId: profile?.id,
          profileName: name.trim(),
          avatarChanged,
        },
      });

      // Error haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      // Error toast with message
      showToast({
        type: 'error',
        message: error.message || 'Erreur lors de la modification du profil',
      });

      // Shake animation
      triggerShake();

      // AC#5: Form stays open with data preserved (no reset)
    },
    [profile?.id, name, avatarChanged, triggerShake]
  );

  /**
   * Handle form submission (AC#2)
   */
  const handleSave = useCallback(() => {
    if (!profile || !nameValidation.isValid) {
      triggerShake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // If avatar changed, upload first then update profile (Subtask 2.2)
    if (avatarChanged && avatarUri) {
      uploadAvatar(
        { profileId: profile.id, imageUri: avatarUri },
        {
          onSuccess: (uploadResult) => {
            // Now update profile with new avatar URL
            updateProfile(
              {
                profileId: profile.id,
                updates: {
                  name: name.trim(),
                  avatarUrl: uploadResult?.signedUrl || avatarUri,
                },
              },
              {
                onSuccess: handleUpdateSuccess,
                onError: handleUpdateError,
              }
            );
          },
          onError: handleUpdateError,
        }
      );
    } else {
      // Just update the name (and maybe remove avatar if avatarUri is null)
      updateProfile(
        {
          profileId: profile.id,
          updates: {
            name: name.trim(),
            ...(avatarChanged && { avatarUrl: avatarUri }),
          },
        },
        {
          onSuccess: handleUpdateSuccess,
          onError: handleUpdateError,
        }
      );
    }
  }, [
    profile,
    name,
    avatarUri,
    avatarChanged,
    nameValidation.isValid,
    updateProfile,
    uploadAvatar,
    triggerShake,
    handleUpdateSuccess,
    handleUpdateError,
  ]);

  /**
   * Handle avatar selection (AC#4)
   */
  const handleAvatarSelected = useCallback((uri: string) => {
    setAvatarUri(uri);
    setAvatarChanged(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  return {
    // Form state
    name,
    setName,
    avatarUri,
    avatarChanged,

    // Validation
    nameValidation,
    isValidName,

    // Derived state
    hasChanges,
    canSubmit,
    isPending,

    // Animation
    shakeStyle,

    // Actions
    handleSave,
    handleAvatarSelected,
    resetAndClose,
  };
};

export default useEditProfile;
