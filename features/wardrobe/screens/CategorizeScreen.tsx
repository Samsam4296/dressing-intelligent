/**
 * CategorizeScreen
 * Story 2.4: Catégorisation automatique
 *
 * Screen for selecting clothing category after image processing.
 * Supports AI-suggested categories with pre-selection and visual badges.
 */

import { useEffect, useState, useCallback } from 'react';
import { View, Text, Image, Pressable, Alert, BackHandler } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CategorySelector } from '../components/CategorySelector';
import { categoryService } from '../services/categoryService';
import type { ClothingCategory, CategorySelectionParams } from '../types/wardrobe.types';

// ============================================
// Component
// ============================================

export const CategorizeScreen = () => {
  const params = useLocalSearchParams<CategorySelectionParams>();
  const {
    originalUrl,
    processedUrl,
    publicId,
    usedFallback,
    suggestedCategory: suggestedCategoryParam,
    categoryConfidence: categoryConfidenceParam,
  } = params;

  // Parse navigation params
  const suggestedCategory = categoryService.parseCategory(suggestedCategoryParam);
  const categoryConfidence = categoryService.parseConfidence(categoryConfidenceParam);
  const shouldPreselect = categoryService.shouldPreselect(categoryConfidence);
  const showAiBadge = categoryService.shouldShowAiBadge(categoryConfidence);

  // State
  const [selectedCategory, setSelectedCategory] = useState<ClothingCategory | null>(
    shouldPreselect ? suggestedCategory : null
  );

  // Image to display (processed preferred, fallback to original)
  const displayImageUrl = processedUrl || originalUrl;

  // ============================================
  // Handlers
  // ============================================

  /**
   * Show confirmation dialog before cancelling
   */
  const showCancelConfirmation = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Annuler l'ajout ?", "L'image sera perdue et vous devrez reprendre une photo.", [
      { text: 'Continuer', style: 'cancel' },
      {
        text: 'Annuler',
        style: 'destructive',
        onPress: () => router.dismissAll(),
      },
    ]);
  }, []);

  /**
   * Handle category selection (haptic feedback in CategorySelector)
   */
  const handleCategorySelect = useCallback((category: ClothingCategory) => {
    setSelectedCategory(category);
  }, []);

  /**
   * Handle confirm - navigate to color selection
   */
  const handleConfirm = () => {
    if (!selectedCategory) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Navigate to color selection (Story 2.6)
    router.push({
      pathname: '/(app)/wardrobe/color',
      params: {
        originalUrl,
        processedUrl: processedUrl || '',
        publicId,
        category: selectedCategory,
      },
    });
  };

  // ============================================
  // Effects
  // ============================================

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      showCancelConfirmation();
      return true; // Prevent default behavior
    });

    return () => backHandler.remove();
  }, [showCancelConfirmation]);

  // ============================================
  // Error State
  // ============================================

  if (!originalUrl || !publicId) {
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

  // ============================================
  // Main Render
  // ============================================

  return (
    <View className="flex-1 bg-gray-900 dark:bg-black" testID="categorize-screen">
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

        <Text className="text-lg font-semibold text-white">Catégorie</Text>

        <View className="w-11" />
      </View>

      {/* Image Preview */}
      <View className="items-center px-6 py-4">
        <Image
          source={{ uri: displayImageUrl }}
          className="h-48 w-48 rounded-xl bg-gray-800"
          resizeMode="contain"
          testID="clothing-image"
        />
        {usedFallback?.toLowerCase() === 'true' && (
          <Text className="mt-2 text-xs text-yellow-500">⚠️ Détourage non disponible</Text>
        )}
      </View>

      {/* Category Selection */}
      <View className="flex-1 px-4">
        <Text className="mb-4 text-center text-gray-400">
          {shouldPreselect && suggestedCategory
            ? "Catégorie suggérée par l'IA"
            : 'Sélectionnez une catégorie'}
        </Text>

        <CategorySelector
          selectedCategory={selectedCategory}
          suggestedCategory={suggestedCategory}
          showAiBadge={showAiBadge}
          onSelect={handleCategorySelect}
        />

        {/* Confidence indicator */}
        {suggestedCategory && categoryConfidence > 0 && (
          <Text className="mt-4 text-center text-xs text-gray-500">
            Confiance IA: {Math.min(100, Math.round(categoryConfidence))}%
          </Text>
        )}
      </View>

      {/* Actions */}
      <View className="gap-3 px-6 pb-8">
        <Pressable
          onPress={handleConfirm}
          disabled={!selectedCategory}
          className={`min-h-[56px] items-center justify-center rounded-xl py-4 ${
            selectedCategory ? 'bg-blue-600' : 'bg-gray-700 opacity-50'
          }`}
          accessibilityRole="button"
          accessibilityLabel="Confirmer la catégorie"
          accessibilityState={{ disabled: !selectedCategory }}
          testID="confirm-button">
          <Text className="font-semibold text-white">
            {selectedCategory ? 'Confirmer' : 'Sélectionnez une catégorie'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};
