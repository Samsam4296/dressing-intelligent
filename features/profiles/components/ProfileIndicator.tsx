/**
 * ProfileIndicator Component
 * Story 1.7: Switch Entre Profils
 *
 * Small profile indicator for navigation header.
 * Shows current active profile avatar and name.
 * Tap navigates to profiles management screen.
 *
 * AC#5: UI reflects immediately the active profile (name, avatar in header)
 * NFR-A1: Touch targets 44x44 minimum
 * NFR-A4: Dark mode support
 */

import { Pressable, View, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useProfiles } from '../hooks/useProfiles';
import { useCurrentProfileId } from '../stores/useProfileStore';

// ============================================
// Component
// ============================================

/**
 * ProfileIndicator - Header navigation component showing active profile
 *
 * @example
 * ```tsx
 * // In tabs _layout.tsx
 * screenOptions={{
 *   headerRight: () => <ProfileIndicator />,
 * }}
 * ```
 */
export const ProfileIndicator = () => {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Get current profile ID from Zustand (reactive)
  const currentProfileId = useCurrentProfileId();

  // Fetch profiles to get profile details
  const { data: profiles } = useProfiles();

  // Find current profile
  const profileList = profiles || [];
  const currentProfile = profileList.find((p) => p.id === currentProfileId);

  /**
   * Navigate to profiles management screen
   */
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/profiles');
  };

  // Don't render if no current profile
  if (!currentProfile) {
    return null;
  }

  return (
    <Pressable
      className="mr-2 min-h-[44px] min-w-[44px] flex-row items-center px-2"
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Profil actif: ${currentProfile.display_name}. Appuyer pour gérer les profils.`}
      accessibilityHint="Navigue vers la gestion des profils"
      testID="profile-indicator">
      {/* Mini avatar */}
      <View className="h-7 w-7 overflow-hidden rounded-full border border-gray-200 dark:border-gray-700">
        {currentProfile.avatar_url ? (
          <Image
            source={{ uri: currentProfile.avatar_url }}
            className="h-full w-full"
            resizeMode="cover"
            testID="profile-indicator-avatar"
          />
        ) : (
          <View className="h-full w-full items-center justify-center bg-gray-200 dark:bg-gray-700">
            <Ionicons name="person" size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
          </View>
        )}
      </View>

      {/* Name truncated */}
      <Text
        className="ml-1.5 max-w-[60px] text-sm font-medium text-gray-700 dark:text-gray-300"
        numberOfLines={1}
        ellipsizeMode="tail"
        testID="profile-indicator-name">
        {currentProfile.display_name}
      </Text>

      {/* Chevron */}
      <Ionicons
        name="chevron-down"
        size={14}
        color={isDark ? '#9CA3AF' : '#6B7280'}
        style={{ marginLeft: 2 }}
      />
    </Pressable>
  );
};

export default ProfileIndicator;
