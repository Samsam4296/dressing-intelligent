/**
 * Photo Processing Route (Placeholder)
 * Story 2.1: Capture Photo Camera
 *
 * Placeholder for Story 2.3 (Détourage automatique)
 * This route receives the compressed photo URI and will trigger
 * background removal via Cloudinary.
 */

import { View, Text, Pressable } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Process() {
  const { photoUri } = useLocalSearchParams<{ photoUri: string }>();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <View className="flex-1 items-center justify-center bg-gray-900 p-6">
        <Ionicons name="construct-outline" size={64} color="#6B7280" />
        <Text className="mb-2 mt-4 text-center text-lg text-white">
          Traitement en cours...
        </Text>
        <Text className="mb-6 text-center text-gray-400">
          Story 2.3 (Détourage automatique) implémentera cette fonctionnalité.
        </Text>
        {photoUri && (
          <Text className="mb-6 text-center text-xs text-gray-500" numberOfLines={1}>
            Photo: {photoUri.slice(-30)}...
          </Text>
        )}
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          className="min-h-[44px] rounded-lg bg-blue-600 px-6 py-3"
          accessibilityRole="button"
          accessibilityLabel="Retour à l'accueil"
          testID="process-back-button">
          <Text className="font-semibold text-white">Retour à l'accueil</Text>
        </Pressable>
      </View>
    </>
  );
}
