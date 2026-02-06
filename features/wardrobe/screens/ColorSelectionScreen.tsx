/**
 * ColorSelectionScreen
 * Story 2.6: Sélection Couleur
 *
 * Screen for selecting clothing color after categorization.
 * Displays image preview with category badge and 14-color palette.
 */

import { useState, useCallback, useEffect } from 'react';
import { View, Text, Image, Pressable, Alert, BackHandler, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Sentry from '@sentry/react-native';
import { ColorSelector } from '../components/ColorSelector';
import { categoryService } from '../services/categoryService';
import {
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  type ClothingColor,
  type ColorSelectionParams,
} from '../types/wardrobe.types';

export const ColorSelectionScreen = () => {
  const params = useLocalSearchParams() as unknown as ColorSelectionParams;
  const { originalUrl, processedUrl, publicId, category: categoryParam } = params;

  const category = categoryService.parseCategory(categoryParam);
  const displayImageUrl = processedUrl || originalUrl;

  const [selectedColor, setSelectedColor] = useState<ClothingColor | null>(null);

  // Confirmation dialog before leaving (image + category will be lost)
  const showCancelConfirmation = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Annuler l'ajout ?",
      "L'image et la catégorie seront perdues et vous devrez reprendre une photo.",
      [
        { text: 'Continuer', style: 'cancel' },
        {
          text: 'Annuler',
          style: 'destructive',
          onPress: () => router.dismissAll(),
        },
      ]
    );
  }, []);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      showCancelConfirmation();
      return true;
    });
    return () => backHandler.remove();
  }, [showCancelConfirmation]);

  // Handle confirm → navigate to save/upload (Story 2.7)
  const handleConfirm = () => {
    if (!selectedColor) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    router.push({
      pathname: '/(app)/wardrobe/save',
      params: {
        originalUrl,
        processedUrl: processedUrl || '',
        publicId,
        category: categoryParam,
        color: selectedColor,
      },
    });
  };

  // Error state - missing required params
  if (!originalUrl || !publicId || !category) {
    Sentry.captureMessage('ColorSelectionScreen: missing required params', {
      level: 'warning',
      extra: {
        hasOriginalUrl: !!originalUrl,
        hasPublicId: !!publicId,
        hasCategory: !!category,
      },
    });
    return (
      <View className="flex-1 items-center justify-center bg-gray-900 p-6">
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

  return (
    <View className="flex-1 bg-gray-900 dark:bg-black" testID="color-selection-screen">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-4 pt-12">
        <Pressable
          onPress={showCancelConfirmation}
          className="h-11 w-11 items-center justify-center rounded-full bg-gray-800"
          accessibilityRole="button"
          accessibilityLabel="Annuler"
          testID="cancel-button">
          <Ionicons name="close" size={24} color="white" />
        </Pressable>

        <Text className="text-lg font-semibold text-white">Couleur</Text>

        <View className="w-11" />
      </View>

      {/* Scrollable content for small screens */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        {/* Image Preview + Category Badge */}
        <View className="items-center px-6 py-4">
          <Image
            source={{ uri: displayImageUrl }}
            className="h-40 w-40 rounded-xl bg-gray-800"
            resizeMode="contain"
            testID="clothing-image"
          />
          <View className="mt-3 flex-row items-center gap-2 rounded-full bg-blue-600/20 px-3 py-1">
            <Ionicons
              name={CATEGORY_ICONS[category] as keyof typeof Ionicons.glyphMap}
              size={16}
              color="#3B82F6"
            />
            <Text className="text-sm font-medium text-blue-400" testID="category-badge">
              {CATEGORY_LABELS[category]}
            </Text>
          </View>
        </View>

        {/* Color Selection */}
        <View className="px-2">
          <Text className="mb-4 text-center text-gray-400">Sélectionnez la couleur principale</Text>

          <ColorSelector selectedColor={selectedColor} onSelect={setSelectedColor} />
        </View>
      </ScrollView>

      {/* Actions */}
      <View className="gap-3 px-6 pb-8">
        <Pressable
          onPress={handleConfirm}
          disabled={!selectedColor}
          className={`min-h-[56px] items-center justify-center rounded-xl py-4 ${
            selectedColor ? 'bg-blue-600' : 'bg-gray-700 opacity-50'
          }`}
          accessibilityRole="button"
          accessibilityLabel="Confirmer la couleur"
          accessibilityState={{ disabled: !selectedColor }}
          testID="confirm-button">
          <Text className="font-semibold text-white">
            {selectedColor ? 'Confirmer' : 'Sélectionnez une couleur'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};
