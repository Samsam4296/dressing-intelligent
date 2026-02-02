/**
 * Stores - Centralized State Management
 *
 * All Zustand stores with MMKV persistence for the Dressing Intelligent app.
 *
 * NOTE: Profile store is now managed in features/profiles/stores/useProfileStore.ts
 * Import it from '@/features/profiles' for profile-related state.
 */

// Import stores for internal use
import { useAuthStore } from './auth.store';
import { useSettingsStore } from './settings.store';

// Import profile store from features (Story 1.5 consolidation)
import { useProfileStore } from '@/features/profiles';

// Auth store
export {
  useAuthStore,
  useUser,
  useSession,
  useIsAuthenticated,
  useAuthLoading,
  useAuthError,
  type AuthState,
  type AuthActions,
  type AuthStore,
} from './auth.store';

// Profile store - re-exported from features/profiles (Story 1.5)
// For full profile data, use TanStack Query hooks from '@/features/profiles'
export { useProfileStore };

// Settings store
export {
  useSettingsStore,
  useTheme,
  useColorScheme,
  useLocation,
  useNotifications,
  useSubscription,
  useIsOnline,
  useSettingsLoading,
  useIsSubscribed,
  useIsTrial,
  useNotificationsEnabled,
  type SettingsState,
  type SettingsActions,
  type SettingsStore,
  type LocationData,
  type NotificationSettings,
  type SubscriptionData,
} from './settings.store';

// Reset all stores (for logout)
export const resetAllStores = () => {
  const { reset: resetAuth } = useAuthStore.getState();
  const { reset: resetProfile } = useProfileStore.getState();
  const { reset: resetSettings } = useSettingsStore.getState();

  resetAuth();
  resetProfile();
  resetSettings();
};
