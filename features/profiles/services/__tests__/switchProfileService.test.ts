/**
 * switchProfileService Unit Tests
 * Story 1.7: Switch Entre Profils
 *
 * Tests for the profile switch service.
 * AC#3: Switch executes in less than 1 second
 * AC#14: Errors logged to Sentry
 */

import { switchProfileService } from '../switchProfileService';

// Mock Supabase
const mockRpc = jest.fn();
const mockSelect = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockFrom = jest.fn();
const mockGetUser = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (table: string) => mockFrom(table),
    rpc: (...args: any[]) => mockRpc(...args),
  },
  isSupabaseConfigured: jest.fn(() => true),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  captureError: jest.fn(),
}));

// Chain setup helper
const setupChain = () => {
  mockFrom.mockReturnValue({
    select: mockSelect,
    update: mockUpdate,
  });
  mockSelect.mockReturnValue({
    eq: mockEq,
  });
  mockUpdate.mockReturnValue({
    eq: mockEq,
  });
  mockEq.mockReturnValue({
    eq: mockEq,
    single: mockSingle,
  });
};

describe('switchProfileService', () => {
  const mockUser = { id: 'user-123' };
  const mockNewProfileId = 'profile-456';
  const mockCurrentProfileId = 'profile-123';

  beforeEach(() => {
    jest.clearAllMocks();
    setupChain();
  });

  describe('switchProfile', () => {
    describe('when supabase is not configured', () => {
      it('returns CONFIG_ERROR', async () => {
        const { isSupabaseConfigured } = require('@/lib/supabase');
        isSupabaseConfigured.mockReturnValue(false);

        const result = await switchProfileService.switchProfile(mockNewProfileId);

        expect(result.error?.code).toBe('CONFIG_ERROR');
        expect(result.data).toBeNull();

        // Restore mock
        isSupabaseConfigured.mockReturnValue(true);
      });
    });

    describe('when user is not authenticated', () => {
      it('returns AUTH_ERROR when getUser fails', async () => {
        mockGetUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        });

        const result = await switchProfileService.switchProfile(mockNewProfileId);

        expect(result.error?.code).toBe('AUTH_ERROR');
        expect(result.error?.message).toBe('Utilisateur non authentifié');
      });

      it('returns AUTH_ERROR when user is null', async () => {
        mockGetUser.mockResolvedValue({
          data: { user: null },
          error: null,
        });

        const result = await switchProfileService.switchProfile(mockNewProfileId);

        expect(result.error?.code).toBe('AUTH_ERROR');
      });
    });

    describe('when RPC succeeds', () => {
      beforeEach(() => {
        mockGetUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        // Mock current profile fetch
        mockSingle.mockResolvedValue({
          data: { id: mockCurrentProfileId },
          error: null,
        });

        // Mock RPC success
        mockRpc.mockResolvedValue({
          data: { success: true },
          error: null,
        });
      });

      it('returns success with previous and new profile IDs', async () => {
        const result = await switchProfileService.switchProfile(mockNewProfileId);

        expect(result.error).toBeNull();
        expect(result.data).toEqual({
          previousProfileId: mockCurrentProfileId,
          newProfileId: mockNewProfileId,
        });
      });

      it('calls RPC with correct parameters', async () => {
        await switchProfileService.switchProfile(mockNewProfileId);

        expect(mockRpc).toHaveBeenCalledWith('switch_active_profile', {
          p_user_id: mockUser.id,
          p_new_profile_id: mockNewProfileId,
        });
      });

      it('logs success info', async () => {
        const { logger } = require('@/lib/logger');
        await switchProfileService.switchProfile(mockNewProfileId);

        expect(logger.info).toHaveBeenCalledWith(
          'Profile switched successfully',
          expect.objectContaining({
            feature: 'profiles',
            action: 'switchProfile',
          })
        );
      });
    });

    describe('when RPC function does not exist', () => {
      beforeEach(() => {
        mockGetUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        mockSingle.mockResolvedValue({
          data: { id: mockCurrentProfileId },
          error: null,
        });

        // RPC returns function not found error
        mockRpc.mockResolvedValue({
          data: null,
          error: { code: '42883', message: 'function switch_active_profile does not exist' },
        });
      });

      it('falls back to direct UPDATE when RPC not found', async () => {
        // Setup fallback update to succeed
        const mockUpdateEq = jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        });
        mockUpdate.mockReturnValue({ eq: mockUpdateEq });

        const result = await switchProfileService.switchProfile(mockNewProfileId);

        expect(result.error).toBeNull();
        expect(result.data?.newProfileId).toBe(mockNewProfileId);
      });

      it('logs fallback usage', async () => {
        const { logger } = require('@/lib/logger');
        const mockUpdateEq = jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        });
        mockUpdate.mockReturnValue({ eq: mockUpdateEq });

        await switchProfileService.switchProfile(mockNewProfileId);

        expect(logger.info).toHaveBeenCalledWith(
          'RPC switch_active_profile not found, using fallback',
          expect.objectContaining({
            feature: 'profiles',
            action: 'switchProfile',
          })
        );
      });
    });

    describe('error handling', () => {
      beforeEach(() => {
        mockGetUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        mockSingle.mockResolvedValue({
          data: { id: mockCurrentProfileId },
          error: null,
        });
      });

      it('returns PROFILE_NOT_FOUND for not found errors', async () => {
        mockRpc.mockResolvedValue({
          data: null,
          error: { message: 'Profile not found' },
        });

        const result = await switchProfileService.switchProfile(mockNewProfileId);

        expect(result.error?.code).toBe('PROFILE_NOT_FOUND');
        expect(result.error?.message).toBe('Profil introuvable ou non autorisé');
      });

      it('returns NETWORK_ERROR for network errors', async () => {
        mockRpc.mockRejectedValue(new Error('Network request failed'));

        const result = await switchProfileService.switchProfile(mockNewProfileId);

        expect(result.error?.code).toBe('NETWORK_ERROR');
      });

      it('returns SWITCH_ERROR for generic errors', async () => {
        mockRpc.mockResolvedValue({
          data: null,
          error: { message: 'Unknown database error' },
        });

        const result = await switchProfileService.switchProfile(mockNewProfileId);

        expect(result.error?.code).toBe('SWITCH_ERROR');
      });

      it('logs errors to Sentry via captureError', async () => {
        const { captureError } = require('@/lib/logger');
        const error = new Error('Test error');
        mockRpc.mockRejectedValue(error);

        await switchProfileService.switchProfile(mockNewProfileId);

        expect(captureError).toHaveBeenCalledWith(error, 'profiles', 'switchProfile', {
          newProfileId: mockNewProfileId,
        });
      });
    });

    describe('when no current active profile', () => {
      it('returns null as previousProfileId', async () => {
        mockGetUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        mockSingle.mockResolvedValue({
          data: null,
          error: null,
        });

        mockRpc.mockResolvedValue({
          data: { success: true },
          error: null,
        });

        const result = await switchProfileService.switchProfile(mockNewProfileId);

        expect(result.data?.previousProfileId).toBeNull();
      });
    });
  });

  describe('syncPendingSwitch', () => {
    it('calls switchProfile with the provided profile ID', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockSingle.mockResolvedValue({
        data: { id: mockCurrentProfileId },
        error: null,
      });
      mockRpc.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      await switchProfileService.syncPendingSwitch(mockNewProfileId);

      expect(mockRpc).toHaveBeenCalledWith('switch_active_profile', {
        p_user_id: mockUser.id,
        p_new_profile_id: mockNewProfileId,
      });
    });

    it('logs sync info', async () => {
      const { logger } = require('@/lib/logger');
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockSingle.mockResolvedValue({
        data: null,
        error: null,
      });
      mockRpc.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      await switchProfileService.syncPendingSwitch(mockNewProfileId);

      expect(logger.info).toHaveBeenCalledWith(
        'Syncing pending profile switch',
        expect.objectContaining({
          feature: 'profiles',
          action: 'syncPendingSwitch',
        })
      );
    });
  });
});
