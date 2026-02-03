/**
 * useSwitchProfile Hook Tests
 * Story 1.7: Switch Entre Profils
 *
 * Tests for the profile switch mutation hook.
 * AC#3: Switch < 1 second via optimistic updates
 * AC#5: UI reflects immediately via Zustand
 * AC#7: Haptic feedback
 * AC#9: Works offline
 * AC#12: Error keeps previous profile active
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock modules before importing hook
const mockImpactAsync = jest.fn();
const mockNotificationAsync = jest.fn();

jest.mock('expo-haptics', () => ({
  impactAsync: (...args: any[]) => mockImpactAsync(...args),
  notificationAsync: (...args: any[]) => mockNotificationAsync(...args),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Error: 'error',
    Warning: 'warning',
  },
}));

const mockNetInfoFetch = jest.fn();

jest.mock('@react-native-community/netinfo', () => ({
  fetch: () => mockNetInfoFetch(),
  addEventListener: jest.fn(() => jest.fn()),
}));

const mockShowToast = jest.fn();

jest.mock('@/shared/components/Toast', () => ({
  showToast: (...args: any[]) => mockShowToast(...args),
}));

jest.mock('@/lib/storage', () => ({
  storageHelpers: {
    setJSON: jest.fn().mockResolvedValue(undefined),
    getJSON: jest.fn().mockResolvedValue(null),
  },
  zustandStorage: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockSwitchProfile = jest.fn();

jest.mock('../../services/switchProfileService', () => ({
  switchProfileService: {
    switchProfile: (...args: any[]) => mockSwitchProfile(...args),
  },
}));

const mockSetCurrentProfile = jest.fn();
const mockCurrentProfileId = 'profile-123';

jest.mock('../../stores/useProfileStore', () => ({
  useProfileStore: Object.assign(
    jest.fn((selector) => {
      if (typeof selector === 'function') {
        return selector({
          currentProfileId: mockCurrentProfileId,
          setCurrentProfile: mockSetCurrentProfile,
        });
      }
      return {
        currentProfileId: mockCurrentProfileId,
        setCurrentProfile: mockSetCurrentProfile,
      };
    }),
    {
      getState: () => ({
        currentProfileId: mockCurrentProfileId,
        setCurrentProfile: mockSetCurrentProfile,
      }),
    }
  ),
}));

// Import after mocks
import { useSwitchProfile } from '../useProfiles';

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useSwitchProfile', () => {
  const newProfileId = 'profile-456';

  beforeEach(() => {
    jest.clearAllMocks();
    mockNetInfoFetch.mockResolvedValue({ isConnected: true });
  });

  describe('online switch', () => {
    it('calls switchProfileService when online', async () => {
      mockSwitchProfile.mockResolvedValue({
        data: {
          previousProfileId: mockCurrentProfileId,
          newProfileId,
        },
        error: null,
      });

      const { result } = renderHook(() => useSwitchProfile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(newProfileId);
      });

      await waitFor(() => {
        expect(mockSwitchProfile).toHaveBeenCalledWith(newProfileId);
      });
    });

    it('triggers success haptic feedback on success', async () => {
      mockSwitchProfile.mockResolvedValue({
        data: {
          previousProfileId: mockCurrentProfileId,
          newProfileId,
        },
        error: null,
      });

      const { result } = renderHook(() => useSwitchProfile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(newProfileId);
      });

      await waitFor(() => {
        expect(mockNotificationAsync).toHaveBeenCalledWith('success');
      });
    });

    it('performs optimistic update immediately', async () => {
      mockSwitchProfile.mockResolvedValue({
        data: {
          previousProfileId: mockCurrentProfileId,
          newProfileId,
        },
        error: null,
      });

      const { result } = renderHook(() => useSwitchProfile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(newProfileId);
      });

      // Optimistic update should be called immediately
      expect(mockSetCurrentProfile).toHaveBeenCalledWith(newProfileId);
    });
  });

  describe('offline switch', () => {
    beforeEach(() => {
      mockNetInfoFetch.mockResolvedValue({ isConnected: false });
    });

    it('stores pending switch when offline', async () => {
      const { storageHelpers } = require('@/lib/storage');

      const { result } = renderHook(() => useSwitchProfile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(newProfileId);
      });

      await waitFor(() => {
        expect(storageHelpers.setJSON).toHaveBeenCalledWith(
          'pending_profile_switch',
          expect.objectContaining({
            profileId: newProfileId,
            timestamp: expect.any(Number),
          })
        );
      });
    });

    it('shows offline info toast', async () => {
      const { result } = renderHook(() => useSwitchProfile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(newProfileId);
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'info',
            message: 'Mode hors ligne - données locales',
          })
        );
      });
    });

    it('triggers light haptic for offline switch', async () => {
      const { result } = renderHook(() => useSwitchProfile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(newProfileId);
      });

      await waitFor(() => {
        expect(mockImpactAsync).toHaveBeenCalledWith('light');
      });
    });

    it('does not call switchProfileService when offline', async () => {
      const { result } = renderHook(() => useSwitchProfile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(newProfileId);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSwitchProfile).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      mockNetInfoFetch.mockResolvedValue({ isConnected: true });
    });

    it('rolls back optimistic update on error', async () => {
      mockSwitchProfile.mockResolvedValue({
        data: null,
        error: { code: 'SWITCH_ERROR', message: 'Failed to switch' },
      });

      const { result } = renderHook(() => useSwitchProfile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(newProfileId);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should have been called twice: once for optimistic, once for rollback
      expect(mockSetCurrentProfile).toHaveBeenCalledWith(newProfileId); // optimistic
      expect(mockSetCurrentProfile).toHaveBeenCalledWith(mockCurrentProfileId); // rollback
    });

    it('shows error toast on failure', async () => {
      mockSwitchProfile.mockResolvedValue({
        data: null,
        error: { code: 'SWITCH_ERROR', message: 'Failed to switch' },
      });

      const { result } = renderHook(() => useSwitchProfile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(newProfileId);
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
          })
        );
      });
    });

    it('triggers error haptic feedback on failure', async () => {
      mockSwitchProfile.mockResolvedValue({
        data: null,
        error: { code: 'SWITCH_ERROR', message: 'Failed' },
      });

      const { result } = renderHook(() => useSwitchProfile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(newProfileId);
      });

      await waitFor(() => {
        expect(mockNotificationAsync).toHaveBeenCalledWith('error');
      });
    });
  });

  describe('isPending state', () => {
    it('is true while mutation is in progress', async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockSwitchProfile.mockReturnValue(pendingPromise);

      const { result } = renderHook(() => useSwitchProfile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(newProfileId);
        // Allow React to process the mutation start
        await Promise.resolve();
      });

      // Check isPending becomes true while mutation is pending
      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      await act(async () => {
        resolvePromise!({
          data: { previousProfileId: mockCurrentProfileId, newProfileId },
          error: null,
        });
      });

      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });
    });
  });
});
