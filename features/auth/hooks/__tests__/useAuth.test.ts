/**
 * useAuth Hook Tests
 * Story 1.3: Connexion Utilisateur
 *
 * Tests for session persistence and auth state management.
 *
 * AC#2: JWT generated with 1h expiration (handled by Supabase autoRefreshToken)
 * AC#3: Refresh token stored securely in AsyncStorage
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { storage, STORAGE_KEYS, storageHelpers } from '@/lib/storage';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/storage');
jest.mock('@sentry/react-native');
jest.mock('@/shared/components/Toast', () => ({
  showToast: jest.fn(),
}));

describe('useAuth Hook', () => {
  const mockSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Date.now() + 3600000,
  };
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  };

  let mockSubscription: { unsubscribe: jest.Mock };
  let authStateCallback: ((event: string, session: any) => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    authStateCallback = null;
    mockSubscription = { unsubscribe: jest.fn() };

    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
    (storageHelpers.getJSON as jest.Mock).mockReturnValue(null);
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    (supabase.auth.setSession as jest.Mock).mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    });
    (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
      authStateCallback = callback;
      return { data: { subscription: mockSubscription } };
    });
  });

  describe('Initial State', () => {
    it('starts with loading true and no session', async () => {
      const { useAuth } = require('../useAuth');
      const { result } = renderHook(() => useAuth());

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('returns not authenticated when no stored session', async () => {
      const { useAuth } = require('../useAuth');
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });
  });

  describe('Session Restoration (AC#3)', () => {
    it('restores session from MMKV on mount', async () => {
      // Mock stored session in MMKV
      (storageHelpers.getJSON as jest.Mock).mockReturnValue({
        session: mockSession,
        user: mockUser,
      });
      (supabase.auth.setSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      const { useAuth } = require('../useAuth');
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify setSession was called with stored tokens
      expect(supabase.auth.setSession).toHaveBeenCalledWith({
        access_token: mockSession.access_token,
        refresh_token: mockSession.refresh_token,
      });

      // Verify session was restored
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.user).toEqual(mockUser);
    });

    it('clears invalid stored session', async () => {
      // Mock stored session that fails validation
      (storageHelpers.getJSON as jest.Mock).mockReturnValue({
        session: mockSession,
        user: mockUser,
      });
      (supabase.auth.setSession as jest.Mock).mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid session' },
      });

      const { useAuth } = require('../useAuth');
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify storage was cleared
      expect(storage.delete).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_STATE);
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Auth State Changes (AC#2)', () => {
    it('updates state on SIGNED_IN event', async () => {
      const { useAuth } = require('../useAuth');
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate sign in event
      act(() => {
        if (authStateCallback) {
          authStateCallback('SIGNED_IN', mockSession);
        }
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.session).toEqual(mockSession);

      // Verify session persisted to MMKV
      expect(storage.set).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_STATE, expect.any(String));
    });

    it('clears state on SIGNED_OUT event', async () => {
      // Start with a session
      (storageHelpers.getJSON as jest.Mock).mockReturnValue({
        session: mockSession,
        user: mockUser,
      });
      (supabase.auth.setSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      const { useAuth } = require('../useAuth');
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Simulate sign out event
      act(() => {
        if (authStateCallback) {
          authStateCallback('SIGNED_OUT', null);
        }
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.session).toBeNull();
      expect(result.current.user).toBeNull();

      // Verify storage was cleared
      expect(storage.delete).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_STATE);
    });

    it('updates session on TOKEN_REFRESHED event', async () => {
      const { useAuth } = require('../useAuth');
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const refreshedSession = {
        ...mockSession,
        access_token: 'new-access-token',
      };

      // Simulate token refresh event
      act(() => {
        if (authStateCallback) {
          authStateCallback('TOKEN_REFRESHED', refreshedSession);
        }
      });

      expect(result.current.session).toEqual(refreshedSession);

      // Verify updated session persisted
      expect(storage.set).toHaveBeenCalled();
    });
  });

  describe('Supabase Not Configured', () => {
    it('returns not loading when Supabase not configured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);

      const { useAuth } = require('../useAuth');
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('unsubscribes from auth state changes on unmount', async () => {
      const { useAuth } = require('../useAuth');
      const { result, unmount } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      unmount();

      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    });
  });

  // Story 1.14: Session Persistence - 30-day inactivity (NFR-S9)
  describe('30-Day Inactivity (Story 1.14 AC#2)', () => {
    const THIRTY_ONE_DAYS_MS = 31 * 24 * 60 * 60 * 1000;
    const TWENTY_NINE_DAYS_MS = 29 * 24 * 60 * 60 * 1000;

    it('invalidates session after 30+ days of inactivity', async () => {
      // GIVEN: LAST_ACTIVITY is 31 days ago, valid session stored
      const oldActivity = Date.now() - THIRTY_ONE_DAYS_MS;

      // Mock: first call returns LAST_ACTIVITY, second call returns auth state
      (storageHelpers.getJSON as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve(oldActivity)) // LAST_ACTIVITY
        .mockImplementationOnce(() =>
          Promise.resolve({ session: mockSession, user: mockUser })
        ); // AUTH_STATE

      const { useAuth } = require('../useAuth');
      const { result } = renderHook(() => useAuth());

      // WHEN: Hook initializes
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // THEN: Session is cleared, inactivityError is set
      expect(storage.delete).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_STATE);
      expect(storage.delete).toHaveBeenCalledWith(STORAGE_KEYS.LAST_ACTIVITY);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.inactivityError).toBe(
        "Session expirée après 30 jours d'inactivité"
      );
    });

    it('keeps session if activity is less than 30 days ago', async () => {
      // GIVEN: LAST_ACTIVITY is 29 days ago
      const recentActivity = Date.now() - TWENTY_NINE_DAYS_MS;

      (storageHelpers.getJSON as jest.Mock).mockImplementation((key: string) => {
        if (key === STORAGE_KEYS.LAST_ACTIVITY) {
          return Promise.resolve(recentActivity);
        }
        if (key === STORAGE_KEYS.AUTH_STATE) {
          return Promise.resolve({ session: mockSession, user: mockUser });
        }
        return Promise.resolve(null);
      });

      (supabase.auth.setSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      const { useAuth } = require('../useAuth');
      const { result } = renderHook(() => useAuth());

      // WHEN: Hook initializes
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // THEN: Session is restored normally
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.inactivityError).toBeNull();
    });

    it('does not invalidate if no LAST_ACTIVITY stored (first use)', async () => {
      // GIVEN: No LAST_ACTIVITY stored, valid session
      (storageHelpers.getJSON as jest.Mock).mockImplementation((key: string) => {
        if (key === STORAGE_KEYS.LAST_ACTIVITY) {
          return Promise.resolve(null);
        }
        if (key === STORAGE_KEYS.AUTH_STATE) {
          return Promise.resolve({ session: mockSession, user: mockUser });
        }
        return Promise.resolve(null);
      });

      (supabase.auth.setSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      const { useAuth } = require('../useAuth');
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // THEN: Session is restored normally
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.inactivityError).toBeNull();
    });
  });

  // Story 1.14: Corrupted Storage (AC#4)
  describe('Corrupted Storage (Story 1.14 AC#4)', () => {
    it('handles corrupted storage gracefully', async () => {
      // GIVEN: storageHelpers throws an error
      (storageHelpers.getJSON as jest.Mock).mockRejectedValue(
        new Error('Storage corruption')
      );

      const { useAuth } = require('../useAuth');
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // THEN: No crash, storage is cleaned, user redirected to login
      expect(storage.delete).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_STATE);
      expect(storage.delete).toHaveBeenCalledWith(STORAGE_KEYS.LAST_ACTIVITY);
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  // Story 1.14: Network Error / Offline Mode (AC#5)
  describe('Offline Mode (Story 1.14 AC#5)', () => {
    it('uses local session when network error occurs', async () => {
      const { showToast } = require('@/shared/components/Toast');

      // GIVEN: Valid session stored, but network error on setSession
      (storageHelpers.getJSON as jest.Mock).mockImplementation((key: string) => {
        if (key === STORAGE_KEYS.LAST_ACTIVITY) {
          return Promise.resolve(null);
        }
        if (key === STORAGE_KEYS.AUTH_STATE) {
          return Promise.resolve({ session: mockSession, user: mockUser });
        }
        return Promise.resolve(null);
      });

      (supabase.auth.setSession as jest.Mock).mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Network request failed' },
      });

      const { useAuth } = require('../useAuth');
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // THEN: Local session is used, offline toast shown
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.session).toEqual(mockSession);
      expect(showToast).toHaveBeenCalledWith({
        type: 'info',
        message: 'Mode hors-ligne',
      });
    });

    it('does not use expired local session when offline', async () => {
      // GIVEN: Expired session stored, network error on setSession
      const expiredSession = {
        ...mockSession,
        expires_at: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      };

      (storageHelpers.getJSON as jest.Mock).mockImplementation((key: string) => {
        if (key === STORAGE_KEYS.LAST_ACTIVITY) {
          return Promise.resolve(null);
        }
        if (key === STORAGE_KEYS.AUTH_STATE) {
          return Promise.resolve({ session: expiredSession, user: mockUser });
        }
        return Promise.resolve(null);
      });

      (supabase.auth.setSession as jest.Mock).mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Network request failed' },
      });

      const { useAuth } = require('../useAuth');
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // THEN: Expired session is NOT used, user is not authenticated
      expect(result.current.isAuthenticated).toBe(false);
      expect(storage.delete).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_STATE);
    });
  });

  // Story 1.14: Integration behavior documentation
  describe('InactivityError Toast Integration (Story 1.14 AC#2)', () => {
    it('sets inactivityError for _layout.tsx to display Toast', async () => {
      // This test verifies inactivityError is set correctly.
      // The actual Toast display is handled by _layout.tsx useEffect:
      //   useEffect(() => {
      //     if (inactivityError) showToast({ type: 'error', message: inactivityError });
      //   }, [inactivityError]);

      const THIRTY_ONE_DAYS_MS = 31 * 24 * 60 * 60 * 1000;
      const oldActivity = Date.now() - THIRTY_ONE_DAYS_MS;

      (storageHelpers.getJSON as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve(oldActivity)
      );

      const { useAuth } = require('../useAuth');
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // THEN: inactivityError is set for Toast display in _layout.tsx
      expect(result.current.inactivityError).toBe(
        "Session expirée après 30 jours d'inactivité"
      );
      // Note: showToast is called by _layout.tsx, not useAuth
    });
  });
});
