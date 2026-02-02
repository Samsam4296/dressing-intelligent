/**
 * Profile Types
 * Story 1.5: Création Premier Profil
 *
 * Types for profile management using Database types from Supabase.
 * CRITICAL: Use Database types to prevent drift with schema.
 */

import type { Database } from '@/types/database.types';

// ============================================
// Types inferred from Supabase schema (prevents drift)
// ============================================

/**
 * Profile as stored in database
 */
export type Profile = Database['public']['Tables']['profiles']['Row'];

/**
 * Profile insert payload
 */
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];

/**
 * Profile update payload
 */
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

// ============================================
// Request/Response Types
// ============================================

/**
 * Request to create a new profile
 * Note: uses display_name to match database schema (not 'name')
 */
export interface CreateProfileRequest {
  /** Profile name (2-30 characters) */
  name: string;
  /** Optional avatar URL after upload */
  avatarUrl?: string;
}

/**
 * Request to update an existing profile
 */
export interface UpdateProfileRequest {
  /** New profile name (2-30 characters) */
  name?: string;
  /** New avatar URL or null to remove */
  avatarUrl?: string | null;
}

// ============================================
// Error Types
// ============================================

/**
 * Profile-specific error codes
 */
export type ProfileErrorCode =
  | 'AUTH_ERROR'
  | 'CONFIG_ERROR'
  | 'CREATE_ERROR'
  | 'FETCH_ERROR'
  | 'UPDATE_ERROR'
  | 'DELETE_ERROR'
  | 'UPLOAD_ERROR'
  | 'MAX_PROFILES'
  | 'VALIDATION_ERROR'
  | 'DUPLICATE_NAME'
  | 'NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'UNEXPECTED_ERROR';

/**
 * Profile error structure
 */
export interface ProfileError {
  code: ProfileErrorCode;
  message: string;
}

// ============================================
// Response Types (Unified { data, error } pattern)
// ============================================

/**
 * Generic profile response type
 * CRITICAL: All service methods MUST use this format per project-context.md
 */
export interface ProfileResponse<T> {
  data: T | null;
  error: ProfileError | null;
}

// ============================================
// Avatar Types
// ============================================

/**
 * Avatar upload request
 */
export interface UploadAvatarRequest {
  /** Profile ID to associate avatar with */
  profileId: string;
  /** Local image URI from picker */
  imageUri: string;
}

/**
 * Avatar upload result
 */
export interface AvatarUploadResult {
  /** Signed URL for avatar (expires in 15min per NFR-S3) */
  signedUrl: string;
  /** Storage path for future reference */
  storagePath: string;
}

// ============================================
// Validation Types
// ============================================

/**
 * Profile name validation result
 */
export interface NameValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate profile name (2-30 characters)
 */
export const validateProfileName = (name: string): NameValidationResult => {
  const trimmedName = name.trim();

  if (trimmedName.length < 2) {
    return {
      isValid: false,
      error: 'Le nom doit contenir au moins 2 caractères',
    };
  }

  if (trimmedName.length > 30) {
    return {
      isValid: false,
      error: 'Le nom ne peut pas dépasser 30 caractères',
    };
  }

  return { isValid: true };
};
