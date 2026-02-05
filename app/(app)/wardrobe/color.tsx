/**
 * Color Selection Route
 * Story 2.6: Sélection couleur
 *
 * Placeholder for color selection screen.
 * Will be implemented in Story 2.6.
 */

import { View, Text, Pressable, Image } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CATEGORY_LABELS, type ClothingCategory } from '@/features/wardrobe/types/wardrobe.types';

export default function Color() {
  const { originalUrl, processedUrl, publicId, category } = useLocalSearchParams<{
    originalUrl: string;
    processedUrl: string;
    publicId: string;
    category: ClothingCategory;
  }>();

  const imageUrl = processedUrl || originalUrl;
  const categoryLabel = category ? CATEGORY_LABELS[category] : undefined;

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(tabs)');
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
        testID="color-placeholder-screen">
        <Ionicons name="construct-outline" size={64} color="#6B7280" />
        <Text className="mb-2 mt-4 text-center text-lg text-white">
          Sélection couleur en attente
        </Text>
        <Text className="mb-4 text-center text-gray-400">
          Story 2.6 implémentera cette fonctionnalité.
        </Text>

        {imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            className="mb-4 h-32 w-32 rounded-lg bg-gray-800"
            resizeMode="contain"
            testID="preview-image"
          />
        )}

        {categoryLabel && (
          <Text className="mb-4 text-center text-blue-400" testID="category-label">
            Catégorie: {categoryLabel}
          </Text>
        )}

        {publicId && (
          <Text className="mb-6 text-center text-xs text-gray-500" testID="public-id">
            ID: {publicId.split('/').pop()}
          </Text>
        )}

        <Pressable
          onPress={handleBack}
          className="min-h-[44px] rounded-lg bg-blue-600 px-6 py-3"
          accessibilityRole="button"
          accessibilityLabel="Retour à l'accueil"
          testID="color-back-button">
          <Text className="font-semibold text-white">Retour à l&apos;accueil</Text>
        </Pressable>
      </View>
    </>
  );
}
