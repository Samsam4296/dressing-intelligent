/**
 * CreateProfileScreen Component
 * Story 1.5: Création Premier Profil
 *
 * AC#1: Profile creation form with name and avatar
 * AC#2: Name validation 2-30 characters, real-time feedback
 * AC#9: Touch targets 44x44, contrast 4.5:1
 * AC#10: Dark mode support
 * AC#11: Errors in French
 * AC#12: Haptic feedback on creation
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import NetInfo from '@react-native-community/netinfo';
import { useColorScheme } from 'nativewind';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';

import { AvatarPicker } from './AvatarPicker';
import { useCreateProfile, useUploadAvatar, useUpdateProfile } from '../hooks/useProfiles';
import { useProfileStore } from '../stores/useProfileStore';
import { validateProfileName } from '../types/profile.types';
import { logger } from '@/lib/logger';

// ============================================
// Types
// ============================================

interface CreateProfileScreenProps {
  /** Called after successful profile creation (if you want custom navigation) */
  onSuccess?: () => void;
}

// ============================================
// Component
// ============================================

export const CreateProfileScreen = ({ onSuccess }: CreateProfileScreenProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  // Local state
  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Animation values for shake effect
  const inputShakeX = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  // Animated styles
  const inputAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: inputShakeX.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  /**
   * Trigger shake animation on input
   */
  const triggerShakeAnimation = useCallback(() => {
    inputShakeX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  }, [inputShakeX]);

  /**
   * Trigger button press animation
   */
  const triggerButtonPressAnimation = useCallback(() => {
    buttonScale.value = withSequence(
      withSpring(0.95, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );
  }, [buttonScale]);

  // Mutations
  const { mutateAsync: createProfile, isPending: isCreating } = useCreateProfile();
  const { mutateAsync: uploadAvatar, isPending: isUploading } = useUploadAvatar();
  const { mutateAsync: updateProfile } = useUpdateProfile();

  // Store actions
  const setCurrentProfile = useProfileStore((state) => state.setCurrentProfile);
  const completeOnboarding = useProfileStore((state) => state.completeOnboarding);

  // Validation
  const nameValidation = validateProfileName(name);
  const isNameValid = nameValidation.isValid;
  const nameError = nameValidation.error;

  // Combined loading state
  const isLoading = isCreating || isUploading;

  /**
   * Handle name input change with real-time validation (AC#2)
   */
  const handleNameChange = useCallback((text: string) => {
    setName(text);
    setErrorMessage(null); // Clear error on input
  }, []);

  /**
   * Handle profile creation
   */
  const handleCreateProfile = async () => {
    // Trigger button press animation
    triggerButtonPressAnimation();

    // Validate name
    if (!isNameValid) {
      setErrorMessage(nameError || 'Nom invalide');
      // Trigger shake animation on input
      triggerShakeAnimation();
      // Haptic feedback on error
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // Check connectivity (Dev Notes: Mode Offline handling)
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      Alert.alert(
        'Pas de connexion',
        'Une connexion internet est requise pour créer votre profil.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      // Create profile
      const profile = await createProfile({ name: name.trim() });

      if (!profile) {
        throw new Error('Profil non créé');
      }

      // Upload avatar if selected
      if (avatarUri && profile.id) {
        try {
          const avatarResult = await uploadAvatar({
            profileId: profile.id,
            imageUri: avatarUri,
          });

          // Update profile with the storage path so avatar can be retrieved later
          if (avatarResult?.storagePath) {
            await updateProfile({
              profileId: profile.id,
              updates: { avatarUrl: avatarResult.storagePath },
            });
            logger.info('Avatar uploaded and profile updated', { feature: 'profiles' });
          }
        } catch (avatarError) {
          // Log but don't fail profile creation for avatar upload failure
          logger.warn('Avatar upload failed, but profile created', {
            feature: 'profiles',
            action: 'uploadAvatar',
          });
        }
      }

      // Update store with new profile
      setCurrentProfile(profile.id);
      completeOnboarding();

      // Success haptic feedback (AC#12)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Navigate to main screen (AC#8)
      if (onSuccess) {
        onSuccess();
      } else {
        // @ts-expect-error Route exists but not in auto-generated types
        router.replace('/(tabs)/');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Une erreur est survenue';
      setErrorMessage(errorMsg);

      // Error haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      logger.error(error, {
        feature: 'profiles',
        action: 'createProfile',
        screen: 'CreateProfileScreen',
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={['top', 'bottom']}>
      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 justify-center px-6 py-8">
          {/* Header */}
          <View className="items-center mb-8">
            <Text
              className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-2"
              accessibilityRole="header"
            >
              Créer votre profil
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-center text-base">
              Personnalisez votre expérience
            </Text>
          </View>

          {/* Avatar Picker */}
          <View className="items-center mb-8">
            <AvatarPicker
              avatarUri={avatarUri}
              onAvatarSelected={setAvatarUri}
              isLoading={isUploading}
              size={120}
            />
          </View>

          {/* Name Input (AC#2: validation temps réel) */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nom du profil
            </Text>
            <Animated.View style={inputAnimatedStyle}>
              <TextInput
                className={`h-14 px-4 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white text-base ${
                  errorMessage || (name.length > 0 && !isNameValid)
                    ? 'border-2 border-red-500'
                    : ''
                }`}
                placeholder="Emma, Lucas, Sophie..."
                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                maxLength={30}
                value={name}
                onChangeText={handleNameChange}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleCreateProfile}
                editable={!isLoading}
                accessibilityLabel="Nom du profil"
                accessibilityHint="Entrez un nom entre 2 et 30 caractères"
                testID="profile-name-input"
              />
            </Animated.View>

            {/* Character count and validation feedback (AC#2) */}
            <View className="flex-row justify-between items-center mt-2">
              <Text
                className={`text-xs ${
                  name.length > 0 && !isNameValid
                    ? 'text-red-500'
                    : 'text-gray-500 dark:text-gray-500'
                }`}
              >
                {name.length > 0 && !isNameValid ? nameError : '2-30 caractères'}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-500">
                {name.length}/30
              </Text>
            </View>
          </View>

          {/* Error Message (AC#11: French) */}
          {errorMessage && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"
            >
              <Text className="text-red-600 dark:text-red-400 text-sm text-center">
                {errorMessage}
              </Text>
            </Animated.View>
          )}

          {/* Submit Button (AC#9: min 44x44 touch target, using 56px height) */}
          <Animated.View style={buttonAnimatedStyle}>
            <Pressable
              className={`min-h-[56px] rounded-xl justify-center items-center ${
                isLoading || !isNameValid || name.length === 0
                  ? 'bg-blue-300 dark:bg-blue-800'
                  : 'bg-blue-600 dark:bg-blue-500 active:bg-blue-700'
              }`}
              onPress={handleCreateProfile}
              disabled={isLoading || !isNameValid || name.length === 0}
              accessibilityRole="button"
              accessibilityLabel="Créer le profil"
              accessibilityState={{ disabled: isLoading || !isNameValid }}
              testID="create-profile-button"
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-lg">
                  Créer mon profil
                </Text>
              )}
            </Pressable>
          </Animated.View>

          {/* Loading explanation */}
          {isLoading && (
            <Text className="text-gray-500 dark:text-gray-400 text-center text-sm mt-3">
              {isUploading ? "Upload de l'avatar..." : 'Création du profil...'}
            </Text>
          )}
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};
