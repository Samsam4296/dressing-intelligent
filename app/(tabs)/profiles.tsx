/**
 * Profiles Management Screen
 * Story 1.6: Création Profils Additionnels
 *
 * AC#8: Après création réussie, le nouveau profil apparaît dans la liste des profils
 *
 * This screen displays the ProfilesList component and handles the AddProfileModal.
 * TanStack Query automatically invalidates and refetches profiles after creation.
 */

import { useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, StatusBar, Pressable } from 'react-native';
import { useColorScheme } from 'nativewind';
import * as Sentry from '@sentry/react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfilesList, AddProfileModal } from '@/features/profiles';
// Toast is now mounted at root _layout.tsx for app-wide visibility

/**
 * Error fallback component shown when ProfilesList crashes
 * Per project-context.md: Error boundary on critical features
 */
function ProfilesErrorFallback({ resetError }: { resetError: () => void }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="flex-1 items-center justify-center p-6">
      <Ionicons name="alert-circle-outline" size={64} color={isDark ? '#EF4444' : '#DC2626'} />
      <Text className="mt-4 text-center text-xl font-bold text-gray-900 dark:text-white">
        Une erreur est survenue
      </Text>
      <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
        Impossible de charger les profils. Veuillez réessayer.
      </Text>
      <Pressable
        className="mt-6 min-h-[48px] items-center justify-center rounded-xl bg-blue-600 px-6 py-3 dark:bg-blue-500"
        onPress={resetError}
        accessibilityRole="button"
        accessibilityLabel="Réessayer">
        <Text className="font-semibold text-white">Réessayer</Text>
      </Pressable>
    </View>
  );
}

/**
 * ProfilesScreen - Main screen for profile management
 * Accessible via bottom tabs navigation
 */
export default function ProfilesScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Modal state (local UI state, not Zustand per project-context.md)
  const [isAddModalVisible, setAddModalVisible] = useState(false);

  /**
   * Handle opening the add profile modal
   */
  const handleOpenAddModal = () => {
    setAddModalVisible(true);
  };

  /**
   * Handle closing the add profile modal
   */
  const handleCloseAddModal = () => {
    setAddModalVisible(false);
  };

  /**
   * Handle successful profile creation
   * Note: TanStack Query automatically invalidates profiles query,
   * so the list will refresh automatically (AC#8)
   */
  const handleProfileCreated = () => {
    // Optional: Additional actions after profile creation
    // The query invalidation in useCreateProfile handles the list refresh
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" testID="profiles-screen">
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#111827' : '#FFFFFF'}
      />

      {/* Header */}
      <View className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">
          Gestion des profils
        </Text>
        <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Gérez les profils de votre famille
        </Text>
      </View>

      {/* Content with Error Boundary (per project-context.md) */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}>
        <Sentry.ErrorBoundary
          fallback={({ resetError }) => <ProfilesErrorFallback resetError={resetError} />}
          onError={(error) => {
            Sentry.captureException(error, {
              tags: { feature: 'profiles', component: 'ProfilesList' },
            });
          }}>
          <ProfilesList onAddProfile={handleOpenAddModal} />
        </Sentry.ErrorBoundary>
      </ScrollView>

      {/* Add Profile Modal */}
      <AddProfileModal
        visible={isAddModalVisible}
        onClose={handleCloseAddModal}
        onProfileCreated={handleProfileCreated}
      />
    </SafeAreaView>
  );
}
