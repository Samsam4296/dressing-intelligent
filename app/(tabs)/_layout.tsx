/**
 * Tabs Layout
 * Main app navigation after authentication and profile creation.
 *
 * Story 1.7: Switch Entre Profils
 * - useSyncPendingSwitch: Syncs offline profile switches on reconnection (AC#11)
 * - useValidateActiveProfile: Auto-recovers if active profile is deleted (AC#18)
 *
 * This layout will be expanded in future stories to include:
 * - Home/Recommendations tab
 * - Wardrobe tab
 * - Settings tab
 */

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useSyncPendingSwitch, useValidateActiveProfile } from '@/features/profiles';

export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Story 1.7: Sync offline profile switches when network is restored (AC#11)
  useSyncPendingSwitch();

  // Story 1.7: Auto-recover if active profile no longer exists (AC#18)
  useValidateActiveProfile();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? '#60A5FA' : '#3B82F6',
        tabBarInactiveTintColor: isDark ? '#6B7280' : '#9CA3AF',
        tabBarStyle: {
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          borderTopColor: isDark ? '#374151' : '#E5E7EB',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profiles"
        options={{
          title: 'Profils',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
