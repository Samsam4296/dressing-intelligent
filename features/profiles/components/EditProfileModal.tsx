/**
 * EditProfileModal Component
 * Story 1.8: Modification de Profil
 *
 * Modal for editing an existing profile.
 * Uses useEditProfile hook for all state and business logic.
 *
 * AC#1: Given l'utilisateur long-press sur son profil actif When le modal s'ouvre Then le nom et avatar actuels sont pré-remplis
 * AC#2: Given l'utilisateur modifie le nom When il tape "Enregistrer" Then les modifications sont sauvegardées et l'UI se met à jour (optimistic update)
 * AC#3: Given le nom est invalide (<2 ou >30 chars) Then une erreur inline s'affiche et le bouton Enregistrer est désactivé
 * AC#4: Given l'utilisateur modifie l'avatar When il sélectionne une nouvelle image Then l'image est compressée et prévisualisée
 * AC#5: Given une erreur survient (réseau/serveur) Then le formulaire reste ouvert avec les données saisies
 * AC#6: Standard UX conventions apply (dark mode, accessibility, haptics, toast, Sentry - see Stories 1.5-1.7)
 *
 * NFR-A1: Touch targets 44x44 minimum
 * NFR-P1: Animations 60fps using Reanimated
 */

import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AvatarPicker } from './AvatarPicker';
import { useEditProfile } from '../hooks/useEditProfile';
import type { Profile } from '../types/profile.types';

// ============================================
// Types
// ============================================

interface EditProfileModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Profile to edit */
  profile: Profile | null;
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when profile is successfully updated */
  onProfileUpdated?: () => void;
}

// ============================================
// Component
// ============================================

/**
 * Modal for editing an existing profile
 *
 * @example
 * ```tsx
 * <EditProfileModal
 *   visible={isEditModalVisible}
 *   profile={profileToEdit}
 *   onClose={() => setEditModalVisible(false)}
 *   onProfileUpdated={() => console.log('Profile updated!')}
 * />
 * ```
 */
export const EditProfileModal = ({
  visible,
  profile,
  onClose,
  onProfileUpdated,
}: EditProfileModalProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // All state and logic is managed by the hook
  const {
    name,
    setName,
    avatarUri,
    nameValidation,
    isValidName,
    hasChanges,
    canSubmit,
    isPending,
    shakeStyle,
    handleSave,
    handleAvatarSelected,
    resetAndClose,
  } = useEditProfile({
    profile,
    visible,
    onClose,
    onProfileUpdated,
  });

  // Don't render if no profile
  if (!profile) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={resetAndClose}
      statusBarTranslucent>
      {/* Backdrop */}
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        className="flex-1 justify-end bg-black/50">
        {/* Tap outside to close */}
        <Pressable
          className="flex-1"
          onPress={resetAndClose}
          accessibilityRole="button"
          accessibilityLabel="Fermer le modal"
          testID="edit-modal-backdrop"
        />

        {/* Modal Content */}
        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          exiting={SlideOutDown.duration(200)}
          className="rounded-t-3xl bg-white dark:bg-gray-900"
          testID="edit-profile-modal">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
            <View className="p-6">
              {/* Handle indicator */}
              <View className="mb-4 h-1 w-12 self-center rounded-full bg-gray-300 dark:bg-gray-700" />

              {/* Header */}
              <View className="mb-6 flex-row items-center justify-between">
                <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                  Modifier le profil
                </Text>
                <Pressable
                  onPress={resetAndClose}
                  className="min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 dark:bg-gray-800 dark:active:bg-gray-700"
                  accessibilityRole="button"
                  accessibilityLabel="Fermer"
                  testID="close-edit-modal-button">
                  <Ionicons name="close" size={24} color={isDark ? '#E5E7EB' : '#374151'} />
                </Pressable>
              </View>

              {/* Avatar Picker with current avatar pre-filled (AC#1, AC#4) */}
              <View className="mb-6 items-center">
                <AvatarPicker
                  avatarUri={avatarUri}
                  onAvatarSelected={handleAvatarSelected}
                  isLoading={isPending}
                  size={96}
                />
                <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Appuyer pour modifier l&apos;avatar
                </Text>
              </View>

              {/* Name Input with validation (AC#1, AC#3) */}
              <Animated.View style={shakeStyle} className="mb-6">
                <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nom du profil
                </Text>
                <TextInput
                  className={`h-14 rounded-xl bg-gray-100 px-4 text-base text-gray-900 dark:bg-gray-800 dark:text-white ${
                    !isValidName && name.length > 0
                      ? 'border-2 border-red-500'
                      : 'border border-gray-200 dark:border-gray-700'
                  }`}
                  placeholder="Emma, Lucas, Sophie..."
                  placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  maxLength={30}
                  value={name}
                  onChangeText={setName}
                  autoFocus={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                  editable={!isPending}
                  accessibilityLabel="Nom du profil"
                  accessibilityHint="Entrez un nom entre 2 et 30 caractères"
                  testID="edit-profile-name-input"
                />
                {/* Validation feedback (AC#3) */}
                <View className="mt-2 flex-row justify-between">
                  <Text
                    className={`text-xs ${
                      !isValidName && name.length > 0
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-gray-500 dark:text-gray-500'
                    }`}
                    testID="edit-name-validation-message">
                    {!isValidName && name.length > 0
                      ? nameValidation.error
                      : 'Minimum 2 caractères'}
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-500">{name.length}/30</Text>
                </View>
              </Animated.View>

              {/* Save Button (AC#2, AC#3 - disabled if invalid) */}
              <Pressable
                className={`min-h-[56px] items-center justify-center rounded-xl ${
                  canSubmit
                    ? 'bg-blue-600 active:bg-blue-700 dark:bg-blue-500 dark:active:bg-blue-600'
                    : 'bg-gray-300 dark:bg-gray-700'
                }`}
                onPress={handleSave}
                disabled={!canSubmit}
                accessibilityRole="button"
                accessibilityLabel="Enregistrer les modifications"
                accessibilityState={{ disabled: !canSubmit }}
                accessibilityHint={
                  canSubmit
                    ? 'Appuyez pour enregistrer les modifications'
                    : hasChanges
                      ? 'Corrigez les erreurs de validation'
                      : "Modifiez le nom ou l'avatar pour activer ce bouton"
                }
                testID="save-profile-button">
                {isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text
                    className={`text-lg font-semibold ${
                      canSubmit ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                    Enregistrer
                  </Text>
                )}
              </Pressable>

              {/* Safe area padding for bottom */}
              <View className="h-6" />
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default EditProfileModal;
