/**
 * ProfilesList Component
 * Story 1.6: Création Profils Additionnels
 * Story 1.7: Switch Entre Profils
 * Story 1.8: Modification de Profil
 * Story 1.9: Suppression de Profil
 *
 * Displays existing profiles with add button, switch functionality, edit and delete modals.
 *
 * AC#1 (1.6): Given l'utilisateur a moins de 3 profils When il accède à la gestion
 *             des profils Then il voit un bouton "Ajouter un profil" actif et cliquable
 * AC#2 (1.6): Le compteur de profils affiche "X/3 profils"
 * AC#1 (1.7): Profil actif visuellement distingué
 * AC#2 (1.7): Profils non-actifs cliquables pour switch
 * AC#3 (1.7): Switch < 1 seconde (NFR-P4)
 * AC#1 (1.8): Long press on active profile opens edit modal with pre-filled data
 * AC#1 (1.9): Long press on non-active profile opens delete modal with confirmation
 *
 * NFR-A1: Touch targets 44x44 minimum
 * NFR-A4: Dark mode support
 */

import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInRight, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useProfiles, useSwitchProfile } from '../hooks/useProfiles';
import { useCurrentProfileId } from '../stores/useProfileStore';
import { ProfileBubble } from './ProfileBubble';
import { EditProfileModal } from './EditProfileModal';
import { DeleteProfileModal } from './DeleteProfileModal';
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
  /** Callback when a profile is pressed (optional - for external handling) */
  onProfilePress?: (profile: Profile) => void;
}

// ============================================
// Component
// ============================================

/**
 * ProfilesList component displaying user profiles with switch and add functionality
 *
 * @example
 * ```tsx
 * <ProfilesList
 *   onAddProfile={() => setAddModalVisible(true)}
 * />
 * ```
 */
export const ProfilesList = ({ onAddProfile, onProfilePress }: ProfilesListProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Fetch profiles using TanStack Query
  const { data: profiles, isLoading, error } = useProfiles();

  // Get current profile ID from Zustand (optimistic UI - AC#1, AC#5 Story 1.7)
  const currentProfileId = useCurrentProfileId();

  // Switch profile mutation (AC#3: < 1s with optimistic updates)
  const { mutate: switchProfile, isPending: isSwitching } = useSwitchProfile();

  // Story 1.8: Edit profile state (Subtask 3.2)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  // Story 1.9: Delete profile state
  const [deletingProfile, setDeletingProfile] = useState<Profile | null>(null);

  // Calculate state
  const profileList = profiles || [];
  const profileCount = profileList.length;
  const canAddProfile = profileCount < MAX_PROFILES;

  /**
   * Handle profile switch
   * AC#2: Non-active profiles are clickable to initiate switch
   * AC#3: Switch < 1 second via optimistic updates
   */
  const handleSwitch = (profile: Profile) => {
    // Don't switch to already active profile
    if (profile.id === currentProfileId) return;

    // If external handler provided, use it
    if (onProfilePress) {
      onProfilePress(profile);
      return;
    }

    // Execute switch mutation
    switchProfile(profile.id);
  };

  /**
   * Handle add profile button press with haptic feedback
   */
  const handleAddPress = () => {
    if (canAddProfile && !isSwitching) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onAddProfile();
    }
  };

  /**
   * Handle long press on any profile
   * Story 1.8 AC#1: Long press on active profile opens edit modal
   * Story 1.9 AC#1: Long press on non-active profile opens delete modal
   */
  const handleLongPress = (profile: Profile) => {
    const isActive = profile.id === currentProfileId;
    if (isActive) {
      // Active profile → open edit modal
      setEditingProfile(profile);
    } else {
      // Non-active profile → open delete modal
      setDeletingProfile(profile);
    }
  };

  /**
   * Close edit modal
   * Subtask 3.3: Handle modal close
   */
  const handleCloseEditModal = () => {
    setEditingProfile(null);
  };

  /**
   * Close delete modal
   * Story 1.9: Handle delete modal close
   */
  const handleCloseDeleteModal = () => {
    setDeletingProfile(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <View className="items-center justify-center p-4" testID="profiles-list-loading">
        <ActivityIndicator size="large" color={isDark ? '#60A5FA' : '#3B82F6'} />
        <Text className="mt-2 text-gray-500 dark:text-gray-400">Chargement des profils...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View className="items-center justify-center p-4" testID="profiles-list-error">
        <Ionicons name="alert-circle-outline" size={48} color={isDark ? '#EF4444' : '#DC2626'} />
        <Text className="mt-2 text-center text-red-600 dark:text-red-400">
          Erreur lors du chargement des profils
        </Text>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(300)} className="p-4" testID="profiles-list-container">
      {/* Header with counter (AC#2 Story 1.6) */}
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-xl font-bold text-gray-900 dark:text-white">Mes profils</Text>
        <View className="flex-row items-center">
          <Text
            className="text-sm text-gray-500 dark:text-gray-400"
            testID="profile-counter"
            accessibilityLabel={`${profileCount} profils sur ${MAX_PROFILES}`}>
            {profileCount}/{MAX_PROFILES} profils
          </Text>
          {/* Visual indicator */}
          <View className="ml-2 flex-row">
            {Array.from({ length: MAX_PROFILES }).map((_, index) => (
              <View
                key={index}
                className={`mx-0.5 h-2 w-2 rounded-full ${
                  index < profileCount
                    ? 'bg-blue-500 dark:bg-blue-400'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Profiles list - horizontal wrap (AC#1, AC#2 Story 1.7) */}
      <View className="mb-6 flex-row flex-wrap gap-4" testID="profiles-bubbles-container">
        {profileList.map((profile, index) => (
          <Animated.View
            key={profile.id}
            entering={FadeInRight.delay(index * 100).duration(300)}
            layout={Layout.springify()}>
            <ProfileBubble
              profile={profile}
              isActive={profile.id === currentProfileId}
              onPress={handleSwitch}
              onLongPress={handleLongPress}
              disabled={isSwitching}
            />
          </Animated.View>
        ))}
      </View>

      {/* Switch in progress indicator (AC#3) */}
      {isSwitching && (
        <Animated.View
          entering={FadeIn.duration(200)}
          className="mb-4 flex-row items-center justify-center"
          testID="switch-loading-indicator">
          <ActivityIndicator size="small" color={isDark ? '#60A5FA' : '#3B82F6'} />
          <Text className="ml-2 text-sm text-gray-500 dark:text-gray-400">
            Changement de profil...
          </Text>
        </Animated.View>
      )}

      {/* Add Profile Button (AC#1, AC#6 Story 1.6) */}
      <Pressable
        className={`min-h-[56px] flex-row items-center justify-center rounded-xl px-6 py-4 ${
          canAddProfile && !isSwitching
            ? 'bg-blue-600 active:bg-blue-700 dark:bg-blue-500 dark:active:bg-blue-600'
            : 'bg-gray-300 opacity-50 dark:bg-gray-700'
        }`}
        onPress={handleAddPress}
        disabled={!canAddProfile || isSwitching}
        accessibilityRole="button"
        accessibilityLabel={
          canAddProfile ? 'Ajouter un profil' : "Limite de profils atteinte, impossible d'ajouter"
        }
        accessibilityState={{ disabled: !canAddProfile || isSwitching }}
        accessibilityHint={
          canAddProfile
            ? 'Appuyez pour créer un nouveau profil'
            : 'Vous avez atteint le nombre maximum de profils'
        }
        testID="add-profile-button">
        <Ionicons
          name="add-circle-outline"
          size={24}
          color={canAddProfile && !isSwitching ? '#FFFFFF' : isDark ? '#6B7280' : '#9CA3AF'}
        />
        <Text
          className={`ml-2 text-base font-semibold ${
            canAddProfile && !isSwitching ? 'text-white' : 'text-gray-500 dark:text-gray-400'
          }`}>
          Ajouter un profil
        </Text>
      </Pressable>

      {/* Limit reached message (AC#7 Story 1.6) */}
      {!canAddProfile && (
        <Animated.View
          entering={FadeIn.delay(200).duration(300)}
          className="mt-3 flex-row items-center justify-center"
          testID="max-profiles-message">
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={isDark ? '#9CA3AF' : '#6B7280'}
          />
          <Text className="ml-1 text-center text-sm text-gray-500 dark:text-gray-400">
            Nombre maximum de profils atteint (3)
          </Text>
        </Animated.View>
      )}

      {/* Edit Profile Modal (Story 1.8 - Subtask 3.3) */}
      <EditProfileModal
        visible={editingProfile !== null}
        profile={editingProfile}
        onClose={handleCloseEditModal}
        onProfileUpdated={handleCloseEditModal}
      />

      {/* Delete Profile Modal (Story 1.9) */}
      <DeleteProfileModal
        visible={deletingProfile !== null}
        profile={deletingProfile}
        profiles={profileList}
        onClose={handleCloseDeleteModal}
        onProfileDeleted={handleCloseDeleteModal}
      />
    </Animated.View>
  );
};

export default ProfilesList;
