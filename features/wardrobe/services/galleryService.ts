/**
 * Gallery Service
 * Story 2.2: Import depuis Galerie
 *
 * Handles image picker for gallery imports.
 * CRITICAL: All methods return { data, error } format per project-context.md
 * CRITICAL: Use captureError (NEVER console.log) per project-context.md
 *
 * Note SDK 54: launchImageLibraryAsync() requires NO permission on iOS/Android.
 * The native picker handles access transparently.
 */

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { captureError } from '@/lib/logger';
import type { ApiResponse } from '@/types';

// ============================================
// Constants
// ============================================

/** Maximum file size in bytes (10MB) */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Allowed image extensions */
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'];

// ============================================
// Types
// ============================================

/**
 * Result from successful gallery image selection
 */
export interface GalleryImageResult {
  uri: string;
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
  mimeType: string;
}

/**
 * Gallery error codes for error handling
 */
export type GalleryErrorCode = 'cancelled' | 'file_too_large' | 'invalid_format' | 'picker_error';

/**
 * Gallery-specific error class with error code
 * Proper class extension for type safety
 */
export class GalleryError extends Error {
  constructor(
    public readonly code: GalleryErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'GalleryError';
  }
}

/** Valid gallery error codes for type guard validation */
const GALLERY_ERROR_CODES: readonly GalleryErrorCode[] = [
  'cancelled',
  'file_too_large',
  'invalid_format',
  'picker_error',
];

/**
 * Type guard to check if an error is a GalleryError
 * Validates both instance type and error code validity
 */
export const isGalleryError = (error: Error): error is GalleryError => {
  if (error instanceof GalleryError) return true;
  // Fallback check for serialized errors: validate code is a valid GalleryErrorCode
  if ('code' in error && typeof (error as GalleryError).code === 'string') {
    return GALLERY_ERROR_CODES.includes((error as GalleryError).code);
  }
  return false;
};

// ============================================
// Helper Functions
// ============================================

/**
 * Creates a typed GalleryError
 */
const createGalleryError = (code: GalleryErrorCode, message: string): GalleryError => {
  return new GalleryError(code, message);
};

// ============================================
// Gallery Service
// ============================================

/**
 * Gallery service with expo-image-picker integration
 * AC#1: Open native picker immediately
 * AC#2: Validate formats (jpg, png, heic, webp)
 * AC#3: Validate file size (max 10MB)
 */
export const galleryService = {
  /**
   * Opens the native gallery picker and returns the selected image
   * Note: No permission required (expo-image-picker SDK 54)
   *
   * AC#1: Picker opens immediately
   * AC#2: Post-selection format validation
   * AC#3: Post-selection size validation
   */
  async pickImage(): Promise<ApiResponse<GalleryImageResult>> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false, // No editing, just selection
        quality: 1, // Max quality, compression in preview
        base64: false,
        exif: false,
      });

      // User cancelled selection (AC#5)
      if (result.canceled) {
        return {
          data: null,
          error: createGalleryError('cancelled', 'Sélection annulée'),
        };
      }

      // Defensive check for empty assets array
      const asset = result.assets[0];
      if (!asset) {
        return {
          data: null,
          error: createGalleryError('picker_error', 'Aucune image sélectionnée'),
        };
      }

      // Validate format (AC#2)
      const extension = this.getFileExtension(asset.fileName || asset.uri);
      if (!this.isValidFormat(extension)) {
        return {
          data: null,
          error: createGalleryError(
            'invalid_format',
            `Format non supporté. Formats acceptés: ${ALLOWED_EXTENSIONS.join(', ')}`
          ),
        };
      }

      // Validate file size (AC#3)
      // Use FileSystem first, asset.fileSize as fallback
      const fileSize = await this.getFileSize(asset.uri, asset.fileSize);
      if (fileSize > MAX_FILE_SIZE_BYTES) {
        const sizeMB = (fileSize / (1024 * 1024)).toFixed(1);
        return {
          data: null,
          error: createGalleryError(
            'file_too_large',
            `Image trop volumineuse (${sizeMB}MB). Maximum: 10MB`
          ),
        };
      }

      return {
        data: {
          uri: asset.uri,
          fileName: asset.fileName || `image_${Date.now()}.jpg`,
          fileSize,
          width: asset.width,
          height: asset.height,
          mimeType: asset.mimeType || `image/${extension}`,
        },
        error: null,
      };
    } catch (error) {
      captureError(error, 'wardrobe', 'galleryService.pickImage');
      return {
        data: null,
        error: createGalleryError('picker_error', 'Erreur lors de la sélection'),
      };
    }
  },

  /**
   * Extracts file extension from filename or URI
   * Returns empty string if no valid extension found
   * Handles query params in URIs (e.g., file:///image.jpg?token=abc)
   */
  getFileExtension(fileNameOrUri: string): string {
    // Remove query params and hash fragments for URI parsing
    const cleanPath = fileNameOrUri.split('?')[0].split('#')[0];
    const lastDotIndex = cleanPath.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === cleanPath.length - 1) {
      return ''; // No valid extension found
    }
    return cleanPath.slice(lastDotIndex + 1).toLowerCase();
  },

  /**
   * Validates if the extension is in the allowed list
   * AC#2: jpg, png, heic, webp supported
   */
  isValidFormat(extension: string): boolean {
    return ALLOWED_EXTENSIONS.includes(extension);
  },

  /**
   * Gets file size in bytes
   * Uses FileSystem as primary source, falls back to asset.fileSize
   * AC#3: Size validation requires accurate file size
   */
  async getFileSize(uri: string, assetFileSize?: number): Promise<number> {
    try {
      // Note: expo-file-system SDK 19+ returns size automatically in FileInfo
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists && 'size' in fileInfo && fileInfo.size !== undefined) {
        return fileInfo.size;
      }
      // Fallback: use asset.fileSize if available
      return assetFileSize ?? 0;
    } catch {
      // Fallback: use asset.fileSize if available
      return assetFileSize ?? 0;
    }
  },
};
