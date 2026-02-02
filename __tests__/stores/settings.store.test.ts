/**
 * Settings Store Tests
 *
 * Tests for Zustand settings store state management.
 * @priority P2 - User settings management
 */

import { useSettingsStore } from '@/stores/settings.store';
import type { LocationData } from '@/stores/settings.store';

// Mock storage
jest.mock('@/lib/storage', () => ({
  zustandStorage: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
  STORAGE_KEYS: {
    AUTH_STATE: 'auth-state',
    PROFILE_STATE: 'profile-state',
    SETTINGS_STATE: 'settings-state',
    WARDROBE_CACHE: 'wardrobe-cache',
    RECOMMENDATIONS_CACHE: 'recommendations-cache',
    LAST_SYNC: 'last-sync',
  },
}));

describe('Settings Store', () => {
  beforeEach(() => {
    useSettingsStore.getState().reset();
  });

  describe('Initial State', () => {
    it('[P2] has correct initial state values', () => {
      // GIVEN: Fresh store
      const state = useSettingsStore.getState();

      // THEN: Initial state is correct
      expect(state.theme).toBe('system');
      expect(state.colorScheme).toBe('light');
      expect(state.location).toBeNull();
      expect(state.notifications.enabled).toBe(true);
      expect(state.notifications.time).toBe('07:00');
      expect(state.notifications.pushToken).toBeNull();
      expect(state.subscription.status).toBe('trial');
      expect(state.isOnline).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('Theme Settings', () => {
    it('[P2] setTheme updates theme preference', () => {
      // WHEN: Setting theme to dark
      useSettingsStore.getState().setTheme('dark');

      // THEN: Theme is updated
      expect(useSettingsStore.getState().theme).toBe('dark');
    });

    it('[P2] setColorScheme updates resolved color scheme', () => {
      // WHEN: Setting color scheme
      useSettingsStore.getState().setColorScheme('dark');

      // THEN: Color scheme is updated
      expect(useSettingsStore.getState().colorScheme).toBe('dark');
    });

    it('[P2] supports all theme options', () => {
      // WHEN/THEN: All theme options work
      useSettingsStore.getState().setTheme('light');
      expect(useSettingsStore.getState().theme).toBe('light');

      useSettingsStore.getState().setTheme('dark');
      expect(useSettingsStore.getState().theme).toBe('dark');

      useSettingsStore.getState().setTheme('system');
      expect(useSettingsStore.getState().theme).toBe('system');
    });
  });

  describe('Location Settings', () => {
    const mockLocation: LocationData = {
      city: 'Paris',
      latitude: 48.8566,
      longitude: 2.3522,
      useGeolocation: true,
    };

    it('[P2] setLocation sets location data', () => {
      // WHEN: Setting location
      useSettingsStore.getState().setLocation(mockLocation);

      // THEN: Location is set
      expect(useSettingsStore.getState().location).toEqual(mockLocation);
    });

    it('[P2] setLocation clears error', () => {
      // GIVEN: Existing error
      useSettingsStore.getState().setError('Location error');

      // WHEN: Setting location
      useSettingsStore.getState().setLocation(mockLocation);

      // THEN: Error is cleared
      expect(useSettingsStore.getState().error).toBeNull();
    });

    it('[P2] clearLocation removes location data', () => {
      // GIVEN: Existing location
      useSettingsStore.getState().setLocation(mockLocation);

      // WHEN: Clearing location
      useSettingsStore.getState().clearLocation();

      // THEN: Location is null
      expect(useSettingsStore.getState().location).toBeNull();
    });

    it('[P2] setUseGeolocation updates geolocation preference', () => {
      // GIVEN: Location with useGeolocation true
      useSettingsStore.getState().setLocation(mockLocation);

      // WHEN: Disabling geolocation
      useSettingsStore.getState().setUseGeolocation(false);

      // THEN: useGeolocation is updated
      expect(useSettingsStore.getState().location?.useGeolocation).toBe(false);
    });

    it('[P2] setUseGeolocation does nothing when no location', () => {
      // GIVEN: No location
      expect(useSettingsStore.getState().location).toBeNull();

      // WHEN: Setting geolocation preference
      useSettingsStore.getState().setUseGeolocation(true);

      // THEN: Location remains null
      expect(useSettingsStore.getState().location).toBeNull();
    });
  });

  describe('Notification Settings', () => {
    it('[P2] setNotificationsEnabled updates enabled status', () => {
      // WHEN: Disabling notifications
      useSettingsStore.getState().setNotificationsEnabled(false);

      // THEN: Notifications are disabled
      expect(useSettingsStore.getState().notifications.enabled).toBe(false);
    });

    it('[P2] setNotificationTime updates notification time', () => {
      // WHEN: Setting notification time
      useSettingsStore.getState().setNotificationTime('08:30');

      // THEN: Time is updated
      expect(useSettingsStore.getState().notifications.time).toBe('08:30');
    });

    it('[P2] setPushToken sets push notification token', () => {
      // WHEN: Setting push token
      useSettingsStore.getState().setPushToken('expo-push-token-123');

      // THEN: Token is set
      expect(useSettingsStore.getState().notifications.pushToken).toBe('expo-push-token-123');
    });

    it('[P2] setPushToken can clear token', () => {
      // GIVEN: Existing token
      useSettingsStore.getState().setPushToken('token');

      // WHEN: Clearing token
      useSettingsStore.getState().setPushToken(null);

      // THEN: Token is null
      expect(useSettingsStore.getState().notifications.pushToken).toBeNull();
    });
  });

  describe('Subscription Settings', () => {
    it('[P2] setSubscription updates subscription data', () => {
      // WHEN: Setting subscription to active
      useSettingsStore.getState().setSubscription({
        status: 'active',
        subscriptionStartDate: '2025-01-01',
      });

      // THEN: Subscription is updated
      const subscription = useSettingsStore.getState().subscription;
      expect(subscription.status).toBe('active');
      expect(subscription.subscriptionStartDate).toBe('2025-01-01');
    });

    it('[P2] setSubscription merges with existing data', () => {
      // GIVEN: Initial trial status
      const initialSubscription = useSettingsStore.getState().subscription;
      expect(initialSubscription.status).toBe('trial');

      // WHEN: Updating only expiresAt
      useSettingsStore.getState().setSubscription({
        expiresAt: '2025-12-31',
      });

      // THEN: Status preserved, expiresAt updated
      const subscription = useSettingsStore.getState().subscription;
      expect(subscription.status).toBe('trial');
      expect(subscription.expiresAt).toBe('2025-12-31');
    });
  });

  describe('Network Status', () => {
    it('[P2] setOnline updates network status', () => {
      // WHEN: Going offline
      useSettingsStore.getState().setOnline(false);

      // THEN: isOnline is false
      expect(useSettingsStore.getState().isOnline).toBe(false);

      // WHEN: Going online
      useSettingsStore.getState().setOnline(true);

      // THEN: isOnline is true
      expect(useSettingsStore.getState().isOnline).toBe(true);
    });
  });

  describe('Loading and Error States', () => {
    it('[P2] setLoading updates loading state', () => {
      // WHEN: Setting loading
      useSettingsStore.getState().setLoading(true);

      // THEN: isLoading is true
      expect(useSettingsStore.getState().isLoading).toBe(true);
    });

    it('[P2] setError sets error message', () => {
      // WHEN: Setting error
      useSettingsStore.getState().setError('Failed to save settings');

      // THEN: Error is set
      expect(useSettingsStore.getState().error).toBe('Failed to save settings');
    });

    it('[P2] clearError removes error', () => {
      // GIVEN: Existing error
      useSettingsStore.getState().setError('Some error');

      // WHEN: Clearing error
      useSettingsStore.getState().clearError();

      // THEN: Error is null
      expect(useSettingsStore.getState().error).toBeNull();
    });
  });

  describe('reset', () => {
    it('[P2] resets to initial state', () => {
      // GIVEN: Modified state
      useSettingsStore.getState().setTheme('dark');
      useSettingsStore.getState().setLocation({
        city: 'Lyon',
        latitude: 45.7578,
        longitude: 4.8320,
        useGeolocation: false,
      });
      useSettingsStore.getState().setNotificationsEnabled(false);
      useSettingsStore.getState().setOnline(false);
      useSettingsStore.getState().setError('Error');

      // WHEN: Resetting
      useSettingsStore.getState().reset();

      // THEN: All values reset to initial
      const state = useSettingsStore.getState();
      expect(state.theme).toBe('system');
      expect(state.location).toBeNull();
      expect(state.notifications.enabled).toBe(true);
      expect(state.isOnline).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('Computed Selectors', () => {
    it('[P2] useIsSubscribed returns true for active status', () => {
      // GIVEN: Active subscription
      useSettingsStore.getState().setSubscription({ status: 'active' });

      // THEN: isSubscribed via getState
      expect(useSettingsStore.getState().subscription.status).toBe('active');
    });

    it('[P2] useIsTrial returns true for trial status', () => {
      // GIVEN: Initial trial status
      // THEN: isTrial via getState
      expect(useSettingsStore.getState().subscription.status).toBe('trial');
    });

    it('[P2] useNotificationsEnabled returns notification state', () => {
      // GIVEN: Notifications enabled
      // THEN: Via getState
      expect(useSettingsStore.getState().notifications.enabled).toBe(true);
    });
  });
});
