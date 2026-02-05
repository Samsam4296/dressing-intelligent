/**
 * Camera Route
 * Story 2.1: Capture Photo Camera
 *
 * Full-screen modal camera interface for clothing capture.
 */

import { Stack } from 'expo-router';
import { CameraScreen } from '@/features/wardrobe/screens/CameraScreen';

export default function Camera() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'fade',
        }}
      />
      <CameraScreen />
    </>
  );
}
