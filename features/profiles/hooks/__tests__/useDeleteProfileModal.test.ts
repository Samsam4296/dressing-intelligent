/**
 * useDeleteProfileModal Hook Tests
 * Story 1.9: Suppression de Profil
 *
 * Tests for the useDeleteProfileModal hook (modal logic, distinct from TanStack mutation):
 * - AC#2: Profile deletion with cascade (avatar cleanup via profileService)
 * - AC#3: Non-active profiles only deletable via UI (active → edit modal)
 * - AC#4: Block deletion of last profile
 * - Callback order: onProfileDeleted BEFORE resetAndClose (Story 1.8 learning)
 * - Error handling with haptic feedback and toast
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { useDeleteProfileModal } from '../useDeleteProfileModal';
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

describe('useDeleteProfileModal', () => {
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
      useDeleteProfileModal({
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
      useDeleteProfileModal({
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
      useDeleteProfileModal({
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
      useDeleteProfileModal({
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
      useDeleteProfileModal({
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

  it('sets isPending during deletion and clears after', async () => {
    // Slow deletion to verify isPending state
    (profileService.deleteProfile as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: null, error: null }), 50))
    );

    const { result } = renderHook(() =>
      useDeleteProfileModal({
        profile: mockProfile,
        profiles: mockProfiles,
        onClose: jest.fn(),
        onProfileDeleted: jest.fn(),
      })
    );

    // Initially not pending
    expect(result.current.isPending).toBe(false);

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

  it('deletes profile with avatar (avatar cleanup via profileService)', async () => {
    const profileWithAvatar = {
      ...mockProfile,
      avatar_url: 'https://storage.example.com/avatars/user-1/profile-1.jpg',
    };

    (profileService.deleteProfile as jest.Mock).mockResolvedValue({
      data: null,
      error: null,
    });

    const { result } = renderHook(() =>
      useDeleteProfileModal({
        profile: profileWithAvatar,
        profiles: [profileWithAvatar, mockProfiles[1]],
        onClose: jest.fn(),
        onProfileDeleted: jest.fn(),
      })
    );

    await act(async () => {
      await result.current.handleDelete();
    });

    // profileService.deleteProfile handles avatar cleanup internally
    expect(profileService.deleteProfile).toHaveBeenCalledWith(profileWithAvatar.id);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success
    );
  });

  it('returns correct isLastProfile flag', () => {
    const { result: resultSingle } = renderHook(() =>
      useDeleteProfileModal({
        profile: mockProfile,
        profiles: [mockProfile], // Only one profile
        onClose: jest.fn(),
        onProfileDeleted: jest.fn(),
      })
    );

    expect(resultSingle.current.isLastProfile).toBe(true);
    expect(resultSingle.current.canDelete).toBe(false);

    const { result: resultMultiple } = renderHook(() =>
      useDeleteProfileModal({
        profile: mockProfile,
        profiles: mockProfiles, // Multiple profiles
        onClose: jest.fn(),
        onProfileDeleted: jest.fn(),
      })
    );

    expect(resultMultiple.current.isLastProfile).toBe(false);
    expect(resultMultiple.current.canDelete).toBe(true);
  });

  it('handles null profile gracefully', async () => {
    const { result } = renderHook(() =>
      useDeleteProfileModal({
        profile: null,
        profiles: mockProfiles,
        onClose: jest.fn(),
        onProfileDeleted: jest.fn(),
      })
    );

    expect(result.current.canDelete).toBe(false);

    await act(async () => {
      await result.current.handleDelete();
    });

    // Should not call service with null profile
    expect(profileService.deleteProfile).not.toHaveBeenCalled();
  });
});
