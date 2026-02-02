import '../global.css';

import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { initSentry } from '@/lib/sentry';
import { useAuth } from '@/features/auth';
import { Toast } from '@/shared/components/Toast';

// Initialize Sentry BEFORE any React rendering (Story 0-6)
initSentry();

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

  // Show loading screen while checking auth state (Story 1.3)
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
      {/* Global Toast notification - mounted at root for app-wide visibility */}
      <Toast />
    </>
  );
}
