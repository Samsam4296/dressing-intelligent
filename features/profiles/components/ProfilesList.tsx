/**
 * ProfilesList Component
 * Story 1.6: Création Profils Additionnels
 *
 * Displays existing profiles with add button.
 *
 * AC#1: Given l'utilisateur a moins de 3 profils When il accède à la gestion
 *       des profils Then il voit un bouton "Ajouter un profil" actif et cliquable
 * AC#2: Le compteur de profils affiche "X/3 profils"
 * AC#6: Given l'utilisateur a déjà 3 profils When il accède à la gestion
 *       des profils Then le bouton "Ajouter" est désactivé avec opacité réduite
 * AC#7: Un message explicatif est affiché: "Nombre maximum de profils atteint (3)"
 *
 * NFR-A1: Touch targets 44x44 minimum
 * NFR-A4: Dark mode support
 */

import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInRight, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useProfiles } from '../hooks/useProfiles';
import { ProfileBubble } from './ProfileBubble';
import type { Profile } from '../types/profile.types';

// ============================================
// Constants
// ============================================

const MAX_PROFILES = 3;

// ============================================
// Types
// ============================================

interface ProfilesListProps {
  /** Callback when add profile button is pressed */
  onAddProfile: () => void;
  /** Callback when a profile is pressed (optional) */
  onProfilePress?: (profile: Profile) => void;
}

// ============================================
// Component
// ============================================

/**
 * ProfilesList component displaying user profiles with add functionality
 *
 * @example
 * ```tsx
 * <ProfilesList
 *   onAddProfile={() => setAddModalVisible(true)}
 *   onProfilePress={(profile) => handleSwitchProfile(profile)}
 * />
 * ```
 */
export const ProfilesList = ({ onAddProfile, onProfilePress }: ProfilesListProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Fetch profiles using TanStack Query
  const { data: profiles, isLoading, error } = useProfiles();

  // Calculate state
  const profileList = profiles || [];
  const profileCount = profileList.length;
  const canAddProfile = profileCount < MAX_PROFILES;

  /**
   * Handle add profile button press with haptic feedback
   */
  const handleAddPress = () => {
    if (canAddProfile) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onAddProfile();
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <View className="p-4 items-center justify-center" testID="profiles-list-loading">
        <ActivityIndicator
          size="large"
          color={isDark ? '#60A5FA' : '#3B82F6'}
        />
        <Text className="mt-2 text-gray-500 dark:text-gray-400">
          Chargement des profils...
        </Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View className="p-4 items-center justify-center" testID="profiles-list-error">
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={isDark ? '#EF4444' : '#DC2626'}
        />
        <Text className="mt-2 text-red-600 dark:text-red-400 text-center">
          Erreur lors du chargement des profils
        </Text>
      </View>
    );
  }

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      className="p-4"
      testID="profiles-list-container"
    >
      {/* Header with counter (AC#2) */}
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          Mes profils
        </Text>
        <View className="flex-row items-center">
          <Text
            className="text-sm text-gray-500 dark:text-gray-400"
            testID="profile-counter"
            accessibilityLabel={`${profileCount} profils sur ${MAX_PROFILES}`}
          >
            {profileCount}/{MAX_PROFILES} profils
          </Text>
          {/* Visual indicator */}
          <View className="flex-row ml-2">
            {Array.from({ length: MAX_PROFILES }).map((_, index) => (
              <View
                key={index}
                className={`w-2 h-2 rounded-full mx-0.5 ${
                  index < profileCount
                    ? 'bg-blue-500 dark:bg-blue-400'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Profiles list - horizontal scrollable */}
      <View
        className="flex-row flex-wrap gap-4 mb-6"
        testID="profiles-bubbles-container"
      >
        {profileList.map((profile, index) => (
          <Animated.View
            key={profile.id}
            entering={FadeInRight.delay(index * 100).duration(300)}
            layout={Layout.springify()}
          >
            <ProfileBubble
              profile={profile}
              isActive={profile.is_active}
              onPress={onProfilePress}
            />
          </Animated.View>
        ))}
      </View>

      {/* Add Profile Button (AC#1, AC#6) */}
      <Pressable
        className={`flex-row items-center justify-center py-4 px-6 rounded-xl min-h-[56px] ${
          canAddProfile
            ? 'bg-blue-600 dark:bg-blue-500 active:bg-blue-700 dark:active:bg-blue-600'
            : 'bg-gray-300 dark:bg-gray-700 opacity-50'
        }`}
        onPress={handleAddPress}
        disabled={!canAddProfile}
        accessibilityRole="button"
        accessibilityLabel={
          canAddProfile
            ? 'Ajouter un profil'
            : 'Limite de profils atteinte, impossible d\'ajouter'
        }
        accessibilityState={{ disabled: !canAddProfile }}
        accessibilityHint={
          canAddProfile
            ? 'Appuyez pour créer un nouveau profil'
            : 'Vous avez atteint le nombre maximum de profils'
        }
        testID="add-profile-button"
      >
        <Ionicons
          name="add-circle-outline"
          size={24}
          color={canAddProfile ? '#FFFFFF' : isDark ? '#6B7280' : '#9CA3AF'}
        />
        <Text
          className={`ml-2 font-semibold text-base ${
            canAddProfile
              ? 'text-white'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          Ajouter un profil
        </Text>
      </Pressable>

      {/* Limit reached message (AC#7) */}
      {!canAddProfile && (
        <Animated.View
          entering={FadeIn.delay(200).duration(300)}
          className="flex-row items-center justify-center mt-3"
          testID="max-profiles-message"
        >
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={isDark ? '#9CA3AF' : '#6B7280'}
          />
          <Text className="text-sm text-gray-500 dark:text-gray-400 text-center ml-1">
            Nombre maximum de profils atteint (3)
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
};

export default ProfilesList;
