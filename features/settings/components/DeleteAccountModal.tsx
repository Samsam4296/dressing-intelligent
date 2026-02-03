/**
 * DeleteAccountModal Component
 * Story 1.10: Suppression de Compte
 *
 * Modal for confirming account deletion with password re-authentication.
 * Uses useDeleteAccount hook for all state and business logic.
 *
 * AC#1: Given l'utilisateur tape "Supprimer mon compte" dans Settings
 *       Then DeleteAccountModal s'affiche avec champ password
 * AC#3: After deletion → clear state, sign out, redirect to Welcome
 * AC#4: Wrong password → error "Mot de passe incorrect", button disabled
 * AC#5: Standard UX conventions (dark mode, accessibility, haptics, toast, Sentry)
 *
 * NFR-A1: Touch targets 44x44 minimum
 * NFR-P1: Animations 60fps using Reanimated
 */

import { Modal, View, Text, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { useColorScheme } from 'nativewind';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useDeleteAccount } from '../hooks/useDeleteAccount';

// ============================================
// Types
// ============================================

interface DeleteAccountModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** User's email for re-authentication */
  userEmail: string;
  /** Callback when modal should close */
  onClose: () => void;
}

// ============================================
// Component
// ============================================

/**
 * Modal for confirming account deletion with password re-authentication
 *
 * @example
 * ```tsx
 * <DeleteAccountModal
 *   visible={isDeleteAccountModalVisible}
 *   userEmail={user?.email || ''}
 *   onClose={() => setDeleteAccountModalVisible(false)}
 * />
 * ```
 */
export const DeleteAccountModal = ({ visible, userEmail, onClose }: DeleteAccountModalProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // All state and logic is managed by the hook
  const { password, isPending, error, setPassword, handleDelete, resetAndClose } = useDeleteAccount(
    {
      userEmail,
      onClose,
    }
  );

  // Check if form is valid for submission
  const canSubmit = password.trim().length > 0 && !isPending;

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
        {/* Tap outside to close (only if not pending) */}
        <Pressable
          className="flex-1"
          onPress={isPending ? undefined : resetAndClose}
          accessibilityRole="button"
          accessibilityLabel="Fermer le modal"
          testID="delete-account-modal-backdrop"
        />

        {/* Modal Content */}
        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          exiting={SlideOutDown.duration(200)}
          className="rounded-t-3xl bg-white dark:bg-gray-900"
          testID="delete-account-modal">
          <View className="p-6">
            {/* Handle indicator */}
            <View className="mb-4 h-1 w-12 self-center rounded-full bg-gray-300 dark:bg-gray-700" />

            {/* Header with warning icon */}
            <View className="mb-4 flex-row items-center justify-center">
              <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <Ionicons name="warning-outline" size={24} color="#EF4444" />
              </View>
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                Supprimer mon compte
              </Text>
            </View>

            {/* Warning message */}
            <View className="mb-4 rounded-xl bg-red-50 p-4 dark:bg-red-900/20">
              <Text className="text-center text-sm font-medium text-red-700 dark:text-red-300">
                Attention : Cette action est irréversible. Toutes vos données seront supprimées
                définitivement :
              </Text>
              <View className="mt-2">
                <Text className="text-sm text-red-600 dark:text-red-400">
                  • Tous vos profils et leurs vêtements
                </Text>
                <Text className="text-sm text-red-600 dark:text-red-400">
                  • Vos recommandations et historique
                </Text>
                <Text className="text-sm text-red-600 dark:text-red-400">
                  • Vos photos et paramètres
                </Text>
              </View>
            </View>

            {/* Password input for re-authentication (AC#1) */}
            <View className="mb-4">
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirmez votre mot de passe pour continuer
              </Text>
              <TextInput
                className={`h-12 w-full rounded-xl border px-4 ${
                  error
                    ? 'border-red-500 dark:border-red-400'
                    : 'border-gray-300 dark:border-gray-600'
                } bg-white text-gray-900 dark:bg-gray-800 dark:text-white`}
                placeholder="Mot de passe"
                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!isPending}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Mot de passe"
                accessibilityHint="Entrez votre mot de passe pour confirmer la suppression"
                testID="delete-account-password-input"
              />
            </View>

            {/* Error message (AC#4) */}
            {error && (
              <View className="mb-4 flex-row items-center rounded-xl bg-red-50 p-3 dark:bg-red-900/30">
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color={isDark ? '#FCA5A5' : '#DC2626'}
                />
                <Text className="ml-2 flex-1 text-sm text-red-700 dark:text-red-300">{error}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              {/* Cancel Button */}
              <Pressable
                className="min-h-[56px] flex-1 items-center justify-center rounded-xl bg-gray-100 active:bg-gray-200 dark:bg-gray-800 dark:active:bg-gray-700"
                onPress={resetAndClose}
                disabled={isPending}
                accessibilityRole="button"
                accessibilityLabel="Annuler la suppression"
                testID="cancel-delete-account-button">
                <Text className="text-base font-semibold text-gray-700 dark:text-gray-300">
                  Annuler
                </Text>
              </Pressable>

              {/* Delete Button (Destructive) */}
              <Pressable
                className={`min-h-[56px] flex-1 items-center justify-center rounded-xl ${
                  canSubmit
                    ? 'bg-red-600 active:bg-red-700 dark:bg-red-500 dark:active:bg-red-600'
                    : 'bg-gray-300 dark:bg-gray-700'
                }`}
                onPress={handleDelete}
                disabled={!canSubmit}
                accessibilityRole="button"
                accessibilityLabel="Confirmer la suppression du compte"
                accessibilityState={{ disabled: !canSubmit }}
                accessibilityHint={
                  canSubmit
                    ? 'Appuyez pour supprimer définitivement votre compte'
                    : 'Entrez votre mot de passe pour activer ce bouton'
                }
                testID="confirm-delete-account-button">
                {isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View className="flex-row items-center">
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={canSubmit ? '#FFFFFF' : isDark ? '#6B7280' : '#9CA3AF'}
                    />
                    <Text
                      className={`ml-2 text-base font-semibold ${
                        canSubmit ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                      }`}>
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

export default DeleteAccountModal;
