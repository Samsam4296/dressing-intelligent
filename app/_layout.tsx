import '../global.css';

import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { initSentry } from '@/lib/sentry';
import { useAuth } from '@/features/auth';

// Initialize Sentry BEFORE any React rendering (Story 0-6)
initSentry();

export default function Layout() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Skip redirect during loading
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect unauthenticated users to welcome screen
      router.replace('/(auth)/welcome');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect authenticated users away from auth screens
      // This will be updated when main app screens are created
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
