/**
 * Save Route
 * Story 2.7: Upload et stockage photo
 *
 * Final screen in clothing add flow - auto-saves on mount.
 */

import { Stack } from 'expo-router';
import { SaveScreen } from '@/features/wardrobe/screens/SaveScreen';

export default function Save() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'card',
          gestureEnabled: false, // Pas de swipe back pendant la sauvegarde
        }}
      />
      <SaveScreen />
    </>
  );
}
