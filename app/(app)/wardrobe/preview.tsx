/**
 * Photo Preview Route
 * Story 2.1: Capture Photo Camera
 *
 * Photo preview with retake/use actions.
 * AC#5: Preview screen with "Reprendre" and "Utiliser" buttons
 */

import { Stack } from 'expo-router';
import { PhotoPreviewScreen } from '@/features/wardrobe/screens/PhotoPreviewScreen';

export default function Preview() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <PhotoPreviewScreen />
    </>
  );
}
