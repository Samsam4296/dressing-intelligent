/**
 * Storage Service
 * Story 2.7: Upload et Stockage Photo
 *
 * Handles Supabase Storage operations for clothing photos.
 * Downloads from Cloudinary, uploads to Storage, creates signed URLs.
 */

import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';
import { captureError } from '@/lib/logger';
import type { ApiResponse } from '@/types';

const BUCKET_NAME = 'clothes-photos';
const SIGNED_URL_EXPIRY = 900; // 15 minutes (NFR-S3)
const ALLOWED_SOURCE_HOST = 'res.cloudinary.com';
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

/** Validates that a source URL is a Cloudinary HTTPS URL (C-1: anti-SSRF) */
const isValidSourceUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname === ALLOWED_SOURCE_HOST;
  } catch {
    return false;
  }
};

/**
 * Generates a unique filename for storage
 * Format: {timestamp}_{hex}.jpg
 */
const generateFileName = (): string => {
  const timestamp = Date.now();
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${timestamp}_${hex}.jpg`;
};

export const storageService = {
  /**
   * Downloads image from URL (Cloudinary) and uploads to Supabase Storage.
   * Uses expo-file-system for download + base64-arraybuffer for upload.
   *
   * @param sourceUrl - Cloudinary URL to download from
   * @param userId - auth.uid() for storage path prefix (RLS requirement)
   * @returns Storage path (e.g., "{userId}/1706789012345_a1b2c3d4.jpg")
   */
  async downloadAndUploadImage(sourceUrl: string, userId: string): Promise<ApiResponse<string>> {
    // C-1: Validate source URL is from Cloudinary (anti-SSRF)
    if (!isValidSourceUrl(sourceUrl)) {
      return { data: null, error: new Error('Invalid source URL') };
    }

    // @ts-expect-error - expo-file-system v19: cacheDirectory exists at runtime but not in main module types
    // eslint-disable-next-line import/namespace
    const tempUri = `${FileSystem.cacheDirectory}upload_${Date.now()}.jpg`;

    try {
      // 1. Download from Cloudinary to temp file
      const downloadResult = await FileSystem.downloadAsync(sourceUrl, tempUri);

      if (downloadResult.status !== 200) {
        throw new Error('Image download failed');
      }

      // H-2: Validate Content-Type from response
      const contentType =
        downloadResult.headers?.['Content-Type'] || downloadResult.headers?.['content-type'];
      if (contentType && !ALLOWED_IMAGE_TYPES.has(contentType.split(';')[0].trim())) {
        throw new Error('Invalid image type');
      }

      // 2. Read as base64
      const base64Data = await FileSystem.readAsStringAsync(downloadResult.uri, {
        // @ts-expect-error - expo-file-system v19: EncodingType exists at runtime but not in main module types
        // eslint-disable-next-line import/namespace
        encoding: FileSystem.EncodingType.Base64,
      });

      // 3. Convert base64 to ArrayBuffer (React Native compatible)
      const arrayBuffer = decode(base64Data);

      // 4. Generate unique storage path
      const fileName = generateFileName();
      const storagePath = `${userId}/${fileName}`;

      // 5. Upload to Supabase Storage
      const uploadContentType = contentType?.split(';')[0].trim() || 'image/jpeg';
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, arrayBuffer, {
          contentType: uploadContentType,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      return { data: storagePath, error: null };
    } catch (error) {
      // Error logging delegated to mutation hook (consistent with clothingService pattern)
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Upload failed'),
      };
    } finally {
      // Cleanup temp file (fire and forget)
      FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});
    }
  },

  /**
   * Creates a signed URL for a storage path (NFR-S3: 15min expiration)
   */
  async createSignedUrl(storagePath: string): Promise<ApiResponse<string>> {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

      if (error) throw error;

      return { data: data.signedUrl, error: null };
    } catch (error) {
      captureError(error, 'wardrobe', 'storageService.createSignedUrl');
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Signed URL failed'),
      };
    }
  },

  /**
   * Deletes a file from storage (cleanup on error).
   * Non-blocking: logs but doesn't fail.
   */
  async deleteFromStorage(storagePath: string): Promise<void> {
    try {
      const { error } = await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
      if (error) {
        captureError(error, 'wardrobe', 'storageService.deleteFromStorage');
      }
    } catch (error) {
      captureError(error, 'wardrobe', 'storageService.deleteFromStorage');
    }
  },
};
