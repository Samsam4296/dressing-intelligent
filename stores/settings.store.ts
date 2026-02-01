/**
 * Settings Store
 *
 * Manages user settings including notifications, location, theme, and subscription.
 * Persisted to MMKV with AES-256 encryption.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage, STORAGE_KEYS } from '@/lib/storage';
import type { SubscriptionStatus } from '@/types/database.types';

// Location data type
export interface LocationData {
  city: string;
  latitude: number;
  longitude: number;
  useGeolocation: boolean;
}

// Notification settings type
export interface NotificationSettings {
  enabled: boolean;
  time: string; // Format: "HH:MM"
  pushToken: string | null;
}

// Subscription data type
export interface SubscriptionData {
  status: SubscriptionStatus;
  trialStartDate: string | null;
  subscriptionStartDate: string | null;
  expiresAt: string | null;
}

// Settings state types
export interface SettingsState {
  // Theme
  theme: 'light' | 'dark' | 'system';
  colorScheme: 'light' | 'dark'; // Resolved theme

  // Location
  location: LocationData | null;

  // Notifications
  notifications: NotificationSettings;

  // Subscription
  subscription: SubscriptionData;

  // Network status
  isOnline: boolean;

  // Loading states
  isLoading: boolean;

  // Error handling
  error: string | null;
}

// Settings actions types
export interface SettingsActions {
  // Theme
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setColorScheme: (colorScheme: 'light' | 'dark') => void;

  // Location
  setLocation: (location: LocationData) => void;
  clearLocation: () => void;
  setUseGeolocation: (useGeolocation: boolean) => void;

  // Notifications
  setNotificationsEnabled: (enabled: boolean) => void;
  setNotificationTime: (time: string) => void;
  setPushToken: (token: string | null) => void;

  // Subscription
  setSubscription: (subscription: Partial<SubscriptionData>) => void;

  // Network
  setOnline: (isOnline: boolean) => void;

  // Loading
  setLoading: (isLoading: boolean) => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;

  // Reset
  reset: () => void;
}

// Combined store type
export type SettingsStore = SettingsState & SettingsActions;

// Initial state
const initialState: SettingsState = {
  theme: 'system',
  colorScheme: 'light',
  location: null,
  notifications: {
    enabled: true,
    time: '07:00',
    pushToken: null,
  },
  subscription: {
    status: 'trial',
    trialStartDate: null,
    subscriptionStartDate: null,
    expiresAt: null,
  },
  isOnline: true,
  isLoading: false,
  error: null,
};

// Create the store
export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...initialState,

      // Theme
      setTheme: (theme) => set({ theme }),
      setColorScheme: (colorScheme) => set({ colorScheme }),

      // Location
      setLocation: (location) => set({ location, error: null }),
      clearLocation: () => set({ location: null }),
      setUseGeolocation: (useGeolocation) => {
        const { location } = get();
        if (location) {
          set({ location: { ...location, useGeolocation } });
        }
      },

      // Notifications
      setNotificationsEnabled: (enabled) => {
        const { notifications } = get();
        set({ notifications: { ...notifications, enabled } });
      },
      setNotificationTime: (time) => {
        const { notifications } = get();
        set({ notifications: { ...notifications, time } });
      },
      setPushToken: (pushToken) => {
        const { notifications } = get();
        set({ notifications: { ...notifications, pushToken } });
      },

      // Subscription
      setSubscription: (updates) => {
        const { subscription } = get();
        set({ subscription: { ...subscription, ...updates } });
      },

      // Network
      setOnline: (isOnline) => set({ isOnline }),

      // Loading
      setLoading: (isLoading) => set({ isLoading }),

      // Error handling
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: STORAGE_KEYS.SETTINGS_STATE,
      storage: createJSONStorage(() => zustandStorage),
      // Only persist these fields
      partialize: (state) => ({
        theme: state.theme,
        location: state.location,
        notifications: state.notifications,
        subscription: state.subscription,
      }),
    }
  )
);

// Selector hooks for optimized re-renders
export const useTheme = () => useSettingsStore((state) => state.theme);
export const useColorScheme = () => useSettingsStore((state) => state.colorScheme);
export const useLocation = () => useSettingsStore((state) => state.location);
export const useNotifications = () => useSettingsStore((state) => state.notifications);
export const useSubscription = () => useSettingsStore((state) => state.subscription);
export const useIsOnline = () => useSettingsStore((state) => state.isOnline);
export const useSettingsLoading = () => useSettingsStore((state) => state.isLoading);

// Computed selectors
export const useIsSubscribed = () =>
  useSettingsStore((state) => state.subscription.status === 'active');
export const useIsTrial = () => useSettingsStore((state) => state.subscription.status === 'trial');
export const useNotificationsEnabled = () =>
  useSettingsStore((state) => state.notifications.enabled);
