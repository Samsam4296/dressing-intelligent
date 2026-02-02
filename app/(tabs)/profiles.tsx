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
import { SafeAreaView, ScrollView, View, Text, StatusBar } from 'react-native';
import { useColorScheme } from 'nativewind';
import { ProfilesList, AddProfileModal } from '@/features/profiles';
import { Toast } from '@/shared/components/Toast';

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
    <SafeAreaView
      className="flex-1 bg-white dark:bg-gray-900"
      testID="profiles-screen"
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#111827' : '#FFFFFF'}
      />

      {/* Header */}
      <View className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">
          Gestion des profils
        </Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Gérez les profils de votre famille
        </Text>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <ProfilesList
          onAddProfile={handleOpenAddModal}
        />
      </ScrollView>

      {/* Add Profile Modal */}
      <AddProfileModal
        visible={isAddModalVisible}
        onClose={handleCloseAddModal}
        onProfileCreated={handleProfileCreated}
      />

      {/* Toast notification component */}
      <Toast />
    </SafeAreaView>
  );
}
