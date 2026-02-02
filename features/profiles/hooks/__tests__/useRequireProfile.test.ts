/**
 * useRequireProfile Hook Tests
 * Story 1.5: Création Premier Profil
 *
 * Tests for the navigation guard that requires a profile.
 */

import { renderHook, waitFor } from '@testing-library/react-native';

// Mock modules before importing hook
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock useProfiles hook
const mockUseProfiles = jest.fn();
jest.mock('../useProfiles', () => ({
  useProfiles: (...args: any[]) => mockUseProfiles(...args),
}));

// Import after mocks
import { useRequireProfile } from '../useRequireProfile';
import { logger } from '@/lib/logger';

describe('useRequireProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('returns isLoading true while fetching profiles', () => {
      mockUseProfiles.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });

      const { result } = renderHook(() => useRequireProfile());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.hasProfile).toBe(false);
    });

    it('does not redirect while loading', () => {
      mockUseProfiles.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });

      renderHook(() => useRequireProfile());

      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('with no profile', () => {
    it('redirects to create-profile when user has no profiles', async () => {
      mockUseProfiles.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      });

      renderHook(() => useRequireProfile());

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/(auth)/create-profile');
      });
    });

    it('logs redirect action', async () => {
      mockUseProfiles.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      });

      renderHook(() => useRequireProfile());

      await waitFor(() => {
        expect(logger.info).toHaveBeenCalledWith(
          'User has no profile, redirecting to create-profile',
          expect.objectContaining({
            feature: 'profiles',
            action: 'useRequireProfile',
          })
        );
      });
    });

    it('returns hasProfile false', () => {
      mockUseProfiles.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useRequireProfile());

      expect(result.current.hasProfile).toBe(false);
    });

    it('returns profileCount 0', () => {
      mockUseProfiles.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useRequireProfile());

      expect(result.current.profileCount).toBe(0);
    });
  });

  describe('with profile', () => {
    const mockProfile = {
      id: 'profile-123',
      user_id: 'user-123',
      display_name: 'Emma',
      avatar_url: null,
      is_active: true,
      created_at: '2026-02-02T10:00:00Z',
      updated_at: '2026-02-02T10:00:00Z',
    };

    it('does not redirect when user has profile', async () => {
      mockUseProfiles.mockReturnValue({
        data: [mockProfile],
        isLoading: false,
        isError: false,
      });

      renderHook(() => useRequireProfile());

      // Wait a bit to ensure no redirect happens
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('returns hasProfile true', () => {
      mockUseProfiles.mockReturnValue({
        data: [mockProfile],
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useRequireProfile());

      expect(result.current.hasProfile).toBe(true);
    });

    it('returns correct profileCount', () => {
      mockUseProfiles.mockReturnValue({
        data: [mockProfile, { ...mockProfile, id: 'profile-456' }],
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useRequireProfile());

      expect(result.current.profileCount).toBe(2);
    });
  });

  describe('error state', () => {
    it('does not redirect on error', async () => {
      mockUseProfiles.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      });

      renderHook(() => useRequireProfile());

      // Wait a bit to ensure no redirect happens
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('returns isError true', () => {
      mockUseProfiles.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      });

      const { result } = renderHook(() => useRequireProfile());

      expect(result.current.isError).toBe(true);
    });
  });

  describe('enabled parameter', () => {
    it('passes enabled to useProfiles', () => {
      mockUseProfiles.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      });

      renderHook(() => useRequireProfile(false));

      expect(mockUseProfiles).toHaveBeenCalledWith(undefined, false);
    });

    it('defaults enabled to true', () => {
      mockUseProfiles.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      });

      renderHook(() => useRequireProfile());

      expect(mockUseProfiles).toHaveBeenCalledWith(undefined, true);
    });
  });

  describe('profile count edge cases', () => {
    it('returns 0 when data is undefined', () => {
      mockUseProfiles.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useRequireProfile());

      expect(result.current.profileCount).toBe(0);
    });

    it('returns 0 when data is null', () => {
      mockUseProfiles.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useRequireProfile());

      expect(result.current.profileCount).toBe(0);
    });
  });
});
