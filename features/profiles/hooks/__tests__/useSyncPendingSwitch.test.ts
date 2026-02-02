/**
 * useSyncPendingSwitch Hook Tests
 * Story 1.7: Switch Entre Profils
 *
 * Tests for the offline sync hook.
 * AC#11: Offline modifications synchronized on reconnection
 */

import { renderHook, act } from '@testing-library/react-native';

// Store callback for network listener
let networkCallback: ((state: { isConnected: boolean }) => void) | null = null;
const mockUnsubscribe = jest.fn();

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: (callback: (state: { isConnected: boolean }) => void) => {
    networkCallback = callback;
    return mockUnsubscribe;
  },
}));

const mockSyncPendingSwitch = jest.fn();

jest.mock('../../services/switchProfileService', () => ({
  switchProfileService: {
    syncPendingSwitch: (...args: any[]) => mockSyncPendingSwitch(...args),
  },
}));

const mockGetPendingSwitch = jest.fn();
const mockClearPendingSwitch = jest.fn();

jest.mock('../useProfiles', () => ({
  getPendingSwitch: () => mockGetPendingSwitch(),
  clearPendingSwitch: () => mockClearPendingSwitch(),
}));

const mockShowToast = jest.fn();

jest.mock('@/shared/components/Toast', () => ({
  showToast: (...args: any[]) => mockShowToast(...args),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import after mocks
import { useSyncPendingSwitch } from '../useSyncPendingSwitch';
import { logger } from '@/lib/logger';

describe('useSyncPendingSwitch', () => {
  const pendingSwitch = {
    profileId: 'profile-456',
    timestamp: Date.now(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    networkCallback = null;
  });

  it('subscribes to network state changes', () => {
    renderHook(() => useSyncPendingSwitch());

    expect(networkCallback).not.toBeNull();
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useSyncPendingSwitch());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  describe('when network is restored', () => {
    it('syncs pending switch when connected and has recent pending switch', async () => {
      mockGetPendingSwitch.mockResolvedValue(pendingSwitch);
      mockSyncPendingSwitch.mockResolvedValue({
        data: { previousProfileId: null, newProfileId: pendingSwitch.profileId },
        error: null,
      });
      mockClearPendingSwitch.mockResolvedValue(undefined);

      renderHook(() => useSyncPendingSwitch());

      // Simulate network connection
      await act(async () => {
        networkCallback?.({ isConnected: true });
      });

      expect(mockGetPendingSwitch).toHaveBeenCalled();
      expect(mockSyncPendingSwitch).toHaveBeenCalledWith(pendingSwitch.profileId);
    });

    it('clears pending switch after successful sync', async () => {
      mockGetPendingSwitch.mockResolvedValue(pendingSwitch);
      mockSyncPendingSwitch.mockResolvedValue({
        data: { previousProfileId: null, newProfileId: pendingSwitch.profileId },
        error: null,
      });
      mockClearPendingSwitch.mockResolvedValue(undefined);

      renderHook(() => useSyncPendingSwitch());

      await act(async () => {
        networkCallback?.({ isConnected: true });
      });

      expect(mockClearPendingSwitch).toHaveBeenCalled();
    });

    it('shows success toast after sync', async () => {
      mockGetPendingSwitch.mockResolvedValue(pendingSwitch);
      mockSyncPendingSwitch.mockResolvedValue({
        data: { previousProfileId: null, newProfileId: pendingSwitch.profileId },
        error: null,
      });
      mockClearPendingSwitch.mockResolvedValue(undefined);

      renderHook(() => useSyncPendingSwitch());

      await act(async () => {
        networkCallback?.({ isConnected: true });
      });

      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'success',
        message: 'Profil synchronisé',
      });
    });

    it('logs sync info', async () => {
      mockGetPendingSwitch.mockResolvedValue(pendingSwitch);
      mockSyncPendingSwitch.mockResolvedValue({
        data: { previousProfileId: null, newProfileId: pendingSwitch.profileId },
        error: null,
      });
      mockClearPendingSwitch.mockResolvedValue(undefined);

      renderHook(() => useSyncPendingSwitch());

      await act(async () => {
        networkCallback?.({ isConnected: true });
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Syncing pending profile switch',
        expect.objectContaining({
          feature: 'profiles',
          action: 'syncPendingSwitch',
        })
      );
    });
  });

  describe('when no pending switch', () => {
    it('does not call sync service when no pending switch', async () => {
      mockGetPendingSwitch.mockResolvedValue(null);

      renderHook(() => useSyncPendingSwitch());

      await act(async () => {
        networkCallback?.({ isConnected: true });
      });

      expect(mockSyncPendingSwitch).not.toHaveBeenCalled();
    });
  });

  describe('stale pending switch', () => {
    it('clears stale pending switch (older than 24 hours)', async () => {
      const stalePendingSwitch = {
        profileId: 'profile-456',
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      };

      mockGetPendingSwitch.mockResolvedValue(stalePendingSwitch);
      mockClearPendingSwitch.mockResolvedValue(undefined);

      renderHook(() => useSyncPendingSwitch());

      await act(async () => {
        networkCallback?.({ isConnected: true });
      });

      expect(mockClearPendingSwitch).toHaveBeenCalled();
      expect(mockSyncPendingSwitch).not.toHaveBeenCalled();
    });

    it('logs when clearing stale switch', async () => {
      const stalePendingSwitch = {
        profileId: 'profile-456',
        timestamp: Date.now() - 25 * 60 * 60 * 1000,
      };

      mockGetPendingSwitch.mockResolvedValue(stalePendingSwitch);
      mockClearPendingSwitch.mockResolvedValue(undefined);

      renderHook(() => useSyncPendingSwitch());

      await act(async () => {
        networkCallback?.({ isConnected: true });
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Cleared stale pending switch',
        expect.objectContaining({
          feature: 'profiles',
          action: 'syncPendingSwitch',
        })
      );
    });
  });

  describe('network not connected', () => {
    it('does not sync when not connected', async () => {
      mockGetPendingSwitch.mockResolvedValue(pendingSwitch);

      renderHook(() => useSyncPendingSwitch());

      await act(async () => {
        networkCallback?.({ isConnected: false });
      });

      expect(mockGetPendingSwitch).not.toHaveBeenCalled();
      expect(mockSyncPendingSwitch).not.toHaveBeenCalled();
    });
  });

  describe('sync error handling', () => {
    it('logs warning when sync fails', async () => {
      mockGetPendingSwitch.mockResolvedValue(pendingSwitch);
      mockSyncPendingSwitch.mockResolvedValue({
        data: null,
        error: { code: 'SYNC_ERROR', message: 'Sync failed' },
      });

      renderHook(() => useSyncPendingSwitch());

      await act(async () => {
        networkCallback?.({ isConnected: true });
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to sync pending switch',
        expect.objectContaining({
          feature: 'profiles',
          action: 'syncPendingSwitch',
        })
      );
    });

    it('does not clear pending switch on sync failure', async () => {
      mockGetPendingSwitch.mockResolvedValue(pendingSwitch);
      mockSyncPendingSwitch.mockResolvedValue({
        data: null,
        error: { code: 'SYNC_ERROR', message: 'Sync failed' },
      });

      renderHook(() => useSyncPendingSwitch());

      await act(async () => {
        networkCallback?.({ isConnected: true });
      });

      expect(mockClearPendingSwitch).not.toHaveBeenCalled();
    });

    it('logs error when exception thrown', async () => {
      mockGetPendingSwitch.mockResolvedValue(pendingSwitch);
      const error = new Error('Network error');
      mockSyncPendingSwitch.mockRejectedValue(error);

      renderHook(() => useSyncPendingSwitch());

      await act(async () => {
        networkCallback?.({ isConnected: true });
      });

      expect(logger.error).toHaveBeenCalledWith(error, {
        feature: 'profiles',
        action: 'syncPendingSwitch',
      });
    });
  });

  describe('duplicate sync prevention', () => {
    it('only syncs once per session', async () => {
      mockGetPendingSwitch.mockResolvedValue(pendingSwitch);
      mockSyncPendingSwitch.mockResolvedValue({
        data: { previousProfileId: null, newProfileId: pendingSwitch.profileId },
        error: null,
      });
      mockClearPendingSwitch.mockResolvedValue(undefined);

      renderHook(() => useSyncPendingSwitch());

      // First connection
      await act(async () => {
        networkCallback?.({ isConnected: true });
      });

      expect(mockSyncPendingSwitch).toHaveBeenCalledTimes(1);

      // Second connection event (e.g., network flicker)
      await act(async () => {
        networkCallback?.({ isConnected: true });
      });

      // Should still be only 1 call due to hasSynced ref
      expect(mockSyncPendingSwitch).toHaveBeenCalledTimes(1);
    });
  });
});
