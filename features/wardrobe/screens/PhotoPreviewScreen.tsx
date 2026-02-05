/**
 * Photo Preview Screen
 * Story 2.1: Capture Photo Camera
 *
 * Displays captured photo with Retake/Use actions.
 * AC#5: Preview screen with "Reprendre" and "Utiliser" buttons
 * AC#6: Photo compression before processing flow
 *
 * NFR-A1: Touch targets 44x44 minimum (56px buttons)
 * NFR-P3: Compression max 2048x2048, quality 0.8
 */

import { View, Image, Pressable, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { captureError } from '@/lib/logger';
import { showToast } from '@/shared/components/Toast';

/**
 * Maximum dimension for compressed photos (NFR-P3)
 */
const MAX_DIMENSION = 2048;

/**
 * JPEG compression quality (0.8 = ~500KB-1MB)
 */
const QUALITY = 0.8;

/**
 * Photo Preview Screen Component
 * - Displays full-screen preview of captured photo
 * - Retake: navigates back to camera
 * - Use: compresses and navigates to processing flow
 */
export const PhotoPreviewScreen = () => {
  const { photoUri } = useLocalSearchParams<{ photoUri: string }>();
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Handle retake - go back to camera (AC#5)
   */
  const handleRetake = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  /**
   * Handle use photo - compress and navigate to processing (AC#6)
   * Compresses to max 2048px width, 0.8 quality JPEG
   */
  const handleUsePhoto = async () => {
    if (!photoUri || isProcessing) return;

    setIsProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Resize and compress image (AC#6, NFR-P3)
      const manipResult = await ImageManipulator.manipulateAsync(
        photoUri,
        [{ resize: { width: MAX_DIMENSION } }],
        { compress: QUALITY, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Navigate to processing flow (Story 2.3 will handle detection)
      router.replace({
        pathname: '/wardrobe/process',
        params: { photoUri: manipResult.uri },
      });
    } catch (error) {
      captureError(error, 'wardrobe', 'PhotoPreviewScreen.handleUsePhoto');
      showToast({ type: 'error', message: 'Erreur lors du traitement de l\'image' });
      setIsProcessing(false);
    }
  };

  // Handle missing photo URI edge case
  if (!photoUri) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-white" testID="preview-no-photo">
          Photo non disponible
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 min-h-[44px] rounded-lg bg-gray-700 px-6 py-3"
          accessibilityRole="button"
          accessibilityLabel="Retour">
          <Text className="font-semibold text-white">Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Full-screen preview image */}
      <Image
        source={{ uri: photoUri }}
        className="flex-1"
        resizeMode="contain"
        testID="preview-image"
        accessibilityLabel="Prévisualisation de la photo"
      />

      {/* Action buttons - positioned at bottom */}
      <View className="absolute bottom-12 left-0 right-0 flex-row justify-center gap-6 px-6">
        {/* Retake button */}
        <Pressable
          onPress={handleRetake}
          disabled={isProcessing}
          className={`min-h-[56px] flex-1 flex-row items-center justify-center rounded-xl bg-white/20 py-4 ${
            isProcessing ? 'opacity-50' : ''
          }`}
          accessibilityRole="button"
          accessibilityLabel="Reprendre la photo"
          testID="preview-retake-button">
          <Ionicons name="refresh" size={20} color="white" />
          <Text className="ml-2 font-semibold text-white">Reprendre</Text>
        </Pressable>

        {/* Use photo button */}
        <Pressable
          onPress={handleUsePhoto}
          disabled={isProcessing}
          className={`min-h-[56px] flex-1 flex-row items-center justify-center rounded-xl bg-blue-600 py-4 ${
            isProcessing ? 'opacity-70' : ''
          }`}
          accessibilityRole="button"
          accessibilityLabel="Utiliser cette photo"
          testID="preview-use-button">
          {isProcessing ? (
            <ActivityIndicator color="white" testID="preview-loading" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="white" />
              <Text className="ml-2 font-semibold text-white">Utiliser</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
};
