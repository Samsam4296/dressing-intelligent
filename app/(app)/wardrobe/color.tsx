/**
 * Color Selection Route
 * Story 2.6: Sélection couleur
 */

import { Stack } from 'expo-router';
import { ColorSelectionScreen } from '@/features/wardrobe/screens/ColorSelectionScreen';

export default function Color() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'card',
          gestureEnabled: false,
        }}
      />
      <ColorSelectionScreen />
    </>
  );
}
