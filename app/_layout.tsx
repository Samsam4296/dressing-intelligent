import '../global.css';

import { useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { initSentry } from '@/lib/sentry';
import { useAuth } from '@/features/auth';
import { Toast, showToast } from '@/shared/components/Toast';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { updateLastActivity } from '@/lib/storage';
import { useValidateActiveProfile } from '@/features/profiles';

// Initialize Sentry BEFORE any React rendering (Story 0-6)
initSentry();

// Prevent splash screen from auto-hiding until auth is initialized
SplashScreen.preventAutoHideAsync();

/**
 * Loading screen shown during auth state initialization
 * Story 1.3: Prevents flash of wrong screen on app launch
 */
function LoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
      <ActivityIndicator size="large" color="#3B82F6" />
    </View>
  );
}

export default function Layout() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading, inactivityError } = useAuth();
  const lastSegmentsRef = useRef<string[] | null>(null);

  // Story 1.14 AC#3: Validate profile exists after session restore
  useValidateActiveProfile();

  // Hide splash screen once auth state is determined
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  // Story 1.14 AC#2: Display Toast if session expired due to 30-day inactivity (NFR-S9)
  useEffect(() => {
    if (inactivityError) {
      showToast({ type: 'error', message: inactivityError });
    }
  }, [inactivityError]);

  // Story 1.14 AC#6: Track user activity on navigation changes
  useEffect(() => {
    // Skip activity tracking when not authenticated
    // Note: expo-router guarantees segments is never empty (always has root segment)
    if (!isAuthenticated) return;

    // Check if segments changed (null means first render - always track)
    const isFirstRender = lastSegmentsRef.current === null;
    const segmentsChanged =
      isFirstRender || JSON.stringify(segments) !== JSON.stringify(lastSegmentsRef.current);

    if (segmentsChanged) {
      lastSegmentsRef.current = [...segments];
      // Fire-and-forget with error handling - don't block navigation
      updateLastActivity().catch(() => {
        // Silently ignore - activity tracking is non-critical
        // Storage errors are already logged by Sentry in storage.ts
      });
    }
  }, [segments, isAuthenticated]);

  useEffect(() => {
    // Skip redirect during loading
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    const inTabsGroup = segments[0] === '(tabs)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect unauthenticated users to welcome screen
      router.replace('/(auth)/welcome');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect authenticated users away from auth screens to main app
      router.replace('/(tabs)');
    } else if (isAuthenticated && !inTabsGroup && !inAuthGroup && segments[0] !== '(app)') {
      // Redirect authenticated users from root to tabs
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  // Show loading screen while checking auth state (Story 1.3)
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
      {/* Global Toast notification - mounted at root for app-wide visibility */}
      <Toast />
    </ErrorBoundary>
  );
}
