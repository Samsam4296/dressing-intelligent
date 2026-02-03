/**
 * Profile Service
 * Story 1.5: Création Premier Profil
 *
 * API calls for profile operations with Supabase.
 * CRITICAL: All methods return { data, error } format per project-context.md
 * CRITICAL: Use logger (NEVER console.log) per project-context.md
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { logger, captureError } from '@/lib/logger';
import type {
  Profile,
  ProfileResponse,
  CreateProfileRequest,
  UpdateProfileRequest,
  ProfileError,
  AvatarUploadResult,
} from '../types/profile.types';

// Maximum profiles per user (FR4)
const MAX_PROFILES_PER_USER = 3;

/**
 * Map Supabase errors to user-friendly French messages
 */
const mapProfileError = (error: { message: string; code?: string }): ProfileError => {
  const message = error.message.toLowerCase();

  if (message.includes('duplicate') || message.includes('unique')) {
    return {
      code: 'DUPLICATE_NAME',
      message: 'Ce nom de profil existe déjà',
    };
  }

  if (message.includes('check_display_name_length') || message.includes('char_length')) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Le nom doit contenir entre 2 et 30 caractères',
    };
  }

  if (message.includes('network') || message.includes('fetch')) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Erreur de connexion. Vérifiez votre connexion internet',
    };
  }

  if (message.includes('storage') || message.includes('upload')) {
    return {
      code: 'UPLOAD_ERROR',
      message: "Erreur lors de l'upload de l'avatar",
    };
  }

  if (message.includes('not found') || message.includes('no rows')) {
    return {
      code: 'NOT_FOUND',
      message: 'Profil introuvable',
    };
  }

  return {
    code: 'UNEXPECTED_ERROR',
    message: 'Une erreur est survenue',
  };
};

/**
 * Profile service with Supabase integration
 */
export const profileService = {
  /**
   * Create a new profile for the authenticated user
   * AC#5, AC#6, AC#7: Profile creation with RLS, auto-active for first profile
   *
   * @param request - Profile creation data (name, avatarUrl optional)
   * @returns ProfileResponse with profile data or error
   */
  async createProfile(request: CreateProfileRequest): Promise<ProfileResponse<Profile>> {
    if (!isSupabaseConfigured()) {
      const configError: ProfileError = {
        code: 'CONFIG_ERROR',
        message: "Le service n'est pas configuré",
      };
      logger.warn('Supabase not configured for profile creation', {
        feature: 'profiles',
        action: 'createProfile',
      });
      return { data: null, error: configError };
    }

    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return {
          data: null,
          error: {
            code: 'AUTH_ERROR',
            message: 'Utilisateur non authentifié',
          },
        };
      }

      // Check profile count (max 3 per user - FR4)
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) {
        captureError(countError, 'profiles', 'createProfile');
        return {
          data: null,
          error: mapProfileError(countError),
        };
      }

      if (count !== null && count >= MAX_PROFILES_PER_USER) {
        return {
          data: null,
          error: {
            code: 'MAX_PROFILES',
            message: `Nombre maximum de profils atteint (${MAX_PROFILES_PER_USER})`,
          },
        };
      }

      // Determine if this is the first profile (make it active by default - AC#6)
      const isFirstProfile = count === 0;

      // Insert profile (using display_name to match database schema)
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          display_name: request.name,
          avatar_url: request.avatarUrl || null,
          is_active: isFirstProfile,
        })
        .select()
        .single();

      if (error) {
        captureError(error, 'profiles', 'createProfile');
        return {
          data: null,
          error: mapProfileError(error),
        };
      }

      logger.info('Profile created successfully', {
        feature: 'profiles',
        action: 'createProfile',
        extra: { isFirstProfile },
      });

      return { data, error: null };
    } catch (err) {
      captureError(err, 'profiles', 'createProfile');
      return {
        data: null,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: 'Une erreur inattendue est survenue',
        },
      };
    }
  },

  /**
   * Get all profiles for the authenticated user
   * AC#5: RLS policy ensures only own profiles are returned
   */
  async getProfiles(): Promise<ProfileResponse<Profile[]>> {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: {
          code: 'CONFIG_ERROR',
          message: "Le service n'est pas configuré",
        },
      };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        captureError(error, 'profiles', 'getProfiles');
        return {
          data: null,
          error: mapProfileError(error),
        };
      }

      return { data: data || [], error: null };
    } catch (err) {
      captureError(err, 'profiles', 'getProfiles');
      return {
        data: null,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: 'Une erreur inattendue est survenue',
        },
      };
    }
  },

  /**
   * Get the currently active profile
   */
  async getActiveProfile(): Promise<ProfileResponse<Profile>> {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: {
          code: 'CONFIG_ERROR',
          message: "Le service n'est pas configuré",
        },
      };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error) {
        // No active profile is not necessarily an error for new users
        if (error.code === 'PGRST116') {
          return { data: null, error: null };
        }
        captureError(error, 'profiles', 'getActiveProfile');
        return {
          data: null,
          error: mapProfileError(error),
        };
      }

      return { data, error: null };
    } catch (err) {
      captureError(err, 'profiles', 'getActiveProfile');
      return {
        data: null,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: 'Une erreur inattendue est survenue',
        },
      };
    }
  },

  /**
   * Set a profile as the active profile
   * AC#6: Database trigger ensures only one active profile per user
   *
   * @param profileId - Profile UUID to activate
   */
  async setActiveProfile(profileId: string): Promise<ProfileResponse<null>> {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: {
          code: 'CONFIG_ERROR',
          message: "Le service n'est pas configuré",
        },
      };
    }

    try {
      // Database trigger (ensure_single_active_profile) handles deactivating other profiles
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: true })
        .eq('id', profileId);

      if (error) {
        captureError(error, 'profiles', 'setActiveProfile');
        return {
          data: null,
          error: mapProfileError(error),
        };
      }

      logger.info('Active profile changed', {
        feature: 'profiles',
        action: 'setActiveProfile',
      });

      return { data: null, error: null };
    } catch (err) {
      captureError(err, 'profiles', 'setActiveProfile');
      return {
        data: null,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: 'Une erreur inattendue est survenue',
        },
      };
    }
  },

  /**
   * Update an existing profile
   *
   * @param profileId - Profile UUID to update
   * @param updates - Fields to update
   */
  async updateProfile(
    profileId: string,
    updates: UpdateProfileRequest
  ): Promise<ProfileResponse<Profile>> {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: {
          code: 'CONFIG_ERROR',
          message: "Le service n'est pas configuré",
        },
      };
    }

    try {
      // Build update object (map name to display_name for database)
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) {
        updateData.display_name = updates.name;
      }
      if (updates.avatarUrl !== undefined) {
        updateData.avatar_url = updates.avatarUrl;
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profileId)
        .select()
        .single();

      if (error) {
        captureError(error, 'profiles', 'updateProfile');
        return {
          data: null,
          error: mapProfileError(error),
        };
      }

      logger.info('Profile updated', {
        feature: 'profiles',
        action: 'updateProfile',
      });

      return { data, error: null };
    } catch (err) {
      captureError(err, 'profiles', 'updateProfile');
      return {
        data: null,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: 'Une erreur inattendue est survenue',
        },
      };
    }
  },

  /**
   * Delete a profile and its associated avatar from Storage
   * Story 1.9: Suppression de Profil
   *
   * @param profileId - Profile UUID to delete
   */
  async deleteProfile(profileId: string): Promise<ProfileResponse<null>> {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: {
          code: 'CONFIG_ERROR',
          message: "Le service n'est pas configuré",
        },
      };
    }

    try {
      // Get current user for avatar path
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Delete avatar from Storage (best effort - don't fail if avatar doesn't exist)
      if (user) {
        const avatarPath = `${user.id}/${profileId}.jpg`;
        await supabase.storage.from('avatars').remove([avatarPath]);
        // Note: We don't check for errors here as the avatar might not exist
      }

      // Delete profile from database (cascade will delete clothes, recommendations)
      const { error } = await supabase.from('profiles').delete().eq('id', profileId);

      if (error) {
        captureError(error, 'profiles', 'deleteProfile');
        return {
          data: null,
          error: mapProfileError(error),
        };
      }

      logger.info('Profile deleted', {
        feature: 'profiles',
        action: 'deleteProfile',
      });

      return { data: null, error: null };
    } catch (err) {
      captureError(err, 'profiles', 'deleteProfile');
      return {
        data: null,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: 'Une erreur inattendue est survenue',
        },
      };
    }
  },

  /**
   * Upload avatar image to Supabase Storage
   * AC#3, AC#7: Upload to avatars bucket with signed URLs
   *
   * @param profileId - Profile UUID
   * @param imageUri - Local image URI from picker
   * @returns ProfileResponse with signed URL or error
   */
  async uploadAvatar(
    profileId: string,
    imageUri: string
  ): Promise<ProfileResponse<AvatarUploadResult>> {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: {
          code: 'CONFIG_ERROR',
          message: "Le service n'est pas configuré",
        },
      };
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return {
          data: null,
          error: {
            code: 'AUTH_ERROR',
            message: 'Non authentifié',
          },
        };
      }

      // Convert URI to Blob for upload
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // File path: user_id/profile_id.jpg (AC#7, NFR-S5 RLS)
      const filePath = `${user.id}/${profileId}.jpg`;

      // Upload with upsert to allow replacement (Subtask 7.5)
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

      if (uploadError) {
        captureError(uploadError, 'profiles', 'uploadAvatar');
        return {
          data: null,
          error: {
            code: 'UPLOAD_ERROR',
            message: "Erreur lors de l'upload de l'avatar",
          },
        };
      }

      // Get signed URL (expires in 15min - NFR-S3)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('avatars')
        .createSignedUrl(filePath, 60 * 15); // 15 minutes

      if (signedError || !signedData?.signedUrl) {
        captureError(
          signedError || new Error('No signed URL returned'),
          'profiles',
          'uploadAvatar'
        );
        return {
          data: null,
          error: {
            code: 'UPLOAD_ERROR',
            message: "Erreur lors de la génération de l'URL avatar",
          },
        };
      }

      logger.info('Avatar uploaded successfully', {
        feature: 'profiles',
        action: 'uploadAvatar',
      });

      return {
        data: {
          signedUrl: signedData.signedUrl,
          storagePath: filePath,
        },
        error: null,
      };
    } catch (err) {
      captureError(err, 'profiles', 'uploadAvatar');
      return {
        data: null,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: 'Une erreur inattendue est survenue',
        },
      };
    }
  },

  /**
   * Get a fresh signed URL for an avatar
   * Used when cached URL expires (15min)
   *
   * @param storagePath - Path in storage bucket
   */
  async refreshAvatarUrl(storagePath: string): Promise<ProfileResponse<string>> {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: {
          code: 'CONFIG_ERROR',
          message: "Le service n'est pas configuré",
        },
      };
    }

    try {
      const { data, error } = await supabase.storage
        .from('avatars')
        .createSignedUrl(storagePath, 60 * 15); // 15 minutes

      if (error || !data?.signedUrl) {
        return {
          data: null,
          error: {
            code: 'FETCH_ERROR',
            message: "Erreur lors du rafraîchissement de l'URL avatar",
          },
        };
      }

      return { data: data.signedUrl, error: null };
    } catch (err) {
      captureError(err, 'profiles', 'refreshAvatarUrl');
      return {
        data: null,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: 'Une erreur inattendue est survenue',
        },
      };
    }
  },
};
