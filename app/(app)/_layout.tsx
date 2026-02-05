/**
 * App Layout
 * Story 2.1: Capture Photo Camera
 *
 * Layout for authenticated app screens (wardrobe, etc.)
 * Provides full-screen modal presentation for camera/preview
 */

import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
