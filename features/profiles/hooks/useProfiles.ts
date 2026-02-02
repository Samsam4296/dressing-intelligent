/**
 * useProfiles Hook
 * Story 1.5: Création Premier Profil
 *
 * TanStack Query hooks for profile management.
 * CRITICAL: Query keys MUST be structured [feature, ...identifiers] per project-context.md
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService } from '../services/profileService';
import type { CreateProfileRequest, UpdateProfileRequest, Profile } from '../types/profile.types';

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
 * Update an existing profile
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
    onSuccess: (updatedProfile) => {
      // Invalidate all profile queries
      queryClient.invalidateQueries({ queryKey: profileKeys.all });

      // Update active profile cache if this was the active one
      if (updatedProfile?.is_active) {
        queryClient.setQueryData(profileKeys.active(), updatedProfile);
      }
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
