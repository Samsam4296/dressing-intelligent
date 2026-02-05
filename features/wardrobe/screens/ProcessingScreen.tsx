/**
 * Processing Screen
 * Story 2.3: Détourage automatique
 *
 * Displays processing progress with animated spinner.
 * AC#1: Progress indicator with contextual messages
 * AC#3: Navigate to categorization on success
 * AC#5: Error state with retry option
 * AC#6: Cancel support with AbortController
 *
 * NFR-A1: Touch targets 44x44 minimum
 * NFR-P1: Animations run at 60fps using Reanimated
 */

import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, BackHandler } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { imageProcessingService } from '../services/imageProcessingService';
import { isProcessingError, type ProcessingError } from '../types/wardrobe.types';
import { useProfileStore } from '@/features/profiles';
import { showToast } from '@/shared/components/Toast';
import { captureError } from '@/lib/logger';

// ============================================
// Types
// ============================================

type ProcessingState = 'uploading' | 'processing' | 'success' | 'error';

const STATE_MESSAGES: Record<ProcessingState, string> = {
  uploading: 'Upload en cours...',
  processing: 'Détourage en cours...',
  success: 'Terminé !',
  error: 'Une erreur est survenue',
};

// ============================================
// Component
// ============================================

/**
 * Processing Screen
 * - Starts processing on mount
 * - Shows animated spinner during processing
 * - Handles errors with retry option
 * - Navigates to categorization on success
 */
export const ProcessingScreen = () => {
  const { photoUri } = useLocalSearchParams<{ photoUri: string }>();
  const currentProfileId = useProfileStore((s) => s.currentProfileId);

  const [state, setState] = useState<ProcessingState>('uploading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // ============================================
  // Animation Setup
  // ============================================

  const rotation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // ============================================
  // Effects
  // ============================================

  useEffect(() => {
    isMountedRef.current = true;

    // Start rotation animation (60fps)
    rotation.value = withRepeat(withTiming(360, { duration: 1000 }), -1, false);

    // Start processing
    startProcessing();

    // Handle Android back button (AC#6)
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCancel();
      return true; // Prevent default behavior
    });

    return () => {
      isMountedRef.current = false;
      cancelAnimation(rotation);
      abortControllerRef.current?.abort();
      backHandler.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally run only on mount
  }, []);

  // Stop animation on final states (P2 performance fix)
  useEffect(() => {
    if (state === 'success' || state === 'error') {
      cancelAnimation(rotation);
    }
  }, [state, rotation]);

  // ============================================
  // Processing Logic
  // ============================================

  const startProcessing = async () => {
    // Validate required params
    if (!photoUri || !currentProfileId) {
      setErrorMessage('Paramètres manquants');
      setState('error');
      return;
    }

    // Create new AbortController for this attempt
    abortControllerRef.current = new AbortController();

    // Simulate visual progression (~2s before showing "processing")
    // Using functional update to avoid stale closure
    const progressTimer = setTimeout(() => {
      if (isMountedRef.current) {
        setState((currentState) => (currentState === 'uploading' ? 'processing' : currentState));
      }
    }, 2000);

    // Call Edge Function
    const { data, error } = await imageProcessingService.processImage({
      photoUri,
      profileId: currentProfileId,
      signal: abortControllerRef.current.signal,
    });

    // Clear progress timer
    clearTimeout(progressTimer);

    // Prevent state updates if unmounted
    if (!isMountedRef.current) return;

    // Handle error
    if (error) {
      if (isProcessingError(error) && error.code === 'cancelled') {
        return; // Silent return, already navigating back
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage(error.message);
      setCanRetry(isProcessingError(error) ? error.retryable : false);
      setState('error');
      captureError(error, 'wardrobe', 'ProcessingScreen.startProcessing');
      return;
    }

    // Handle success
    if (data) {
      // Show toast if fallback was used (AC#4)
      if (data.usedFallback) {
        showToast({
          type: 'info',
          message: 'Détourage non disponible, photo originale conservée',
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setState('success');

      // Navigate to categorization after brief success display (AC#3)
      setTimeout(() => {
        if (isMountedRef.current) {
          router.replace({
            pathname: '/(app)/wardrobe/categorize',
            params: {
              originalUrl: data.originalUrl,
              // Empty string for null (Expo Router doesn't support null params)
              processedUrl: data.processedUrl ?? '',
              publicId: data.publicId,
              usedFallback: data.usedFallback ? 'true' : 'false',
            },
          });
        }
      }, 500);
    }
  };

  // ============================================
  // Action Handlers
  // ============================================

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    abortControllerRef.current?.abort();
    router.back();
  };

  const handleRetry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setState('uploading');
    setErrorMessage(null);
    startProcessing();
  };

  // ============================================
  // Render
  // ============================================

  return (
    <View
      className="flex-1 items-center justify-center bg-gray-900 dark:bg-black px-6"
      testID="processing-screen"
      accessibilityRole="none"
      accessibilityLabel="Écran de traitement d'image">
      {/* Spinner (uploading/processing states) */}
      {state !== 'error' && state !== 'success' && (
        <Animated.View style={animatedStyle} testID="spinner">
          <Ionicons name="sync-outline" size={64} color="#3B82F6" />
        </Animated.View>
      )}

      {/* Success Icon */}
      {state === 'success' && (
        <Ionicons name="checkmark-circle" size={64} color="#22C55E" testID="success-icon" />
      )}

      {/* Error Icon */}
      {state === 'error' && (
        <Ionicons name="alert-circle" size={64} color="#EF4444" testID="error-icon" />
      )}

      {/* Status Message */}
      <Text
        className="mt-6 text-center text-lg font-medium text-white"
        accessibilityLiveRegion="polite">
        {STATE_MESSAGES[state]}
      </Text>

      {/* Error Message */}
      {errorMessage && (
        <Text className="mt-2 text-center text-sm text-gray-400" testID="error-message">
          {errorMessage}
        </Text>
      )}

      {/* Action Buttons */}
      <View className="mt-8 w-full gap-3">
        {/* Retry Button (error state with retryable) */}
        {state === 'error' && canRetry && (
          <Pressable
            onPress={handleRetry}
            className="min-h-[44px] items-center justify-center rounded-lg bg-blue-600 py-3"
            accessibilityRole="button"
            accessibilityLabel="Réessayer le traitement"
            testID="retry-button">
            <Text className="font-semibold text-white">Réessayer</Text>
          </Pressable>
        )}

        {/* Cancel Button (all states except success) */}
        {(state === 'error' || state === 'uploading' || state === 'processing') && (
          <Pressable
            onPress={handleCancel}
            className="min-h-[44px] items-center justify-center rounded-lg bg-gray-700 py-3"
            accessibilityRole="button"
            accessibilityLabel="Annuler le traitement"
            testID="cancel-button">
            <Text className="font-semibold text-white">Annuler</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

export default ProcessingScreen;
