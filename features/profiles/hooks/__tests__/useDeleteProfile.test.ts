/**
 * useDeleteProfile Hook Tests
 * Story 1.9: Suppression de Profil
 *
 * Tests for the useDeleteProfile hook:
 * - AC#2: Profile deletion with cascade
 * - AC#3: Auto-switch if active profile deleted (via useValidateActiveProfile)
 * - AC#4: Block deletion of last profile
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { useDeleteProfile } from '../useDeleteProfile';
import { profileService } from '../../services/profileService';
import { showToast } from '@/shared/components/Toast';

// ============================================
// Mocks
// ============================================

jest.mock('expo-haptics');
jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
jest.mock('@/shared/components/Toast', () => ({
  showToast: jest.fn(),
}));
jest.mock('../../services/profileService', () => ({
  profileService: {
    deleteProfile: jest.fn(),
  },
}));
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
  }),
}));

// ============================================
// Test Data
// ============================================

const mockProfile = {
  id: 'profile-1',
  user_id: 'user-1',
  display_name: 'Test Profile',
  avatar_url: null,
  is_active: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockProfiles = [
  mockProfile,
  {
    id: 'profile-2',
    user_id: 'user-1',
    display_name: 'Second Profile',
    avatar_url: null,
    is_active: true,
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  },
];

// ============================================
// Tests
// ============================================

describe('useDeleteProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes profile successfully', async () => {
    // Setup mock for successful deletion
    (profileService.deleteProfile as jest.Mock).mockResolvedValue({
      data: null,
      error: null,
    });

    const onProfileDeleted = jest.fn();
    const onClose = jest.fn();

    const { result } = renderHook(() =>
      useDeleteProfile({
        profile: mockProfile,
        profiles: mockProfiles,
        onClose,
        onProfileDeleted,
      })
    );

    // Execute deletion
    await act(async () => {
      await result.current.handleDelete();
    });

    // Verify service was called
    expect(profileService.deleteProfile).toHaveBeenCalledWith('profile-1');

    // Verify success haptic feedback
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success
    );

    // Verify success toast
    expect(showToast).toHaveBeenCalledWith({
      type: 'success',
      message: expect.any(String),
    });

    // Verify callbacks order: onProfileDeleted BEFORE onClose
    expect(onProfileDeleted).toHaveBeenCalled();
  });

  it('blocks deletion of last profile', async () => {
    const onProfileDeleted = jest.fn();
    const onClose = jest.fn();

    // Only one profile (the last one)
    const singleProfile = [mockProfile];

    const { result } = renderHook(() =>
      useDeleteProfile({
        profile: mockProfile,
        profiles: singleProfile,
        onClose,
        onProfileDeleted,
      })
    );

    // Check canDelete is false
    expect(result.current.canDelete).toBe(false);

    // Try to delete
    await act(async () => {
      await result.current.handleDelete();
    });

    // Service should NOT be called
    expect(profileService.deleteProfile).not.toHaveBeenCalled();

    // Error haptic feedback
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Error
    );
  });

  it('calls onProfileDeleted before resetAndClose', async () => {
    (profileService.deleteProfile as jest.Mock).mockResolvedValue({
      data: null,
      error: null,
    });

    const callOrder: string[] = [];
    const onProfileDeleted = jest.fn(() => callOrder.push('onProfileDeleted'));
    const onClose = jest.fn(() => callOrder.push('onClose'));

    const { result } = renderHook(() =>
      useDeleteProfile({
        profile: mockProfile,
        profiles: mockProfiles,
        onClose,
        onProfileDeleted,
      })
    );

    await act(async () => {
      await result.current.handleDelete();
    });

    // Verify order: onProfileDeleted first, then onClose
    expect(callOrder).toEqual(['onProfileDeleted', 'onClose']);
  });

  it('handles deletion error gracefully', async () => {
    (profileService.deleteProfile as jest.Mock).mockResolvedValue({
      data: null,
      error: { code: 'NETWORK_ERROR', message: 'Network error' },
    });

    const onProfileDeleted = jest.fn();
    const onClose = jest.fn();

    const { result } = renderHook(() =>
      useDeleteProfile({
        profile: mockProfile,
        profiles: mockProfiles,
        onClose,
        onProfileDeleted,
      })
    );

    await act(async () => {
      await result.current.handleDelete();
    });

    // onProfileDeleted should NOT be called on error
    expect(onProfileDeleted).not.toHaveBeenCalled();

    // Error toast shown
    expect(showToast).toHaveBeenCalledWith({
      type: 'error',
      message: expect.any(String),
    });
  });

  it('resets and closes without action', () => {
    const onClose = jest.fn();

    const { result } = renderHook(() =>
      useDeleteProfile({
        profile: mockProfile,
        profiles: mockProfiles,
        onClose,
        onProfileDeleted: jest.fn(),
      })
    );

    act(() => {
      result.current.resetAndClose();
    });

    expect(onClose).toHaveBeenCalled();
  });
});
