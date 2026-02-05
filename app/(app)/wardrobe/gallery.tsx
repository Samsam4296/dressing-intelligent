/**
 * Gallery Route
 * Story 2.2: Import depuis Galerie
 *
 * Expo Router file for gallery picker screen.
 * Opens as fullscreen modal with fade animation.
 */

import { Stack } from 'expo-router';
import { GalleryPickerScreen } from '@/features/wardrobe/screens/GalleryPickerScreen';

export default function Gallery() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'fade',
        }}
      />
      <GalleryPickerScreen />
    </>
  );
}
