/**
 * Color Selection Route
 * Story 2.6: Sélection couleur
 *
 * Placeholder for color selection screen.
 * Will be implemented in Story 2.6.
 */

import { View, Text } from 'react-native';
import { Stack } from 'expo-router';

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
      <View className="flex-1 items-center justify-center bg-gray-900 dark:bg-black">
        <Text className="text-lg text-white">Sélection couleur - Story 2.6</Text>
      </View>
    </>
  );
}
