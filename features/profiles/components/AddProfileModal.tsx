/**
 * AddProfileModal Component
 * Story 1.6: Création Profils Additionnels
 *
 * Modal for creating additional profiles.
 *
 * AC#3: Modal/écran de création avec nom (2-30 caractères) et avatar optionnel
 * AC#4: Nouveau profil créé avec données isolées (RLS profile_id)
 * AC#5: Nouveau profil marqué comme NON actif (is_active = false)
 * AC#9: Toast de succès "Profil créé avec succès"
 * AC#10: Feedback haptique confirme la création (expo-haptics)
 * AC#11: Accessibilité (touch targets 44x44, contraste 4.5:1)
 * AC#12: Mode sombre natif supporté (NFR-A4)
 *
 * NFR-A1: Touch targets 44x44 minimum
 * NFR-P1: Animations 60fps using Reanimated
 */

import { useState, useCallback } from 'react';
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
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { AvatarPicker } from './AvatarPicker';
import { useCreateProfile } from '../hooks/useProfiles';
import { useShakeAnimation } from '@/features/auth';
import { showToast } from '@/shared/components/Toast';
import { validateProfileName } from '../types/profile.types';

// ============================================
// Types
// ============================================

interface AddProfileModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when profile is successfully created */
  onProfileCreated?: () => void;
}

// ============================================
// Component
// ============================================

/**
 * Modal for adding a new profile
 *
 * @example
 * ```tsx
 * <AddProfileModal
 *   visible={isAddModalVisible}
 *   onClose={() => setAddModalVisible(false)}
 *   onProfileCreated={() => console.log('Profile created!')}
 * />
 * ```
 */
export const AddProfileModal = ({
  visible,
  onClose,
  onProfileCreated,
}: AddProfileModalProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Form state
  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Mutation hook
  const { mutate: createProfile, isPending } = useCreateProfile();

  // Shake animation for validation error
  const { shakeStyle, triggerShake } = useShakeAnimation();

  // Validation
  const nameValidation = validateProfileName(name);
  const isValidName = name.length === 0 || nameValidation.isValid;
  const canSubmit = nameValidation.isValid && !isPending;

  /**
   * Reset form and close modal
   */
  const resetAndClose = useCallback(() => {
    setName('');
    setAvatarUri(null);
    onClose();
  }, [onClose]);

  /**
   * Handle form submission
   */
  const handleCreate = useCallback(() => {
    // Validate name
    if (!nameValidation.isValid) {
      triggerShake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // Create profile
    createProfile(
      { name: name.trim(), avatarUrl: avatarUri || undefined },
      {
        onSuccess: (profile) => {
          // Success haptic feedback (AC#10)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          // Success toast (AC#9)
          showToast({
            type: 'success',
            message: 'Profil créé avec succès',
          });

          // Reset and close
          resetAndClose();

          // Notify parent
          onProfileCreated?.();
        },
        onError: (error) => {
          // Error haptic feedback
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

          // Error toast with message
          showToast({
            type: 'error',
            message: error.message || 'Erreur lors de la création du profil',
          });

          // Shake animation
          triggerShake();
        },
      }
    );
  }, [name, avatarUri, nameValidation.isValid, createProfile, triggerShake, resetAndClose, onProfileCreated]);

  /**
   * Handle avatar selection
   */
  const handleAvatarSelected = useCallback((uri: string) => {
    setAvatarUri(uri);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

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
          testID="modal-backdrop"
        />

        {/* Modal Content */}
        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          exiting={SlideOutDown.duration(200)}
          className="bg-white dark:bg-gray-900 rounded-t-3xl"
          testID="add-profile-modal"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <View className="p-6">
              {/* Handle indicator */}
              <View className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full self-center mb-4" />

              {/* Header */}
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                  Nouveau profil
                </Text>
                <Pressable
                  onPress={resetAndClose}
                  className="min-w-[44px] min-h-[44px] items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700"
                  accessibilityRole="button"
                  accessibilityLabel="Fermer"
                  testID="close-modal-button"
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={isDark ? '#E5E7EB' : '#374151'}
                  />
                </Pressable>
              </View>

              {/* Avatar Picker (AC#3 - optional avatar) */}
              <View className="items-center mb-6">
                <AvatarPicker
                  avatarUri={avatarUri}
                  onAvatarSelected={handleAvatarSelected}
                  isLoading={isPending}
                  size={96}
                />
                <Text className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Avatar optionnel
                </Text>
              </View>

              {/* Name Input (AC#3 - 2-30 characters) */}
              <Animated.View style={shakeStyle} className="mb-6">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nom du profil
                </Text>
                <TextInput
                  className={`h-14 px-4 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white text-base ${
                    !isValidName && name.length > 0
                      ? 'border-2 border-red-500'
                      : 'border border-gray-200 dark:border-gray-700'
                  }`}
                  placeholder="Emma, Lucas, Sophie..."
                  placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  maxLength={30}
                  value={name}
                  onChangeText={setName}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleCreate}
                  editable={!isPending}
                  accessibilityLabel="Nom du profil"
                  accessibilityHint="Entrez un nom entre 2 et 30 caractères"
                  testID="profile-name-input"
                />
                {/* Validation feedback */}
                <View className="flex-row justify-between mt-2">
                  <Text
                    className={`text-xs ${
                      !isValidName && name.length > 0
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-gray-500 dark:text-gray-500'
                    }`}
                    testID="name-validation-message"
                  >
                    {!isValidName && name.length > 0
                      ? nameValidation.error
                      : 'Minimum 2 caractères'}
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-500">
                    {name.length}/30
                  </Text>
                </View>
              </Animated.View>

              {/* Create Button (AC#11 - touch targets 44x44 min) */}
              <Pressable
                className={`min-h-[56px] rounded-xl justify-center items-center ${
                  canSubmit
                    ? 'bg-blue-600 dark:bg-blue-500 active:bg-blue-700 dark:active:bg-blue-600'
                    : 'bg-gray-300 dark:bg-gray-700'
                }`}
                onPress={handleCreate}
                disabled={!canSubmit}
                accessibilityRole="button"
                accessibilityLabel="Créer le profil"
                accessibilityState={{ disabled: !canSubmit }}
                accessibilityHint={
                  canSubmit
                    ? 'Appuyez pour créer le profil'
                    : 'Entrez un nom valide pour activer ce bouton'
                }
                testID="create-profile-button"
              >
                {isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text
                    className={`font-semibold text-lg ${
                      canSubmit
                        ? 'text-white'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    Créer le profil
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

export default AddProfileModal;
