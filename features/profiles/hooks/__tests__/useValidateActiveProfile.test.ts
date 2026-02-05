/**
 * useValidateActiveProfile Hook Tests
 * Story 1.7: Switch Entre Profils
 *
 * Tests for the active profile validation hook.
 * AC#18: If active profile is deleted, first remaining profile becomes active automatically
 */

import { renderHook, waitFor } from '@testing-library/react-native';

// Mock modules before importing hook
const mockSwitchProfile = jest.fn();

jest.mock('../useProfiles', () => ({
  useProfiles: jest.fn(),
  useSwitchProfile: () => ({
    mutate: mockSwitchProfile,
  }),
}));

const mockCurrentProfileId = jest.fn();

jest.mock('../../stores/useProfileStore', () => ({
  useCurrentProfileId: () => mockCurrentProfileId(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Story 1.14 AC#3: Mock Toast for profile deleted notification
jest.mock('@/shared/components/Toast', () => ({
  showToast: jest.fn(),
}));

// Import after mocks
import { useValidateActiveProfile } from '../useValidateActiveProfile';
import { useProfiles } from '../useProfiles';
import { logger } from '@/lib/logger';
import { showToast } from '@/shared/components/Toast';

describe('useValidateActiveProfile', () => {
  const mockProfiles = [
    { id: 'profile-1', display_name: 'Emma', is_active: true },
    { id: 'profile-2', display_name: 'Lucas', is_active: false },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when profiles are loading', () => {
    it('does nothing while loading', () => {
      (useProfiles as jest.Mock).mockReturnValue({
        data: undefined,
        isSuccess: false,
        isLoading: true,
      });
      mockCurrentProfileId.mockReturnValue('profile-1');

      renderHook(() => useValidateActiveProfile());

      expect(mockSwitchProfile).not.toHaveBeenCalled();
    });
  });

  describe('when no profiles exist', () => {
    it('does nothing when profile list is empty', () => {
      (useProfiles as jest.Mock).mockReturnValue({
        data: [],
        isSuccess: true,
        isLoading: false,
      });
      mockCurrentProfileId.mockReturnValue('profile-1');

      renderHook(() => useValidateActiveProfile());

      expect(mockSwitchProfile).not.toHaveBeenCalled();
    });
  });

  describe('when active profile exists', () => {
    it('does not switch when current profile is in the list', () => {
      (useProfiles as jest.Mock).mockReturnValue({
        data: mockProfiles,
        isSuccess: true,
        isLoading: false,
      });
      mockCurrentProfileId.mockReturnValue('profile-1');

      renderHook(() => useValidateActiveProfile());

      expect(mockSwitchProfile).not.toHaveBeenCalled();
    });
  });

  describe('when active profile is deleted (AC#18)', () => {
    it('switches to first available profile', async () => {
      (useProfiles as jest.Mock).mockReturnValue({
        data: mockProfiles,
        isSuccess: true,
        isLoading: false,
      });
      mockCurrentProfileId.mockReturnValue('deleted-profile-id');

      renderHook(() => useValidateActiveProfile());

      await waitFor(() => {
        expect(mockSwitchProfile).toHaveBeenCalledWith('profile-1');
      });
    });

    it('logs warning when auto-switching', async () => {
      (useProfiles as jest.Mock).mockReturnValue({
        data: mockProfiles,
        isSuccess: true,
        isLoading: false,
      });
      mockCurrentProfileId.mockReturnValue('deleted-profile-id');

      renderHook(() => useValidateActiveProfile());

      await waitFor(() => {
        expect(logger.warn).toHaveBeenCalledWith(
          'Active profile no longer exists, switching to first available',
          expect.objectContaining({
            feature: 'profiles',
            action: 'validateActiveProfile',
            extra: expect.objectContaining({
              deletedProfileId: 'deleted-profile-id',
              newProfileId: 'profile-1',
            }),
          })
        );
      });
    });

    // Story 1.14 AC#3: Toast notification when profile deleted on another device
    it('shows warning Toast when profile was deleted', async () => {
      (useProfiles as jest.Mock).mockReturnValue({
        data: mockProfiles,
        isSuccess: true,
        isLoading: false,
      });
      mockCurrentProfileId.mockReturnValue('deleted-profile-id');

      renderHook(() => useValidateActiveProfile());

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith({
          type: 'warning',
          message: 'Votre profil a été modifié. Veuillez en sélectionner un.',
        });
      });
    });
  });

  describe('when no current profile ID is set', () => {
    it('switches to first available profile', async () => {
      (useProfiles as jest.Mock).mockReturnValue({
        data: mockProfiles,
        isSuccess: true,
        isLoading: false,
      });
      mockCurrentProfileId.mockReturnValue(null);

      renderHook(() => useValidateActiveProfile());

      await waitFor(() => {
        expect(mockSwitchProfile).toHaveBeenCalledWith('profile-1');
      });
    });

    it('logs info when setting initial profile', async () => {
      (useProfiles as jest.Mock).mockReturnValue({
        data: mockProfiles,
        isSuccess: true,
        isLoading: false,
      });
      mockCurrentProfileId.mockReturnValue(null);

      renderHook(() => useValidateActiveProfile());

      await waitFor(() => {
        expect(logger.info).toHaveBeenCalledWith(
          'No active profile set, switching to first available',
          expect.objectContaining({
            feature: 'profiles',
            action: 'validateActiveProfile',
          })
        );
      });
    });
  });

  describe('recovery attempt tracking', () => {
    it('only attempts recovery once per render', async () => {
      (useProfiles as jest.Mock).mockReturnValue({
        data: mockProfiles,
        isSuccess: true,
        isLoading: false,
      });
      mockCurrentProfileId.mockReturnValue('deleted-profile-id');

      const { rerender } = renderHook(() => useValidateActiveProfile());

      await waitFor(() => {
        expect(mockSwitchProfile).toHaveBeenCalledTimes(1);
      });

      // Re-render should not trigger another switch
      rerender({});

      expect(mockSwitchProfile).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('handles undefined data gracefully', () => {
      (useProfiles as jest.Mock).mockReturnValue({
        data: undefined,
        isSuccess: true,
        isLoading: false,
      });
      mockCurrentProfileId.mockReturnValue('profile-1');

      // Should not throw
      expect(() => {
        renderHook(() => useValidateActiveProfile());
      }).not.toThrow();

      expect(mockSwitchProfile).not.toHaveBeenCalled();
    });

    it('handles non-array profiles data', () => {
      (useProfiles as jest.Mock).mockReturnValue({
        data: 'invalid',
        isSuccess: true,
        isLoading: false,
      });
      mockCurrentProfileId.mockReturnValue('profile-1');

      // Should not throw, treats as empty array
      expect(() => {
        renderHook(() => useValidateActiveProfile());
      }).not.toThrow();
    });
  });
});
