/**
 * Stores - Centralized State Management
 *
 * All Zustand stores with MMKV persistence for the Dressing Intelligent app.
 */

// Import stores for internal use
import { useAuthStore } from './auth.store';
import { useProfileStore } from './profile.store';
import { useSettingsStore } from './settings.store';

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

// Profile store
export {
  useProfileStore,
  useProfiles,
  useActiveProfile,
  useActiveProfileId,
  useProfileLoading,
  useProfileSwitching,
  useCanAddProfile,
  MAX_PROFILES,
  type ProfileState,
  type ProfileActions,
  type ProfileStore,
} from './profile.store';

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
