/**
 * MMKV Storage Configuration
 *
 * Provides encrypted local storage for the app using MMKV.
 * MMKV is 30x faster than AsyncStorage and supports AES-256 encryption.
 */

import { MMKV } from 'react-native-mmkv';
import { Platform } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

/**
 * Get MMKV encryption key with security validation
 * - Production: REQUIRES EXPO_PUBLIC_MMKV_KEY env variable
 * - Development: Warns if missing, uses dev-only key
 */
const getEncryptionKey = (): string | undefined => {
  // Web platform doesn't support encryption
  if (Platform.OS === 'web') {
    return undefined;
  }

  const envKey = process.env.EXPO_PUBLIC_MMKV_KEY;

  if (envKey) {
    return envKey;
  }

  // In development, warn but allow a dev key
  if (__DEV__) {
    console.warn(
      '[Storage] EXPO_PUBLIC_MMKV_KEY not set. Using dev-only key. ' +
      'Set EXPO_PUBLIC_MMKV_KEY in .env for production!'
    );
    return 'dev-only-key-not-for-production';
  }

  // In production, throw error - sensitive data MUST be encrypted with proper key
  throw new Error(
    '[Storage] CRITICAL: EXPO_PUBLIC_MMKV_KEY must be set in production. ' +
    'Auth tokens and sensitive data require secure encryption.'
  );
};

// Main encrypted storage instance
export const storage = new MMKV({
  id: 'dressing-intelligent-storage',
  encryptionKey: getEncryptionKey(),
});

// Zustand persist middleware storage adapter
export const zustandStorage: StateStorage = {
  getItem: (name: string): string | null => {
    const value = storage.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string): void => {
    storage.set(name, value);
  },
  removeItem: (name: string): void => {
    storage.delete(name);
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
} as const;

// Helper functions for typed storage access
export const storageHelpers = {
  // Get JSON value
  getJSON: <T>(key: string): T | null => {
    const value = storage.getString(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  },

  // Set JSON value
  setJSON: <T>(key: string, value: T): void => {
    storage.set(key, JSON.stringify(value));
  },

  // Check if key exists
  has: (key: string): boolean => {
    return storage.contains(key);
  },

  // Clear all storage (for logout)
  clearAll: (): void => {
    storage.clearAll();
  },

  // Get all keys
  getAllKeys: (): string[] => {
    return storage.getAllKeys();
  },
};
