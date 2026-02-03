/**
 * ProfileBubble Component
 * Story 1.6: Création Profils Additionnels
 * Story 1.7: Switch Entre Profils
 * Story 1.8: Modification de Profil
 * Story 1.9: Suppression de Profil
 *
 * Displays a profile avatar with name.
 * Used in ProfilesList to show existing profiles.
 * Supports press animations and haptic feedback for profile switching.
 * Supports long press on active profile to open edit modal (Story 1.8 AC#1).
 * Supports long press on non-active profile to open delete modal (Story 1.9 AC#1).
 *
 * NFR-A1: Touch targets 44x44 minimum
 * NFR-A4: Dark mode support
 * NFR-P4: Animation performance 60fps
 */

import { View, Text, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
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
  /** Optional callback when pressed (for non-active profiles to switch) */
  onPress?: (profile: Profile) => void;
  /** Optional callback when long pressed (for active profile to edit - Story 1.8) */
  onLongPress?: (profile: Profile) => void;
  /** Whether the bubble is disabled (e.g., during switch) */
  disabled?: boolean;
}

// ============================================
// Animated Pressable
// ============================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================
// Component
// ============================================

/**
 * Profile bubble displaying avatar and name with animations
 *
 * @example
 * ```tsx
 * <ProfileBubble
 *   profile={profile}
 *   isActive={profile.id === currentProfileId}
 *   onPress={handleSwitch}
 *   disabled={isSwitching}
 * />
 * ```
 */
export const ProfileBubble = ({
  profile,
  isActive = false,
  size = 64,
  onPress,
  onLongPress,
  disabled = false,
}: ProfileBubbleProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Animation shared value for scale effect
  const scale = useSharedValue(1);

  // Animated style for press feedback (60fps with Reanimated)
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  /**
   * Handle press in with haptic feedback and scale animation
   * AC#7 (Story 1.7): Haptic feedback Light on tap
   */
  const handlePressIn = () => {
    // Animation for non-active profiles (switch) or any profile with long press (edit/delete)
    const canSwitch = !disabled && !isActive && onPress;
    const canLongPress = !disabled && onLongPress;

    if (canSwitch || canLongPress) {
      scale.value = withSpring(0.95, { damping: 15, stiffness: 150 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  /**
   * Handle press out - restore scale
   */
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  /**
   * Handle press - trigger callback for non-active profiles (switch)
   */
  const handlePress = () => {
    if (!disabled && !isActive) {
      onPress?.(profile);
    }
  };

  /**
   * Handle long press - trigger callback for any profile (edit or delete)
   * Story 1.8 AC#1: Long press on active profile opens edit modal
   * Story 1.9 AC#1: Long press on non-active profile opens delete modal
   */
  const handleLongPress = () => {
    if (!disabled && onLongPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onLongPress(profile);
    }
  };

  // Determine if component should be interactive
  const canSwitch = onPress && !isActive && !disabled;
  const canLongPress = onLongPress && !disabled;
  const isInteractive = canSwitch || canLongPress;

  return (
    <AnimatedPressable
      style={animatedStyle}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={500}
      disabled={!isInteractive}
      className={`items-center min-w-[80px] min-h-[44px] relative ${
        disabled ? 'opacity-50' : ''
      }`}
      accessibilityRole="button"
      accessibilityLabel={`Profil ${profile.display_name}${isActive ? ', profil actif' : ', appuyer pour changer de profil'}`}
      accessibilityState={{ selected: isActive, disabled: !isInteractive }}
      accessibilityHint={
        isActive && canLongPress
          ? 'Appui long pour modifier ce profil'
          : !isActive && canLongPress
          ? 'Appuyer pour changer, appui long pour supprimer'
          : isActive
          ? 'Profil actuellement actif'
          : 'Appuyer pour changer vers ce profil'
      }
      testID={`profile-bubble-${profile.id}`}
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
          className="absolute -top-1 -right-1 bg-blue-500 dark:bg-blue-400 rounded-full items-center justify-center"
          style={{ width: 20, height: 20 }}
        >
          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
        </View>
      )}
    </AnimatedPressable>
  );
};

export default ProfileBubble;
