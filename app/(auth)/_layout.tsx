/**
 * Auth Group Layout
 * Story 1.1: Écran de Bienvenue
 *
 * Layout for authentication screens (welcome, login, signup)
 * Uses Stack navigation for the auth flow
 */

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
