/**
 * Gallery Picker Screen
 * Story 2.2: Import depuis Galerie
 *
 * Opens native gallery picker on mount and handles image selection flow.
 * AC#1: Picker opens immediately
 * AC#2, AC#3: Format and size validation via galleryService
 * AC#4: Navigate to PhotoPreviewScreen on valid selection
 * AC#5: Return to previous screen on cancel
 *
 * NFR-A1: Touch targets 44x44 minimum
 * NFR-P1: Animations run at 60fps using Reanimated
 */

import { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { galleryService, isGalleryError } from '../services/galleryService';
import { showToast } from '@/shared/components/Toast';
import { captureError } from '@/lib/logger';

// ============================================
// Types
// ============================================

type ScreenState = 'picking' | 'validating' | 'error';

// ============================================
// Component
// ============================================

/**
 * Gallery Picker Screen
 * - Opens native picker immediately on mount
 * - Handles validation errors with re-try flow
 * - Navigates to PhotoPreviewScreen on success
 */
export const GalleryPickerScreen = () => {
  const [state, setState] = useState<ScreenState>('picking');
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Launch picker immediately on mount (AC#1)
    handlePickImage();

    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally run only on mount
  }, []);

  /**
   * Handle image selection from gallery
   * Validates format and size, navigates on success
   * Uses isMountedRef to prevent state updates on unmounted component
   */
  const handlePickImage = async () => {
    if (!isMountedRef.current) return;
    setState('picking');

    const { data, error } = await galleryService.pickImage();

    // Prevent state updates if component unmounted during async operation
    if (!isMountedRef.current) return;

    if (error) {
      // Use type guard for proper type checking
      if (isGalleryError(error)) {
        // User cancelled - silent return (AC#5)
        if (error.code === 'cancelled') {
          router.back();
          return;
        }

        // Display error feedback (AC#2, AC#3)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast({ type: 'error', message: error.message });

        // Recoverable errors: re-open picker for new selection
        if (error.code === 'file_too_large' || error.code === 'invalid_format') {
          // Small delay before reopening picker for better UX
          setTimeout(() => {
            if (isMountedRef.current) {
              handlePickImage();
            }
          }, 500);
          return;
        }
      }

      // Critical error: log and return after delay
      if (!isMountedRef.current) return;
      setState('error');
      captureError(error, 'wardrobe', 'GalleryPickerScreen.handlePickImage');

      setTimeout(() => {
        if (isMountedRef.current) {
          router.back();
        }
      }, 1500);
      return;
    }

    if (data && isMountedRef.current) {
      setState('validating');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Navigate to preview with selected image URI (AC#4)
      router.push({
        pathname: '/(app)/wardrobe/preview',
        params: { photoUri: data.uri },
      });
    }
  };

  // ============================================
  // Render
  // ============================================

  return (
    <View
      className="flex-1 items-center justify-center bg-gray-900 dark:bg-black"
      testID="gallery-picker-screen"
      accessibilityRole="none"
      accessibilityLabel="Écran de sélection galerie">
      <ActivityIndicator size="large" color="#3B82F6" testID="gallery-loading" />
      <Text
        className="mt-4 px-6 text-center text-gray-400"
        accessibilityLiveRegion="polite">
        {state === 'picking' && 'Sélectionnez une image...'}
        {state === 'validating' && 'Validation en cours...'}
        {state === 'error' && 'Erreur de sélection'}
      </Text>
    </View>
  );
};

export default GalleryPickerScreen;
