/**
 * Categorize Route (Placeholder)
 * Story 2.4: Catégorisation automatique
 *
 * Placeholder for Story 2.4.
 * Receives processed image params and will implement category selection.
 *
 * Params:
 * - originalUrl: Cloudinary URL of original image
 * - processedUrl: Cloudinary URL with background removed ('' if fallback)
 * - publicId: Cloudinary public_id for reference
 * - usedFallback: 'true' | 'false' indicating if background removal failed
 */

import { View, Text, Pressable, Image } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Categorize() {
  const { originalUrl, processedUrl, publicId, usedFallback } = useLocalSearchParams<{
    originalUrl: string;
    processedUrl: string; // '' if fallback
    publicId: string;
    usedFallback: string; // 'true' | 'false'
  }>();

  // Use processed image if available, otherwise original
  const imageUrl = processedUrl || originalUrl;
  const didUseFallback = usedFallback === 'true';

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <View
        className="flex-1 items-center justify-center bg-gray-900 dark:bg-black p-6"
        testID="categorize-screen">
        <Ionicons name="construct-outline" size={64} color="#6B7280" />
        <Text className="mb-2 mt-4 text-center text-lg text-white">
          Catégorisation en attente
        </Text>
        <Text className="mb-4 text-center text-gray-400">
          Story 2.4 (Catégorisation automatique) implémentera cette fonctionnalité.
        </Text>

        {/* Preview of processed image */}
        {imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            className="mb-4 h-40 w-40 rounded-lg"
            resizeMode="contain"
            testID="preview-image"
            accessibilityLabel="Aperçu du vêtement"
          />
        )}

        {didUseFallback && (
          <Text className="mb-4 text-center text-xs text-yellow-500">
            ⚠️ Détourage non disponible (image originale)
          </Text>
        )}

        <Text className="mb-6 text-center text-xs text-gray-500" numberOfLines={1}>
          publicId: ...{publicId?.slice(-20)}
        </Text>

        <Pressable
          onPress={() => router.replace('/(tabs)')}
          className="min-h-[44px] rounded-lg bg-blue-600 px-6 py-3"
          accessibilityRole="button"
          accessibilityLabel="Retour à l'accueil"
          testID="categorize-back-button">
          <Text className="font-semibold text-white">Retour à l&apos;accueil</Text>
        </Pressable>
      </View>
    </>
  );
}
