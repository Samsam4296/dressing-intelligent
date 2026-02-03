/**
 * useDeleteAccount Hook Tests
 * Story 1.10: Suppression de Compte
 *
 * Tests for the useDeleteAccount hook:
 * - AC#1: Re-authentication with password
 * - AC#2: Edge Function call for deletion
 * - AC#3: Clear local state, sign out, redirect
 * - AC#4: Wrong password error handling
 *
 * Consolidated tests (per CLAUDE.md guidelines):
 * 1. Happy path flow (re-auth → delete → clear → redirect)
 * 2. Error handling (wrong password, network error)
 * 3. Loading state management
 */

import { renderHook, act } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { useDeleteAccount } from '../hooks/useDeleteAccount';
import { showToast } from '@/shared/components/Toast';

// ============================================
// Mocks
// ============================================

const mockRouterReplace = jest.fn();

jest.mock('expo-haptics');
jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}));
jest.mock('@/shared/components/Toast', () => ({
  showToast: jest.fn(),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockRouterReplace,
  }),
}));
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    clear: jest.fn(),
  }),
}));
jest.mock('@/lib/storage', () => ({
  storage: {
    clearAll: jest.fn(),
  },
  storageHelpers: {
    clearAll: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock Supabase
const mockSignInWithPassword = jest.fn();
const mockGetSession = jest.fn();
const mockSignOut = jest.fn();
const mockFunctionsInvoke = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      getSession: () => mockGetSession(),
      signOut: () => mockSignOut(),
    },
    functions: {
      invoke: (...args: unknown[]) => mockFunctionsInvoke(...args),
    },
  },
  isSupabaseConfigured: () => true,
}));

// ============================================
// Test Data
// ============================================

const mockUserEmail = 'test@example.com';
const mockPassword = 'correct-password';

// ============================================
// Tests
// ============================================

describe('useDeleteAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouterReplace.mockClear();
  });

  describe('Happy path flow (AC#1, AC#2, AC#3)', () => {
    it('completes delete account flow: re-auth → edge function → clear → redirect', async () => {
      // Setup: successful re-auth
      mockSignInWithPassword.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null,
      });

      // Setup: successful session retrieval
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      // Setup: successful Edge Function call
      mockFunctionsInvoke.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      // Setup: successful sign out
      mockSignOut.mockResolvedValue({ error: null });

      const onClose = jest.fn();

      const { result } = renderHook(() =>
        useDeleteAccount({
          userEmail: mockUserEmail,
          onClose,
        })
      );

      // Set password
      act(() => {
        result.current.setPassword(mockPassword);
      });

      // Execute deletion
      await act(async () => {
        await result.current.handleDelete();
      });

      // Verify re-authentication (AC#1)
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: mockUserEmail,
        password: mockPassword,
      });

      // Verify Edge Function called (AC#2)
      expect(mockFunctionsInvoke).toHaveBeenCalledWith('delete-account', expect.any(Object));

      // Verify success feedback
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      );
      expect(showToast).toHaveBeenCalledWith({
        type: 'success',
        message: expect.any(String),
      });

      // Verify redirect to welcome (AC#3)
      expect(mockRouterReplace).toHaveBeenCalledWith('/(auth)/welcome');
    });
  });

  describe('Error handling (AC#4)', () => {
    it('handles wrong password with error message', async () => {
      // Setup: re-auth failure
      mockSignInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' },
      });

      const onClose = jest.fn();

      const { result } = renderHook(() =>
        useDeleteAccount({
          userEmail: mockUserEmail,
          onClose,
        })
      );

      // Set password
      act(() => {
        result.current.setPassword('wrong-password');
      });

      // Try to delete
      await act(async () => {
        await result.current.handleDelete();
      });

      // Verify Edge Function NOT called
      expect(mockFunctionsInvoke).not.toHaveBeenCalled();

      // Verify error state (AC#4)
      expect(result.current.error).toBe('Mot de passe incorrect');

      // Verify error haptic
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Error
      );

      // Verify NO redirect
      expect(mockRouterReplace).not.toHaveBeenCalled();
    });

    it('handles network error gracefully', async () => {
      // Setup: re-auth success
      mockSignInWithPassword.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null,
      });

      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      // Setup: Edge Function network failure
      mockFunctionsInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Network error - fetch failed' },
      });

      const onClose = jest.fn();

      const { result } = renderHook(() =>
        useDeleteAccount({
          userEmail: mockUserEmail,
          onClose,
        })
      );

      act(() => {
        result.current.setPassword(mockPassword);
      });

      await act(async () => {
        await result.current.handleDelete();
      });

      // Verify error displayed
      expect(result.current.error).toContain('connexion');

      // Verify NO redirect on error
      expect(mockRouterReplace).not.toHaveBeenCalled();
    });

    it('blocks deletion with empty password', async () => {
      const onClose = jest.fn();

      const { result } = renderHook(() =>
        useDeleteAccount({
          userEmail: mockUserEmail,
          onClose,
        })
      );

      // Empty password (default)
      await act(async () => {
        await result.current.handleDelete();
      });

      // Service NOT called
      expect(mockSignInWithPassword).not.toHaveBeenCalled();

      // Error message shown
      expect(result.current.error).toBe('Veuillez entrer votre mot de passe');
    });
  });

  describe('Loading state management', () => {
    it('manages isPending state correctly during deletion', async () => {
      // Setup: slow response
      mockSignInWithPassword.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: { session: { access_token: 'test-token' } },
                  error: null,
                }),
              50
            )
          )
      );

      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      mockFunctionsInvoke.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      mockSignOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() =>
        useDeleteAccount({
          userEmail: mockUserEmail,
          onClose: jest.fn(),
        })
      );

      // Initially not pending
      expect(result.current.isPending).toBe(false);

      act(() => {
        result.current.setPassword(mockPassword);
      });

      // Start deletion
      let deletePromise: Promise<void>;
      act(() => {
        deletePromise = result.current.handleDelete();
      });

      // Should be pending
      expect(result.current.isPending).toBe(true);

      // Wait for completion
      await act(async () => {
        await deletePromise;
      });

      // Should no longer be pending
      expect(result.current.isPending).toBe(false);
    });

    it('resets state and closes modal', () => {
      const onClose = jest.fn();

      const { result } = renderHook(() =>
        useDeleteAccount({
          userEmail: mockUserEmail,
          onClose,
        })
      );

      // Set some state
      act(() => {
        result.current.setPassword('some-password');
      });

      // Reset and close
      act(() => {
        result.current.resetAndClose();
      });

      // Password cleared
      expect(result.current.password).toBe('');
      // onClose called
      expect(onClose).toHaveBeenCalled();
    });
  });
});
