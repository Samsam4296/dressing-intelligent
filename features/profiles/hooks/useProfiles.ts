/**
 * useProfiles Hook
 * Story 1.5: Création Premier Profil
 * Story 1.7: Switch Entre Profils
 *
 * TanStack Query hooks for profile management.
 * CRITICAL: Query keys MUST be structured [feature, ...identifiers] per project-context.md
 *
 * AC#3: Switch < 1 second with optimistic updates (NFR-P4)
 * AC#4: All profile data invalidated on switch
 * AC#8: Smooth 60fps animation with haptic feedback
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import NetInfo from '@react-native-community/netinfo';
import { profileService } from '../services/profileService';
import { switchProfileService } from '../services/switchProfileService';
import { useProfileStore } from '../stores/useProfileStore';
import { showToast } from '@/shared/components/Toast';
import { storageHelpers, zustandStorage } from '@/lib/storage';
import type { CreateProfileRequest, UpdateProfileRequest, Profile } from '../types/profile.types';

// ============================================
// Storage Keys for Offline Support
// ============================================

const PENDING_SWITCH_KEY = 'pending_profile_switch';

// ============================================
// Query Keys (structured for invalidation)
// ============================================

export const profileKeys = {
  all: ['profiles'] as const,
  lists: () => [...profileKeys.all, 'list'] as const,
  list: (userId: string) => [...profileKeys.lists(), userId] as const,
  active: () => [...profileKeys.all, 'active'] as const,
  details: () => [...profileKeys.all, 'detail'] as const,
  detail: (profileId: string) => [...profileKeys.details(), profileId] as const,
};

// ============================================
// Query Hooks
// ============================================

/**
 * Get all profiles for the current user
 *
 * @param userId - User ID for query key (optional, for cache isolation)
 * @param enabled - Whether to run the query (default true)
 */
export const useProfiles = (userId?: string, enabled = true) => {
  return useQuery({
    queryKey: userId ? profileKeys.list(userId) : profileKeys.lists(),
    queryFn: async () => {
      const result = await profileService.getProfiles();
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    enabled,
  });
};

/**
 * Get the currently active profile
 */
export const useActiveProfile = (enabled = true) => {
  return useQuery({
    queryKey: profileKeys.active(),
    queryFn: async () => {
      const result = await profileService.getActiveProfile();
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    enabled,
  });
};

// ============================================
// Mutation Hooks
// ============================================

/**
 * Create a new profile
 *
 * Usage:
 * ```typescript
 * const { mutate: createProfile, isPending } = useCreateProfile();
 *
 * createProfile(
 *   { name: 'Emma', avatarUrl: 'https://...' },
 *   {
 *     onSuccess: (profile) => { router.replace('/(tabs)/'); },
 *     onError: (error) => { showError(error.message); }
 *   }
 * );
 * ```
 */
export const useCreateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateProfileRequest) => {
      const result = await profileService.createProfile(request);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data as Profile;
    },
    onSuccess: (newProfile) => {
      // Invalidate profiles list to refetch
      queryClient.invalidateQueries({ queryKey: profileKeys.all });

      // If this is the first profile (is_active = true), invalidate active profile too
      if (newProfile?.is_active) {
        queryClient.setQueryData(profileKeys.active(), newProfile);
      }
    },
  });
};

/**
 * Update an existing profile with optimistic updates
 *
 * Story 1.8: Modification de Profil
 * AC#2: Optimistic update - UI updates immediately
 * AC#5: onError rollback - revert to previous state
 *
 * @example
 * ```typescript
 * const { mutate: updateProfile, isPending } = useUpdateProfile();
 *
 * updateProfile(
 *   { profileId: '123', updates: { name: 'New Name' } },
 *   {
 *     onSuccess: () => { closeModal(); },
 *     onError: (error) => { showError(error.message); }
 *   }
 * );
 * ```
 */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      profileId,
      updates,
    }: {
      profileId: string;
      updates: UpdateProfileRequest;
    }) => {
      const result = await profileService.updateProfile(profileId, updates);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data as Profile;
    },

    // Optimistic update: immediate UI response (AC#2)
    onMutate: async ({ profileId, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: profileKeys.all });

      // Snapshot previous state for rollback
      const previousProfiles = queryClient.getQueryData<Profile[]>(profileKeys.lists());
      const previousActiveProfile = queryClient.getQueryData<Profile>(profileKeys.active());

      // Optimistically update profiles list cache
      if (previousProfiles) {
        const updatedProfiles = previousProfiles.map((profile) =>
          profile.id === profileId
            ? {
                ...profile,
                display_name: updates.name ?? profile.display_name,
                avatar_url:
                  updates.avatarUrl !== undefined ? updates.avatarUrl : profile.avatar_url,
              }
            : profile
        );
        queryClient.setQueryData(profileKeys.lists(), updatedProfiles);
      }

      // Optimistically update active profile cache if this is the active one
      if (previousActiveProfile?.id === profileId) {
        queryClient.setQueryData(profileKeys.active(), {
          ...previousActiveProfile,
          display_name: updates.name ?? previousActiveProfile.display_name,
          avatar_url:
            updates.avatarUrl !== undefined ? updates.avatarUrl : previousActiveProfile.avatar_url,
        });
      }

      // Return context for potential rollback
      return { previousProfiles, previousActiveProfile };
    },

    // Rollback on error (AC#5)
    onError: (_error, _variables, context) => {
      // Restore previous profiles list
      if (context?.previousProfiles) {
        queryClient.setQueryData(profileKeys.lists(), context.previousProfiles);
      }

      // Restore previous active profile
      if (context?.previousActiveProfile) {
        queryClient.setQueryData(profileKeys.active(), context.previousActiveProfile);
      }
    },

    // Always refetch after error or success to sync with server
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
};

/**
 * Set a profile as active
 */
export const useSetActiveProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileId: string) => {
      const result = await profileService.setActiveProfile(profileId);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return profileId;
    },
    onSuccess: () => {
      // Invalidate all profile queries to refresh active state
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
};

/**
 * Delete a profile
 */
export const useDeleteProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileId: string) => {
      const result = await profileService.deleteProfile(profileId);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return profileId;
    },
    onSuccess: () => {
      // Invalidate profiles list
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
};

/**
 * Upload avatar for a profile
 */
export const useUploadAvatar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ profileId, imageUri }: { profileId: string; imageUri: string }) => {
      const result = await profileService.uploadAvatar(profileId, imageUri);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      // Invalidate profiles to refresh avatar URLs
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
};

// ============================================
// Story 1.7: Switch Profile Mutation
// ============================================

/**
 * Switch active profile with optimistic updates and offline support
 *
 * AC#3: Switch executes in less than 1 second (NFR-P4) via optimistic UI
 * AC#4: All profile data invalidated on success
 * AC#5: UI reflects immediately via Zustand store
 * AC#7: Haptic feedback on success/error
 * AC#9: Works offline with local cache
 * AC#10: Toast indicates offline mode
 * AC#12: Error keeps previous profile active
 *
 * @example
 * ```typescript
 * const { mutate: switchProfile, isPending } = useSwitchProfile();
 *
 * const handleSwitch = (profileId: string) => {
 *   switchProfile(profileId);
 * };
 * ```
 */
export const useSwitchProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newProfileId: string) => {
      // Get fresh currentProfileId at mutation time (avoid stale closure)
      const { currentProfileId } = useProfileStore.getState();

      // Check network connectivity
      const netState = await NetInfo.fetch();

      if (!netState.isConnected) {
        // Offline mode: store pending switch and return success
        await storageHelpers.setJSON(PENDING_SWITCH_KEY, {
          profileId: newProfileId,
          timestamp: Date.now(),
        });

        return {
          previousProfileId: currentProfileId || '',
          newProfileId,
          offline: true,
        };
      }

      // Online mode: execute server switch
      const result = await switchProfileService.switchProfile(newProfileId);

      if (result.error) {
        throw new Error(result.error.message);
      }

      return result.data!;
    },

    // Optimistic update: immediate UI response (AC#3, AC#5)
    onMutate: async (newProfileId) => {
      // Get fresh state at mutation time (avoid stale closure)
      const { setCurrentProfile, currentProfileId } = useProfileStore.getState();

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: profileKeys.all });

      // Snapshot previous state for rollback
      const previousProfileId = currentProfileId;

      // Optimistic update Zustand store immediately (0ms perceived latency)
      setCurrentProfile(newProfileId);

      // Return context for potential rollback
      return { previousProfileId };
    },

    onSuccess: (result, _newProfileId, _context) => {
      if (result.offline) {
        // Offline switch: show info toast (AC#10)
        showToast({
          type: 'info',
          message: 'Mode hors ligne - données locales',
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        // Online switch: invalidate all caches (AC#4)
        queryClient.invalidateQueries({ queryKey: profileKeys.all });
        queryClient.invalidateQueries({ queryKey: ['clothes'] });
        queryClient.invalidateQueries({ queryKey: ['recommendations'] });

        // Success haptic feedback (AC#7)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },

    onError: (error, _newProfileId, context) => {
      // Get fresh setCurrentProfile at error time
      const { setCurrentProfile } = useProfileStore.getState();

      // Rollback optimistic update (AC#12)
      if (context?.previousProfileId) {
        setCurrentProfile(context.previousProfileId);
      }

      // Show error toast (AC#13)
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Impossible de changer de profil',
      });

      // Error haptic feedback (AC#7)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });
};

/**
 * Get pending profile switch stored for offline sync
 */
export const getPendingSwitch = async (): Promise<{
  profileId: string;
  timestamp: number;
} | null> => {
  return storageHelpers.getJSON<{ profileId: string; timestamp: number }>(PENDING_SWITCH_KEY);
};

/**
 * Clear pending profile switch after successful sync
 */
export const clearPendingSwitch = async (): Promise<void> => {
  try {
    await zustandStorage.removeItem(PENDING_SWITCH_KEY);
  } catch {
    // Silently fail if removal fails
  }
};
