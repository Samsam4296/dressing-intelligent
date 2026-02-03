/**
 * DeleteProfileModal Component
 * Story 1.9: Suppression de Profil
 *
 * Modal for confirming profile deletion.
 * Uses useDeleteProfile hook for all state and business logic.
 *
 * AC#1: Given l'utilisateur long-press sur un profil non-actif When il choisit "Supprimer"
 *       Then une modal de confirmation s'affiche avec le nom du profil
 * AC#4: Given c'est le dernier profil Then la suppression est bloquée avec message
 * AC#5: Standard UX conventions apply (dark mode, accessibility, haptics, toast, Sentry)
 *
 * NFR-A1: Touch targets 44x44 minimum
 * NFR-P1: Animations 60fps using Reanimated
 */

import { Modal, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useColorScheme } from 'nativewind';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useDeleteProfileModal } from '../hooks/useDeleteProfileModal';
import type { Profile } from '../types/profile.types';

// ============================================
// Types
// ============================================

interface DeleteProfileModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Profile to delete */
  profile: Profile | null;
  /** All profiles (to check if last profile) */
  profiles: Profile[];
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when profile is successfully deleted */
  onProfileDeleted?: () => void;
}

// ============================================
// Component
// ============================================

/**
 * Modal for confirming profile deletion
 *
 * @example
 * ```tsx
 * <DeleteProfileModal
 *   visible={isDeleteModalVisible}
 *   profile={profileToDelete}
 *   profiles={allProfiles}
 *   onClose={() => setDeleteModalVisible(false)}
 *   onProfileDeleted={() => console.log('Profile deleted!')}
 * />
 * ```
 */
export const DeleteProfileModal = ({
  visible,
  profile,
  profiles,
  onClose,
  onProfileDeleted,
}: DeleteProfileModalProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // All state and logic is managed by the hook
  const { isPending, canDelete, isLastProfile, handleDelete, resetAndClose } = useDeleteProfileModal({
    profile,
    profiles,
    onClose,
    onProfileDeleted,
  });

  // Don't render if no profile
  if (!profile) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={resetAndClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        className="flex-1 bg-black/50 justify-end"
      >
        {/* Tap outside to close */}
        <Pressable
          className="flex-1"
          onPress={resetAndClose}
          accessibilityRole="button"
          accessibilityLabel="Fermer le modal"
          testID="delete-modal-backdrop"
        />

        {/* Modal Content */}
        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          exiting={SlideOutDown.duration(200)}
          className="bg-white dark:bg-gray-900 rounded-t-3xl"
          testID="delete-profile-modal"
        >
          <View className="p-6">
            {/* Handle indicator */}
            <View className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full self-center mb-4" />

            {/* Header with warning icon */}
            <View className="flex-row items-center justify-center mb-4">
              <View className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center mr-3">
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              </View>
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                Supprimer le profil
              </Text>
            </View>

            {/* Profile name and warning (AC#1) */}
            <View className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6">
              <Text className="text-center text-lg text-gray-900 dark:text-white mb-2">
                Voulez-vous supprimer le profil{' '}
                <Text className="font-bold">&quot;{profile.display_name}&quot;</Text> ?
              </Text>
              <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
                Cette action est irréversible. Toutes les données associées (vêtements,
                recommandations) seront supprimées.
              </Text>
            </View>

            {/* Last profile warning (AC#4) */}
            {isLastProfile && (
              <View className="flex-row items-center bg-yellow-50 dark:bg-yellow-900/30 rounded-xl p-4 mb-4">
                <Ionicons
                  name="warning-outline"
                  size={24}
                  color={isDark ? '#FBBF24' : '#D97706'}
                />
                <Text className="flex-1 ml-3 text-sm text-yellow-700 dark:text-yellow-300">
                  Vous devez conserver au moins un profil. La suppression est désactivée.
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              {/* Cancel Button */}
              <Pressable
                className="flex-1 min-h-[56px] rounded-xl justify-center items-center bg-gray-100 dark:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700"
                onPress={resetAndClose}
                disabled={isPending}
                accessibilityRole="button"
                accessibilityLabel="Annuler la suppression"
                testID="cancel-delete-button"
              >
                <Text className="font-semibold text-base text-gray-700 dark:text-gray-300">
                  Annuler
                </Text>
              </Pressable>

              {/* Delete Button (Destructive) */}
              <Pressable
                className={`flex-1 min-h-[56px] rounded-xl justify-center items-center ${
                  canDelete && !isPending
                    ? 'bg-red-600 dark:bg-red-500 active:bg-red-700 dark:active:bg-red-600'
                    : 'bg-gray-300 dark:bg-gray-700'
                }`}
                onPress={handleDelete}
                disabled={!canDelete || isPending}
                accessibilityRole="button"
                accessibilityLabel="Confirmer la suppression du profil"
                accessibilityState={{ disabled: !canDelete || isPending }}
                accessibilityHint={
                  canDelete
                    ? 'Appuyez pour supprimer définitivement le profil'
                    : 'Suppression désactivée car c\'est le dernier profil'
                }
                testID="confirm-delete-button"
              >
                {isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View className="flex-row items-center">
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={canDelete ? '#FFFFFF' : isDark ? '#6B7280' : '#9CA3AF'}
                    />
                    <Text
                      className={`ml-2 font-semibold text-base ${
                        canDelete ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      Supprimer
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>

            {/* Safe area padding for bottom */}
            <View className="h-6" />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default DeleteProfileModal;
