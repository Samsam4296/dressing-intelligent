/**
 * Storage Configuration using MMKV (encrypted) with AsyncStorage fallback
 *
 * Production: Uses react-native-mmkv with AES-256 encryption
 * Development (Expo Go): Falls back to AsyncStorage
 *
 * Story 1.3 AC#3: Refresh token stored securely (AES-256)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';
import * as Sentry from '@sentry/react-native';

// ============================================
// MMKV Storage (encrypted, synchronous)
// ============================================

let mmkvInstance: import('react-native-mmkv').MMKV | null = null;
let useMMKV = false;

/**
 * Try to initialize MMKV (requires development build, not Expo Go)
 * Falls back gracefully to AsyncStorage if MMKV is unavailable
 */
function initMMKV(): void {
  try {
    // Dynamic require to avoid crash in Expo Go
    const { MMKV } = require('react-native-mmkv');
    const encryptionKey = process.env.EXPO_PUBLIC_MMKV_KEY;

    if (!encryptionKey) {
      Sentry.captureMessage('MMKV_KEY not set - using MMKV without encryption', 'warning');
    }

    mmkvInstance = new MMKV({
      id: 'dressing-app-storage',
      ...(encryptionKey ? { encryptionKey } : {}),
    });

    useMMKV = true;
  } catch {
    // MMKV not available (Expo Go) - fall back to AsyncStorage
    useMMKV = false;
    mmkvInstance = null;
  }
}

// Initialize on module load
initMMKV();

// ============================================
// Unified Storage Interface
// ============================================

/**
 * Synchronous storage interface (works with MMKV, no-op for AsyncStorage)
 * Use storageHelpers for async operations when MMKV is unavailable
 */
export const storage = {
  getString: (key: string): string | null => {
    if (useMMKV && mmkvInstance) {
      return mmkvInstance.getString(key) ?? null;
    }
    // AsyncStorage is async - return null synchronously
    // Zustand hydration handles async loading via zustandStorage
    return null;
  },

  set: (key: string, value: string): void => {
    if (useMMKV && mmkvInstance) {
      mmkvInstance.set(key, value);
      return;
    }
    AsyncStorage.setItem(key, value).catch((err) => {
      Sentry.captureException(err, { tags: { feature: 'storage', action: 'set', key } });
    });
  },

  delete: (key: string): void => {
    if (useMMKV && mmkvInstance) {
      mmkvInstance.delete(key);
      return;
    }
    AsyncStorage.removeItem(key).catch((err) => {
      Sentry.captureException(err, { tags: { feature: 'storage', action: 'delete', key } });
    });
  },

  contains: (key: string): boolean => {
    if (useMMKV && mmkvInstance) {
      return mmkvInstance.contains(key);
    }
    return false;
  },

  clearAll: (): void => {
    if (useMMKV && mmkvInstance) {
      mmkvInstance.clearAll();
      return;
    }
    AsyncStorage.clear().catch((err) => {
      Sentry.captureException(err, { tags: { feature: 'storage', action: 'clearAll' } });
    });
  },

  getAllKeys: (): string[] => {
    if (useMMKV && mmkvInstance) {
      return mmkvInstance.getAllKeys();
    }
    return [];
  },
};

// ============================================
// Zustand Persist Middleware Adapter
// ============================================

/**
 * Zustand persist middleware storage adapter
 * Uses MMKV (sync) when available, AsyncStorage (async) as fallback
 */
export const zustandStorage: StateStorage = {
  getItem: (name: string): string | null | Promise<string | null> => {
    if (useMMKV && mmkvInstance) {
      return mmkvInstance.getString(name) ?? null;
    }
    return AsyncStorage.getItem(name);
  },
  setItem: (name: string, value: string): void | Promise<void> => {
    if (useMMKV && mmkvInstance) {
      mmkvInstance.set(name, value);
      return;
    }
    return AsyncStorage.setItem(name, value) as unknown as Promise<void>;
  },
  removeItem: (name: string): void | Promise<void> => {
    if (useMMKV && mmkvInstance) {
      mmkvInstance.delete(name);
      return;
    }
    return AsyncStorage.removeItem(name) as unknown as Promise<void>;
  },
};

// ============================================
// Storage Keys
// ============================================

export const STORAGE_KEYS = {
  AUTH_STATE: 'auth-state',
  PROFILE_STATE: 'profile-state',
  SETTINGS_STATE: 'settings-state',
  WARDROBE_CACHE: 'wardrobe-cache',
  RECOMMENDATIONS_CACHE: 'recommendations-cache',
  LAST_SYNC: 'last-sync',
  LAST_ACTIVITY: 'last-activity', // Story 1.14: NFR-S9 inactivity tracking
} as const;

// ============================================
// Async Helper Functions
// ============================================

/**
 * Helper functions for typed async storage access
 * Works with both MMKV and AsyncStorage backends
 */
export const storageHelpers = {
  getJSON: async <T>(key: string): Promise<T | null> => {
    let value: string | null = null;
    if (useMMKV && mmkvInstance) {
      value = mmkvInstance.getString(key) ?? null;
    } else {
      value = await AsyncStorage.getItem(key);
    }
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  },

  setJSON: async <T>(key: string, value: T): Promise<void> => {
    const serialized = JSON.stringify(value);
    if (useMMKV && mmkvInstance) {
      mmkvInstance.set(key, serialized);
    } else {
      await AsyncStorage.setItem(key, serialized);
    }
  },

  has: async (key: string): Promise<boolean> => {
    if (useMMKV && mmkvInstance) {
      return mmkvInstance.contains(key);
    }
    const value = await AsyncStorage.getItem(key);
    return value !== null;
  },

  clearAll: async (): Promise<void> => {
    if (useMMKV && mmkvInstance) {
      mmkvInstance.clearAll();
    } else {
      await AsyncStorage.clear();
    }
  },

  getAllKeys: async (): Promise<string[]> => {
    if (useMMKV && mmkvInstance) {
      return mmkvInstance.getAllKeys();
    }
    const keys = await AsyncStorage.getAllKeys();
    return keys ? [...keys] : [];
  },
};

/**
 * Update last activity timestamp for inactivity tracking
 * Story 1.14: NFR-S9 - Session invalidated after 30 days of inactivity
 */
export const updateLastActivity = async (): Promise<void> => {
  await storageHelpers.setJSON(STORAGE_KEYS.LAST_ACTIVITY, Date.now());
};
