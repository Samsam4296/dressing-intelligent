/**
 * Auth Store Tests
 *
 * Tests for Zustand auth store state management.
 * @priority P1 - Critical authentication state
 */

import { useAuthStore } from '@/stores/auth.store';
import {
  createMockUser,
  createMockSession,
  resetUserFactory,
} from '../support/factories';

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

describe('Auth Store', () => {
  beforeEach(() => {
    resetUserFactory();
    useAuthStore.getState().reset();
  });

  describe('Initial State', () => {
    it('[P1] has correct initial state values', () => {
      // GIVEN: Fresh store
      const state = useAuthStore.getState();

      // THEN: Initial state is correct
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('setSession', () => {
    it('[P1] sets session and user from session', () => {
      // GIVEN: A mock session
      const mockUser = createMockUser();
      const mockSession = createMockSession(mockUser);

      // WHEN: Setting session
      useAuthStore.getState().setSession(mockSession);

      // THEN: Session and user are set, isAuthenticated is true
      const state = useAuthStore.getState();
      expect(state.session).toEqual(mockSession);
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
    });

    it('[P1] clears session when set to null', () => {
      // GIVEN: Existing session
      const mockSession = createMockSession();
      useAuthStore.getState().setSession(mockSession);

      // WHEN: Setting session to null
      useAuthStore.getState().setSession(null);

      // THEN: Session and user are cleared
      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('[P1] clears error when setting valid session', () => {
      // GIVEN: Existing error
      useAuthStore.getState().setError('Previous error');

      // WHEN: Setting valid session
      useAuthStore.getState().setSession(createMockSession());

      // THEN: Error is cleared
      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('setUser', () => {
    it('[P1] sets user and updates isAuthenticated', () => {
      // GIVEN: A mock user
      const mockUser = createMockUser();

      // WHEN: Setting user
      useAuthStore.getState().setUser(mockUser);

      // THEN: User is set and isAuthenticated is true
      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('[P1] clears user when set to null', () => {
      // GIVEN: Existing user
      useAuthStore.getState().setUser(createMockUser());

      // WHEN: Setting user to null
      useAuthStore.getState().setUser(null);

      // THEN: User is cleared and isAuthenticated is false
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('Loading States', () => {
    it('[P1] setLoading updates isLoading', () => {
      // GIVEN: Initial state (isLoading = false)
      expect(useAuthStore.getState().isLoading).toBe(false);

      // WHEN: Setting loading to true
      useAuthStore.getState().setLoading(true);

      // THEN: isLoading is true
      expect(useAuthStore.getState().isLoading).toBe(true);

      // WHEN: Setting loading to false
      useAuthStore.getState().setLoading(false);

      // THEN: isLoading is false
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('[P1] setInitialized updates isInitialized', () => {
      // GIVEN: Initial state (isInitialized = false)
      expect(useAuthStore.getState().isInitialized).toBe(false);

      // WHEN: Setting initialized to true
      useAuthStore.getState().setInitialized(true);

      // THEN: isInitialized is true
      expect(useAuthStore.getState().isInitialized).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('[P1] setError sets error message', () => {
      // GIVEN: No error
      expect(useAuthStore.getState().error).toBeNull();

      // WHEN: Setting error
      useAuthStore.getState().setError('Authentication failed');

      // THEN: Error is set
      expect(useAuthStore.getState().error).toBe('Authentication failed');
    });

    it('[P1] clearError removes error', () => {
      // GIVEN: Existing error
      useAuthStore.getState().setError('Some error');

      // WHEN: Clearing error
      useAuthStore.getState().clearError();

      // THEN: Error is null
      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('signOut', () => {
    it('[P1] clears auth data and keeps isInitialized true', () => {
      // GIVEN: Authenticated state
      useAuthStore.getState().setSession(createMockSession());
      useAuthStore.getState().setInitialized(true);

      // WHEN: Signing out
      useAuthStore.getState().signOut();

      // THEN: Auth data is cleared but isInitialized remains true
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isInitialized).toBe(true);
    });
  });

  describe('reset', () => {
    it('[P1] resets to initial state', () => {
      // GIVEN: Modified state
      useAuthStore.getState().setSession(createMockSession());
      useAuthStore.getState().setLoading(true);
      useAuthStore.getState().setInitialized(true);
      useAuthStore.getState().setError('Error');

      // WHEN: Resetting
      useAuthStore.getState().reset();

      // THEN: All values are reset to initial
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('Selector Hooks', () => {
    it('[P1] selector hooks return correct values', () => {
      // GIVEN: Set state
      const mockUser = createMockUser();
      const mockSession = createMockSession(mockUser);
      useAuthStore.getState().setSession(mockSession);
      useAuthStore.getState().setLoading(true);
      useAuthStore.getState().setError('Test error');

      // THEN: Selector hooks return correct values via getState
      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.session).toEqual(mockSession);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(true);
      expect(state.error).toBe('Test error');
    });
  });
});
