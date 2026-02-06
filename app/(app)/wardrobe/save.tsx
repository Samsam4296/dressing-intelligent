/**
 * Save Route - Placeholder
 * Story 2.7: Upload et stockage photo
 *
 * Placeholder to prevent navigation errors from ColorSelectionScreen.
 * Will be fully implemented in Story 2.7.
 */

import { View, Text, Pressable, Image } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  CATEGORY_LABELS,
  COLOR_LABELS,
  COLOR_HEX,
  type ClothingCategory,
  type ClothingColor,
} from '@/features/wardrobe/types/wardrobe.types';
import { categoryService } from '@/features/wardrobe/services/categoryService';

export default function Save() {
  const {
    originalUrl,
    processedUrl,
    category: categoryParam,
    color: colorParam,
  } = useLocalSearchParams<{
    originalUrl: string;
    processedUrl: string;
    publicId: string;
    category: string;
    color: string;
  }>();

  const category = categoryService.parseCategory(categoryParam) as ClothingCategory | null;
  const color = (colorParam as ClothingColor) || null;

  const imageUrl = processedUrl || originalUrl;
  const categoryLabel = category ? CATEGORY_LABELS[category] : undefined;
  const colorLabel = color ? COLOR_LABELS[color] : undefined;
  const colorHex = color ? COLOR_HEX[color] : undefined;

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.dismissAll();
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'card',
          gestureEnabled: false,
        }}
      />
      <View
        className="flex-1 items-center justify-center bg-gray-900 p-6 dark:bg-black"
        testID="save-placeholder-screen">
        <Ionicons name="construct-outline" size={64} color="#6B7280" />
        <Text className="mb-2 mt-4 text-center text-lg text-white">Sauvegarde en attente</Text>
        <Text className="mb-4 text-center text-gray-400">
          Story 2.7 implémentera la sauvegarde du vêtement.
        </Text>

        {imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            className="mb-4 h-32 w-32 rounded-lg bg-gray-800"
            resizeMode="contain"
            testID="preview-image"
          />
        )}

        <View className="mb-4 flex-row items-center gap-3">
          {categoryLabel && (
            <Text className="text-blue-400" testID="category-label">
              {categoryLabel}
            </Text>
          )}
          {colorLabel && (
            <View className="flex-row items-center gap-1">
              {colorHex && (
                <View
                  className="h-4 w-4 rounded-full border border-gray-500"
                  style={{ backgroundColor: colorHex }}
                />
              )}
              <Text className="text-green-400" testID="color-label">
                {colorLabel}
              </Text>
            </View>
          )}
        </View>

        <Pressable
          onPress={handleBack}
          className="min-h-[44px] rounded-lg bg-blue-600 px-6 py-3"
          accessibilityRole="button"
          accessibilityLabel="Retour à l'accueil"
          testID="save-back-button">
          <Text className="font-semibold text-white">Retour à l&apos;accueil</Text>
        </Pressable>
      </View>
    </>
  );
}
