/**
 * Image Processing Service
 * Story 2.3: Détourage automatique
 *
 * Handles image upload and background removal via Supabase Edge Function.
 * CRITICAL: All methods return { data, error } format per project-context.md
 * CRITICAL: Use captureError (NEVER console.log) per project-context.md
 *
 * Features:
 * - Image compression (max 1500x1500) to reduce memory/network usage
 * - Base64 conversion for upload
 * - Idempotency key to prevent duplicate uploads on retry
 * - 10s client timeout (NFR-I2)
 * - 1 automatic retry on network error
 * - Graceful fallback when background removal fails
 */

import * as FileSystem from 'expo-file-system';
import { EncodingType } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';
import { captureError } from '@/lib/logger';
import type { ApiResponse } from '@/types';
import {
  ProcessingError,
  isProcessingError,
  type ProcessingResult,
  type ProcessingErrorCode,
} from '../types/wardrobe.types';

// ============================================
// Constants
// ============================================

/** Client-side timeout in milliseconds (NFR-I2) */
const PROCESSING_TIMEOUT_MS = 10000;

/** Maximum automatic retries on network error */
const MAX_RETRIES = 1;

/** Maximum image dimension for compression */
const MAX_IMAGE_DIMENSION = 1500;

/** JPEG quality for compression (0-1) */
const COMPRESSION_QUALITY = 0.85;

// ============================================
// Helper Functions
// ============================================

/**
 * Creates a typed ProcessingError
 */
const createProcessingError = (
  code: ProcessingErrorCode,
  message: string,
  retryable = false
): ProcessingError => {
  return new ProcessingError(code, message, retryable);
};

/**
 * Generates a unique idempotency key for upload deduplication
 * Format: timestamp_random to ensure uniqueness even on same millisecond
 */
const generateIdempotencyKey = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}_${random}`;
};

// ============================================
// Edge Function Response Type
// ============================================

interface EdgeFunctionResponse {
  success: boolean;
  data?: {
    originalUrl: string;
    processedUrl: string | null;
    publicId: string;
    // Story 2.4: AI categorization
    suggestedCategory?: string;
    categoryConfidence?: number;
  };
  error?: string;
}

// ============================================
// Image Processing Service
// ============================================

/**
 * Image processing service with Supabase Edge Function integration
 * AC#1: Upload + processing with progress indicator
 * AC#2: < 8s processing time (NFR-P3)
 * AC#4: Fallback to original if background removal fails
 */
export const imageProcessingService = {
  /**
   * Processes a clothing image via the Edge Function
   * 1. Compresses image to reduce memory/network usage
   * 2. Converts local URI to base64
   * 3. Calls Edge Function with authentication and idempotency key
   * 4. Handles timeout and automatic retry
   * 5. Returns Cloudinary URLs (original + processed)
   *
   * @param photoUri - Local file URI of the image
   * @param profileId - UUID of the active profile
   * @param signal - Optional AbortSignal for cancellation
   */
  async processImage({
    photoUri,
    profileId,
    signal,
  }: {
    photoUri: string;
    profileId: string;
    signal?: AbortSignal;
  }): Promise<ApiResponse<ProcessingResult>> {
    // Generate idempotency key once for all retry attempts
    // This prevents duplicate uploads when retrying after network errors
    const idempotencyKey = generateIdempotencyKey();
    let attempt = 0;

    while (attempt <= MAX_RETRIES) {
      attempt++;

      try {
        // Check if already cancelled
        if (signal?.aborted) {
          return {
            data: null,
            error: createProcessingError('cancelled', 'Traitement annulé'),
          };
        }

        // 1. Compress image to reduce memory and network usage
        const compressedUri = await this.compressImage(photoUri);

        // 2. Convert compressed image to base64
        const base64 = await this.uriToBase64(compressedUri);
        const mimeType = 'image/jpeg'; // Compression outputs JPEG

        // 3. Get auth session
        const {
          data: { session },
          error: authError,
        } = await supabase.auth.getSession();

        if (authError || !session) {
          return {
            data: null,
            error: createProcessingError(
              'auth_error',
              'Session expirée, veuillez vous reconnecter'
            ),
          };
        }

        // 4. Call Edge Function with timeout and idempotency key
        const response = await this.callEdgeFunction({
          imageBase64: base64,
          profileId,
          mimeType,
          idempotencyKey,
          accessToken: session.access_token,
          signal,
        });

        // 5. Process response
        if (!response.success || !response.data) {
          throw createProcessingError('server_error', response.error || 'Erreur serveur', true);
        }

        return {
          data: {
            originalUrl: response.data.originalUrl,
            processedUrl: response.data.processedUrl,
            publicId: response.data.publicId,
            usedFallback: response.data.processedUrl === null,
            // Story 2.4: AI categorization
            suggestedCategory: response.data.suggestedCategory as
              | import('../types/wardrobe.types').ClothingCategory
              | undefined,
            categoryConfidence: response.data.categoryConfidence,
          },
          error: null,
        };
      } catch (error) {
        // Type-safe error handling
        const isKnownError = error instanceof Error && isProcessingError(error);

        // Check if cancelled
        if (signal?.aborted || (isKnownError && error.code === 'cancelled')) {
          return {
            data: null,
            error: createProcessingError('cancelled', 'Traitement annulé'),
          };
        }

        // Log error
        captureError(error, 'wardrobe', 'imageProcessingService.processImage', {
          attempt,
          idempotencyKey,
        });

        // Timeout or network error: retry if possible
        if (isKnownError && error.retryable && attempt <= MAX_RETRIES) {
          continue; // Silent automatic retry with same idempotency key
        }

        // Final error - mark as non-retryable since automatic retries exhausted
        if (isKnownError) {
          return {
            data: null,
            error: createProcessingError(error.code, error.message, false),
          };
        }

        // Unknown error - wrap as server_error
        return {
          data: null,
          error: createProcessingError(
            'server_error',
            error instanceof Error ? error.message : 'Erreur inconnue',
            false
          ),
        };
      }
    }

    // Should never reach here
    return {
      data: null,
      error: createProcessingError('network_error', 'Échec après plusieurs tentatives', false),
    };
  },

  /**
   * Compresses and resizes an image to reduce memory and network usage
   * Max dimension: 1500x1500 (sufficient for background removal quality)
   * Output: JPEG with 85% quality
   *
   * @param uri - Local file URI of the original image
   * @returns URI of the compressed image
   */
  async compressImage(uri: string): Promise<string> {
    try {
      // Get original image info to determine resize ratio
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width: MAX_IMAGE_DIMENSION,
              height: MAX_IMAGE_DIMENSION,
            },
          },
        ],
        {
          compress: COMPRESSION_QUALITY,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return result.uri;
    } catch (error) {
      // If compression fails, use original (fallback)
      captureError(error, 'wardrobe', 'imageProcessingService.compressImage');
      return uri;
    }
  },

  /**
   * Calls the Edge Function with timeout management
   *
   * @param imageBase64 - Base64 encoded image (without data: prefix)
   * @param profileId - UUID of the active profile
   * @param mimeType - MIME type of the image
   * @param idempotencyKey - Unique key to prevent duplicate uploads
   * @param accessToken - Supabase access token
   * @param signal - Optional external AbortSignal
   */
  async callEdgeFunction({
    imageBase64,
    profileId,
    mimeType,
    idempotencyKey,
    accessToken,
    signal,
  }: {
    imageBase64: string;
    profileId: string;
    mimeType: string;
    idempotencyKey: string;
    accessToken: string;
    signal?: AbortSignal;
  }): Promise<EdgeFunctionResponse> {
    // Create timeout AbortController
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), PROCESSING_TIMEOUT_MS);

    // Combine external signal and timeout for early cancellation detection
    const combinedSignal = signal
      ? this.combineAbortSignals(signal, timeoutController.signal)
      : timeoutController.signal;

    try {
      // Use Promise.race to implement true timeout with Supabase SDK
      const invokePromise = supabase.functions.invoke<EdgeFunctionResponse>(
        'process-clothing-image',
        {
          body: { imageBase64, profileId, mimeType, idempotencyKey },
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      // Timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        combinedSignal.addEventListener('abort', () => {
          reject(new Error(signal?.aborted ? 'cancelled' : 'timeout'));
        });
      });

      // Race between invoke and timeout/cancellation
      const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

      clearTimeout(timeoutId);

      if (error) {
        throw createProcessingError('server_error', error.message, true);
      }

      // Validate response structure
      if (!data) {
        throw createProcessingError('server_error', 'Réponse invalide du serveur', true);
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort/timeout
      if (error instanceof Error) {
        if (error.message === 'cancelled' || signal?.aborted) {
          throw createProcessingError('cancelled', 'Traitement annulé');
        }
        if (error.message === 'timeout' || error.name === 'AbortError') {
          throw createProcessingError('timeout', 'Délai dépassé (10s), réessayez', true);
        }
      }

      // Network error detection
      const errorMessage = (error as Error).message?.toLowerCase() || '';
      if (
        errorMessage.includes('network') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('connection')
      ) {
        throw createProcessingError('network_error', 'Erreur de connexion', true);
      }

      // Re-throw if already a ProcessingError
      if (error instanceof ProcessingError) {
        throw error;
      }

      // Unknown error
      throw createProcessingError('server_error', 'Erreur inattendue', true);
    }
  },

  /**
   * Converts a local file URI to base64 string
   *
   * @param uri - Local file URI (file:// or content://)
   * @returns Base64 encoded string (without data: prefix)
   */
  async uriToBase64(uri: string): Promise<string> {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: EncodingType.Base64,
    });
    return base64;
  },

  /**
   * Determines the MIME type from a file URI
   * Handles query params and hash fragments (e.g., image.jpg?token=abc)
   *
   * @param uri - File URI or path
   * @returns MIME type string (defaults to image/jpeg)
   */
  getMimeType(uri: string): string {
    // Remove query params and hash fragments
    const cleanUri = uri.split('?')[0].split('#')[0];
    const extension = cleanUri.split('.').pop()?.toLowerCase() || 'jpg';

    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      heic: 'image/heic',
      heif: 'image/heif',
      webp: 'image/webp',
    };

    return mimeTypes[extension] || 'image/jpeg';
  },

  /**
   * Combines multiple AbortSignals into a single signal
   * The combined signal aborts when ANY of the input signals abort
   *
   * @param signals - AbortSignals to combine
   * @returns Combined AbortSignal
   */
  combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();

    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    return controller.signal;
  },
};
