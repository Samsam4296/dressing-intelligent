/**
 * useTheme Hook
 *
 * Provides theme management with support for system, light, and dark modes.
 * Integrates with NativeWind's color scheme and the settings store.
 */

import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useSettingsStore } from '@/stores';
import { useEffect } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

export function useTheme() {
  const { setColorScheme } = useNativeWindColorScheme();
  const systemColorScheme = useRNColorScheme();
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const setStoredColorScheme = useSettingsStore((state) => state.setColorScheme);

  // Resolve the actual color scheme based on theme setting
  const resolvedColorScheme: 'light' | 'dark' =
    theme === 'system' ? (systemColorScheme ?? 'light') : theme;

  // Sync NativeWind color scheme with settings
  useEffect(() => {
    setColorScheme(resolvedColorScheme);
    setStoredColorScheme(resolvedColorScheme);
  }, [resolvedColorScheme, setColorScheme, setStoredColorScheme]);

  // Toggle between light and dark (ignoring system)
  const toggleTheme = () => {
    setTheme(resolvedColorScheme === 'light' ? 'dark' : 'light');
  };

  // Set specific theme mode
  const setThemeMode = (mode: ThemeMode) => {
    setTheme(mode);
  };

  return {
    // Current resolved color scheme ('light' | 'dark')
    colorScheme: resolvedColorScheme,

    // Current theme setting ('light' | 'dark' | 'system')
    theme,

    // Is dark mode active
    isDark: resolvedColorScheme === 'dark',

    // Is light mode active
    isLight: resolvedColorScheme === 'light',

    // Is system theme active
    isSystem: theme === 'system',

    // Actions
    toggleTheme,
    setTheme: setThemeMode,
  };
}

// Export type for consumers
export type UseThemeReturn = ReturnType<typeof useTheme>;
