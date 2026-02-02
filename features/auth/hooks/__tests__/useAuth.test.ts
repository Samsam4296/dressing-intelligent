/**
 * useAuth Hook Tests
 * Story 1.3: Connexion Utilisateur
 *
 * Tests for session persistence and auth state management.
 *
 * AC#2: JWT generated with 1h expiration (handled by Supabase autoRefreshToken)
 * AC#3: Refresh token stored securely in MMKV (AES-256)
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { storage, STORAGE_KEYS, storageHelpers } from '@/lib/storage';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/storage');
jest.mock('@sentry/react-native');

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
});
