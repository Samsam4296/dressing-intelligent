/**
 * Camera Screen
 * Story 2.1: Capture Photo Camera
 *
 * Full-screen camera interface for clothing capture.
 * AC#1-4, AC#8: Permissions, preview, capture, flash control
 *
 * NFR-A1: Touch targets 44x44 minimum
 * NFR-P1: 60fps animations with Reanimated
 */

import { CameraView, useCameraPermissions } from 'expo-camera';
import type { CameraType } from 'expo-camera';
import { useRef, useState } from 'react';
import { View, Pressable, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { CameraOverlayGuide } from '../components/CameraOverlayGuide';
import { showToast } from '@/shared/components/Toast';
import { captureError } from '@/lib/logger';

/**
 * Flash state type with cycle: auto -> on -> off -> auto
 */
type FlashState = 'auto' | 'on' | 'off';

/**
 * Flash icons mapping for visual indicator
 */
const FLASH_ICONS: Record<FlashState, keyof typeof Ionicons.glyphMap> = {
  auto: 'flash-outline',
  on: 'flash',
  off: 'flash-off',
};

/**
 * Camera Screen Component
 * AC#3: Real-time preview with framing guide
 * AC#4: Photo capture with quality settings
 * AC#8: Flash toggle (auto/on/off)
 */
export const CameraScreen = () => {
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashState>('auto');
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);

  // Loading permissions state
  if (!permission) {
    return <View className="flex-1 bg-black" testID="camera-loading" />;
  }

  // Permission not granted - show request or settings redirect (AC#1, AC#2)
  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-900 p-6">
        <Ionicons name="camera-outline" size={64} color="#6B7280" />
        <Text className="mb-2 mt-4 text-center text-lg text-white">Accès caméra requis</Text>
        <Text className="mb-6 text-center text-gray-400">
          Pour photographier vos vêtements et construire votre garde-robe
        </Text>

        {permission.canAskAgain ? (
          <Pressable
            onPress={requestPermission}
            className="min-h-[44px] rounded-lg bg-blue-600 px-6 py-3"
            accessibilityRole="button"
            accessibilityLabel="Autoriser la caméra"
            testID="camera-permission-request-button">
            <Text className="font-semibold text-white">Autoriser la caméra</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => Linking.openSettings()}
            className="min-h-[44px] rounded-lg bg-gray-700 px-6 py-3"
            accessibilityRole="button"
            accessibilityLabel="Ouvrir les paramètres"
            testID="camera-settings-button">
            <Text className="font-semibold text-white">Ouvrir les paramètres</Text>
          </Pressable>
        )}
      </View>
    );
  }

  /**
   * Handle photo capture (AC#4)
   * Takes photo with quality 0.8, navigates to preview
   */
  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        exif: false,
        skipProcessing: false,
      });

      if (photo?.uri) {
        router.push({
          pathname: '/wardrobe/preview',
          params: { photoUri: photo.uri },
        });
      }
    } catch (error) {
      captureError(error, 'wardrobe', 'CameraScreen.handleCapture');
      showToast({ type: 'error', message: 'Erreur lors de la capture' });
    } finally {
      setIsCapturing(false);
    }
  };

  /**
   * Toggle flash mode (AC#8)
   * Cycles: auto -> on -> off -> auto
   */
  const toggleFlash = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFlash((current) => {
      if (current === 'auto') return 'on';
      if (current === 'on') return 'off';
      return 'auto';
    });
  };

  /**
   * Toggle camera facing (front/back)
   */
  const toggleFacing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={facing}
        flash={flash}
        autofocus="on"
        testID="camera-view">
        <CameraOverlayGuide />

        {/* Header: close, flash, flip */}
        <View className="absolute left-0 right-0 top-12 flex-row justify-between px-4">
          <Pressable
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full bg-black/50"
            accessibilityRole="button"
            accessibilityLabel="Fermer la caméra"
            testID="camera-close-button">
            <Ionicons name="close" size={24} color="white" />
          </Pressable>

          <View className="flex-row gap-3">
            <Pressable
              onPress={toggleFlash}
              className="h-11 w-11 items-center justify-center rounded-full bg-black/50"
              accessibilityRole="button"
              accessibilityLabel={`Flash ${flash}`}
              testID="camera-flash-button">
              <Ionicons name={FLASH_ICONS[flash]} size={24} color="white" />
            </Pressable>

            <Pressable
              onPress={toggleFacing}
              className="h-11 w-11 items-center justify-center rounded-full bg-black/50"
              accessibilityRole="button"
              accessibilityLabel="Changer de caméra"
              testID="camera-flip-button">
              <Ionicons name="camera-reverse" size={24} color="white" />
            </Pressable>
          </View>
        </View>

        {/* Capture button (64x64 as per story) */}
        <View className="absolute bottom-12 left-0 right-0 items-center">
          <Pressable
            onPress={handleCapture}
            disabled={isCapturing}
            className={`h-16 w-16 items-center justify-center rounded-full border-4 border-white ${
              isCapturing ? 'opacity-50' : ''
            }`}
            accessibilityRole="button"
            accessibilityLabel="Prendre la photo"
            testID="camera-capture-button">
            <View className="h-12 w-12 rounded-full bg-white" />
          </Pressable>
        </View>
      </CameraView>
    </View>
  );
};
