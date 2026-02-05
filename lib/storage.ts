/**
 * Storage Configuration using AsyncStorage
 *
 * Compatible with Expo Go for development.
 * For production, consider adding MMKV back with a development build.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

/**
 * Unified storage interface using AsyncStorage
 */
export const storage = {
  getString: (_key: string): string | null => {
    // AsyncStorage is async, this returns null synchronously
    // Zustand hydration handles async loading
    return null;
  },

  set: (key: string, value: string): void => {
    AsyncStorage.setItem(key, value).catch(console.error);
  },

  delete: (key: string): void => {
    AsyncStorage.removeItem(key).catch(console.error);
  },

  contains: (_key: string): boolean => {
    // Sync check not possible with AsyncStorage
    return false;
  },

  clearAll: (): void => {
    AsyncStorage.clear().catch(console.error);
  },

  getAllKeys: (): string[] => {
    // Sync not possible, return empty
    return [];
  },
};

/**
 * Zustand persist middleware storage adapter
 * Fully async for AsyncStorage compatibility
 */
export const zustandStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return AsyncStorage.getItem(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await AsyncStorage.removeItem(name);
  },
};

// Storage keys constants
export const STORAGE_KEYS = {
  AUTH_STATE: 'auth-state',
  PROFILE_STATE: 'profile-state',
  SETTINGS_STATE: 'settings-state',
  WARDROBE_CACHE: 'wardrobe-cache',
  RECOMMENDATIONS_CACHE: 'recommendations-cache',
  LAST_SYNC: 'last-sync',
  LAST_ACTIVITY: 'last-activity', // Story 1.14: NFR-S9 inactivity tracking
} as const;

// Helper functions for typed storage access
export const storageHelpers = {
  // Get JSON value
  getJSON: async <T>(key: string): Promise<T | null> => {
    const value = await AsyncStorage.getItem(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  },

  // Set JSON value
  setJSON: async <T>(key: string, value: T): Promise<void> => {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },

  // Check if key exists
  has: async (key: string): Promise<boolean> => {
    const value = await AsyncStorage.getItem(key);
    return value !== null;
  },

  // Clear all storage (for logout)
  clearAll: async (): Promise<void> => {
    await AsyncStorage.clear();
  },

  // Get all keys
  getAllKeys: async (): Promise<string[]> => {
    const keys = await AsyncStorage.getAllKeys();
    return keys ? [...keys] : [];
  },
};

/**
 * Update last activity timestamp for inactivity tracking
 * Story 1.14: NFR-S9 - Session invalidated after 30 days of inactivity
 *
 * @returns Promise that resolves when timestamp is stored
 */
export const updateLastActivity = async (): Promise<void> => {
  await storageHelpers.setJSON(STORAGE_KEYS.LAST_ACTIVITY, Date.now());
};
