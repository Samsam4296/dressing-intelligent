/**
 * ProfileBubble Component
 * Story 1.6: Création Profils Additionnels
 *
 * Displays a profile avatar with name.
 * Used in ProfilesList to show existing profiles.
 *
 * NFR-A1: Touch targets 44x44 minimum
 * NFR-A4: Dark mode support
 */

import { View, Text, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import type { Profile } from '../types/profile.types';

// ============================================
// Types
// ============================================

interface ProfileBubbleProps {
  /** Profile data */
  profile: Profile;
  /** Whether this profile is active */
  isActive?: boolean;
  /** Size of the avatar (default 64) */
  size?: number;
  /** Optional callback when pressed */
  onPress?: (profile: Profile) => void;
}

// ============================================
// Component
// ============================================

/**
 * Profile bubble displaying avatar and name
 *
 * @example
 * ```tsx
 * <ProfileBubble
 *   profile={profile}
 *   isActive={profile.is_active}
 *   onPress={handleProfilePress}
 * />
 * ```
 */
export const ProfileBubble = ({
  profile,
  isActive = false,
  size = 64,
  onPress,
}: ProfileBubbleProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handlePress = () => {
    onPress?.(profile);
  };

  const Container = onPress ? Pressable : View;
  const containerProps = onPress
    ? {
        onPress: handlePress,
        accessibilityRole: 'button' as const,
        accessibilityLabel: `Profil ${profile.display_name}${isActive ? ', actif' : ''}`,
        accessibilityState: { selected: isActive },
        testID: `profile-bubble-${profile.id}`,
      }
    : {
        accessibilityRole: 'none' as const,
        testID: `profile-bubble-${profile.id}`,
      };

  return (
    <Container
      className="items-center min-w-[80px] relative"
      {...containerProps}
    >
      {/* Avatar Container with active indicator */}
      <View
        className={`rounded-full items-center justify-center overflow-hidden ${
          isActive
            ? 'border-2 border-blue-500 dark:border-blue-400'
            : 'border-2 border-transparent'
        }`}
        style={{ width: size + 4, height: size + 4 }}
      >
        <View
          className="rounded-full bg-gray-200 dark:bg-gray-700 items-center justify-center overflow-hidden"
          style={{ width: size, height: size }}
        >
          {profile.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              className="w-full h-full"
              testID={`profile-avatar-${profile.id}`}
            />
          ) : (
            <Ionicons
              name="person"
              size={size * 0.5}
              color={isDark ? '#9CA3AF' : '#6B7280'}
              testID={`profile-placeholder-${profile.id}`}
            />
          )}
        </View>
      </View>

      {/* Profile Name */}
      <Text
        className={`mt-2 text-sm text-center ${
          isActive
            ? 'text-blue-600 dark:text-blue-400 font-semibold'
            : 'text-gray-700 dark:text-gray-300'
        }`}
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{ maxWidth: size + 16 }}
      >
        {profile.display_name}
      </Text>

      {/* Active indicator badge */}
      {isActive && (
        <View
          className="absolute -top-1 -right-1 bg-blue-500 dark:bg-blue-400 rounded-full p-1"
          style={{ width: 20, height: 20 }}
        >
          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
        </View>
      )}
    </Container>
  );
};

export default ProfileBubble;
