/**
 * Camera Overlay Guide Component
 * Story 2.1: Capture Photo Camera
 *
 * Displays a framing guide and placement tip on the camera preview.
 * AC#3: Guide de cadrage (zone + conseil "fond uni")
 *
 * NFR-A1: Accessible text with proper contrast
 */

import { View, Text } from 'react-native';

/**
 * Camera overlay with framing guide and placement tips
 * - Square framing guide (80% width, aspect-square)
 * - Tip text for uniform background placement
 */
export const CameraOverlayGuide = () => {
  return (
    <View
      className="absolute inset-0 items-center justify-center"
      pointerEvents="none"
      testID="camera-overlay-guide">
      {/* Framing zone (square aspect ratio) */}
      <View
        className="aspect-square w-[80%] rounded-2xl border-2 border-white/60"
        testID="camera-framing-zone"
      />

      {/* Placement tip - positioned above capture button */}
      <View className="absolute bottom-32 rounded-full bg-black/60 px-4 py-2">
        <Text className="text-center text-sm text-white" accessibilityRole="text">
          Placez le vêtement sur un fond uni clair
        </Text>
      </View>
    </View>
  );
};
