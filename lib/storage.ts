/**
 * MMKV Storage Configuration
 *
 * Provides encrypted local storage for the app using MMKV.
 * MMKV is 30x faster than AsyncStorage and supports AES-256 encryption.
 */

import { MMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

// Main encrypted storage instance
export const storage = new MMKV({
  id: 'dressing-intelligent-storage',
  encryptionKey: process.env.EXPO_PUBLIC_MMKV_KEY || 'dev-encryption-key-change-in-prod',
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
