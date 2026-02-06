/**
 * SaveScreen
 * Story 2.7: Upload et Stockage Photo
 *
 * Final screen in the clothing add flow.
 * Auto-saves on mount, shows loading/success/error states.
 * Success: BounceIn animation + auto-navigate after 1.5s
 * Error: Retry button + Cancel button
 */

import { useEffect, useRef, useMemo } from 'react';
import { View, Text, Image, Pressable, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, BounceIn } from 'react-native-reanimated';
import { useSaveClothingMutation } from '../hooks/useSaveClothingMutation';
import { categoryService } from '../services/categoryService';
import { useCurrentProfileId } from '@/features/profiles/stores/useProfileStore';
import {
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  COLOR_LABELS,
  COLOR_HEX,
  type SaveScreenParams,
} from '../types/wardrobe.types';

const AUTO_NAVIGATE_DELAY = 1500;

export const SaveScreen = () => {
  const params = useLocalSearchParams() as unknown as SaveScreenParams;
  const profileId = useCurrentProfileId();
  const { mutate, reset, isSuccess, isError, error: mutationError } = useSaveClothingMutation();
  const hasStarted = useRef(false);

  const {
    originalUrl,
    processedUrl,
    publicId,
    category: categoryParam,
    color: colorParam,
  } = params;

  const category = categoryService.parseCategory(categoryParam);
  const color = categoryService.parseColor(colorParam);
  const displayImageUrl = processedUrl || originalUrl;

  // Stable mutation params — recalculated only when inputs change
  const mutationParams = useMemo(() => {
    if (!originalUrl || !publicId || !category || !color || !profileId) return null;
    return {
      originalUrl,
      processedUrl: processedUrl || null,
      publicId,
      category,
      color,
      profileId,
    };
  }, [originalUrl, processedUrl, publicId, category, color, profileId]);

  // Auto-start save on mount (once)
  useEffect(() => {
    if (hasStarted.current || !mutationParams) return;
    hasStarted.current = true;
    mutate(mutationParams);
  }, [mutationParams, mutate]);

  // Auto-navigate on success after delay
  useEffect(() => {
    if (!isSuccess) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const timer = setTimeout(() => {
      router.dismissAll();
    }, AUTO_NAVIGATE_DELAY);

    return () => clearTimeout(timer);
  }, [isSuccess]);

  // Error state - missing params
  if (!mutationParams) {
    return (
      <View
        className="flex-1 items-center justify-center bg-gray-900 p-6 dark:bg-black"
        testID="save-error-params">
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
        <Text className="mt-4 text-center text-lg text-white">Paramètres manquants</Text>
        <Pressable
          onPress={() => router.dismissAll()}
          className="mt-6 min-h-[44px] rounded-lg bg-gray-700 px-6 py-3"
          accessibilityRole="button"
          accessibilityLabel="Retour à l'accueil"
          testID="error-back-button">
          <Text className="font-semibold text-white">Retour à l&apos;accueil</Text>
        </Pressable>
      </View>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <View
        className="flex-1 items-center justify-center bg-gray-900 p-6 dark:bg-black"
        testID="save-success-screen">
        <Animated.View entering={BounceIn.duration(600)}>
          <View className="h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
            <Ionicons name="checkmark-circle" size={64} color="#22C55E" />
          </View>
        </Animated.View>

        <Animated.Text entering={FadeIn.delay(300)} className="mt-6 text-xl font-bold text-white">
          Vêtement ajouté !
        </Animated.Text>

        <Animated.View entering={FadeIn.delay(600)}>
          <Image
            source={{ uri: displayImageUrl }}
            className="mt-4 h-24 w-24 rounded-xl bg-gray-800"
            resizeMode="contain"
            testID="success-image"
          />
        </Animated.View>

        <Pressable
          onPress={() => router.dismissAll()}
          className="mt-8 min-h-[44px] rounded-lg bg-blue-600 px-8 py-3"
          accessibilityRole="button"
          accessibilityLabel="Retour à l'accueil"
          testID="success-back-button">
          <Text className="font-semibold text-white">Continuer</Text>
        </Pressable>
      </View>
    );
  }

  // Error state
  if (isError) {
    return (
      <View
        className="flex-1 items-center justify-center bg-gray-900 p-6 dark:bg-black"
        testID="save-error-screen">
        <Ionicons name="cloud-offline" size={64} color="#EF4444" />
        <Text className="mt-4 text-center text-lg text-white">Erreur d&apos;enregistrement</Text>
        <Text className="mt-2 text-center text-gray-400">
          {mutationError?.message || 'Une erreur est survenue'}
        </Text>

        <View className="mt-6 gap-3">
          <Pressable
            onPress={() => {
              if (!mutationParams) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              reset();
              mutate(mutationParams);
            }}
            className="min-h-[44px] rounded-lg bg-blue-600 px-8 py-3"
            accessibilityRole="button"
            accessibilityLabel="Réessayer"
            testID="retry-button">
            <Text className="text-center font-semibold text-white">Réessayer</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.dismissAll();
            }}
            className="min-h-[44px] rounded-lg bg-gray-700 px-8 py-3"
            accessibilityRole="button"
            accessibilityLabel="Annuler"
            testID="cancel-button">
            <Text className="text-center font-semibold text-white">Annuler</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Loading state (default)
  return (
    <View
      className="flex-1 items-center justify-center bg-gray-900 p-6 dark:bg-black"
      testID="save-loading-screen">
      <Image
        source={{ uri: displayImageUrl }}
        className="h-40 w-40 rounded-xl bg-gray-800"
        resizeMode="contain"
        testID="loading-image"
      />

      {/* Category + Color badges */}
      <View className="mt-4 flex-row items-center gap-3">
        {category && (
          <View className="flex-row items-center gap-1 rounded-full bg-blue-600/20 px-3 py-1">
            <Ionicons
              name={CATEGORY_ICONS[category] as keyof typeof Ionicons.glyphMap}
              size={14}
              color="#3B82F6"
            />
            <Text className="text-sm text-blue-400">{CATEGORY_LABELS[category]}</Text>
          </View>
        )}
        {color && (
          <View className="flex-row items-center gap-1 rounded-full bg-gray-800 px-3 py-1">
            {COLOR_HEX[color] && (
              <View
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: COLOR_HEX[color]! }}
              />
            )}
            <Text className="text-sm text-gray-300">{COLOR_LABELS[color]}</Text>
          </View>
        )}
      </View>

      <ActivityIndicator size="large" color="#3B82F6" className="mt-8" />
      <Text className="mt-4 text-gray-400">Enregistrement...</Text>
    </View>
  );
};
