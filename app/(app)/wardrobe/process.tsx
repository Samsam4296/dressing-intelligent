/**
 * Photo Processing Route
 * Story 2.3: Détourage automatique
 *
 * Expo Router file for processing screen.
 * Receives photoUri and triggers background removal via Edge Function.
 * gestureEnabled: false prevents accidental swipe-back during processing.
 */

import { Stack } from 'expo-router';
import { ProcessingScreen } from '@/features/wardrobe/screens/ProcessingScreen';

export default function Process() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'card',
          gestureEnabled: false, // Prevent swipe back during processing
        }}
      />
      <ProcessingScreen />
    </>
  );
}
