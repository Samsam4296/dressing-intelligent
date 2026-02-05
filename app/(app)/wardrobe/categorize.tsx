/**
 * Categorize Route
 * Story 2.4: Catégorisation automatique
 *
 * Screen for selecting clothing category with AI-suggested pre-selection.
 */

import { Stack } from 'expo-router';
import { CategorizeScreen } from '@/features/wardrobe/screens/CategorizeScreen';

export default function Categorize() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'card',
          gestureEnabled: false, // Force passage par dialogue confirmation
        }}
      />
      <CategorizeScreen />
    </>
  );
}
