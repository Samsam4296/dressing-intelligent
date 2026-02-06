/**
 * Storage Service
 * Story 2.7: Upload et Stockage Photo
 *
 * Handles Supabase Storage operations for clothing photos.
 * Downloads from Cloudinary, uploads to Storage, creates signed URLs.
 */

/* eslint-disable import/namespace -- expo-file-system namespace exports not fully resolved by plugin */
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';
import { captureError } from '@/lib/logger';
import type { ApiResponse } from '@/types';

const BUCKET_NAME = 'clothes-photos';
const SIGNED_URL_EXPIRY = 900; // 15 minutes (NFR-S3)

/**
 * Generates a unique filename for storage
 * Format: {timestamp}_{random}.jpg
 */
const generateFileName = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}_${random}.jpg`;
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
    // @ts-expect-error -- cacheDirectory available at runtime via legacy API, not in SDK 54 types
    const tempUri = `${FileSystem.cacheDirectory}upload_${Date.now()}.jpg`;

    try {
      // 1. Download from Cloudinary to temp file
      const downloadResult = await FileSystem.downloadAsync(sourceUrl, tempUri);

      if (downloadResult.status !== 200) {
        throw new Error(`Download failed: HTTP ${downloadResult.status}`);
      }

      // 2. Read as base64
      const base64Data = await FileSystem.readAsStringAsync(downloadResult.uri, {
        encoding: 'base64',
      });

      // 3. Convert base64 to ArrayBuffer (React Native compatible)
      const arrayBuffer = decode(base64Data);

      // 4. Generate unique storage path
      const fileName = generateFileName();
      const storagePath = `${userId}/${fileName}`;

      // 5. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, arrayBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      return { data: storagePath, error: null };
    } catch (error) {
      captureError(error, 'wardrobe', 'storageService.downloadAndUploadImage');
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
