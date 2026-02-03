/**
 * Create Profile Screen Route
 * Story 1.5: Création Premier Profil
 *
 * Expo Router page for profile creation.
 * Subtask 8.1: Route at app/(auth)/create-profile.tsx
 * Subtask 8.5: Navigation guard via useRequireNoProfile
 */

import { View, ActivityIndicator } from 'react-native';
import { CreateProfileScreen, useRequireNoProfile } from '@/features/profiles';

export default function CreateProfilePage() {
  // Subtask 8.5: Navigation guard - redirects to home if user has profile
  const { isLoading, hasProfile } = useRequireNoProfile();

  // Show loading while checking profile status
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // If hasProfile is true, useRequireNoProfile already initiated redirect
  // Render empty view during redirect to prevent flash
  if (hasProfile) {
    return <View className="flex-1 bg-white dark:bg-gray-900" />;
  }

  // Render profile creation screen
  return <CreateProfileScreen />;
}
