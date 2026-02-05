/**
 * Image Processing Service Tests
 * Story 2.3: Détourage automatique
 *
 * Tests for Edge Function integration, timeout, retry, and fallback logic.
 * Total: 11 tests per story specification
 */

import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { imageProcessingService } from '../imageProcessingService';
import { ProcessingError } from '../../types/wardrobe.types';

// ============================================
// Mocks
// ============================================

jest.mock('expo-file-system');
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({ uri: 'compressed-file:///test-photo.jpg' }),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn() },
    functions: { invoke: jest.fn() },
  },
}));
jest.mock('@/lib/logger', () => ({
  captureError: jest.fn(),
}));

// ============================================
// Test Suite
// ============================================

describe('imageProcessingService', () => {
  const mockSession = {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
  };

  const mockSuccessResponse = {
    success: true,
    data: {
      originalUrl: 'https://res.cloudinary.com/demo/image/upload/v1234567890/original.jpg',
      processedUrl: 'https://res.cloudinary.com/demo/image/upload/e_background_removal/v1234567890/processed.jpg',
      publicId: 'clothes/user-123/profile-456/1234567890',
    },
  };

  const mockFallbackResponse = {
    success: true,
    data: {
      originalUrl: 'https://res.cloudinary.com/demo/image/upload/v1234567890/original.jpg',
      processedUrl: null, // Background removal failed
      publicId: 'clothes/user-123/profile-456/1234567890',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default mocks
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('base64-image-data-here');
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ============================================
  // Test 1: Success Case
  // ============================================

  describe('processImage', () => {
    it('successfully processes image and returns URLs with usedFallback false', async () => {
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: mockSuccessResponse,
        error: null,
      });

      const resultPromise = imageProcessingService.processImage({
        photoUri: 'file:///test-photo.jpg',
        profileId: 'profile-123',
      });

      // Fast-forward timers
      jest.runAllTimers();

      const result = await resultPromise;

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.originalUrl).toBe(mockSuccessResponse.data.originalUrl);
      expect(result.data?.processedUrl).toBe(mockSuccessResponse.data.processedUrl);
      expect(result.data?.publicId).toBe(mockSuccessResponse.data.publicId);
      expect(result.data?.usedFallback).toBe(false);

      // Verify Edge Function was called with correct params
      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'process-clothing-image',
        expect.objectContaining({
          body: {
            imageBase64: 'base64-image-data-here',
            profileId: 'profile-123',
            mimeType: 'image/jpeg',
            idempotencyKey: expect.any(String), // Dynamically generated
          },
        })
      );
    });

    // ============================================
    // Test 2: Timeout Handling
    // ============================================

    it('returns timeout error when AbortError is thrown', async () => {
      // Mock AbortError to simulate timeout (AbortController.abort() throws AbortError)
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      (supabase.functions.invoke as jest.Mock).mockRejectedValue(abortError);

      const resultPromise = imageProcessingService.processImage({
        photoUri: 'file:///test-photo.jpg',
        profileId: 'profile-123',
      });

      jest.runAllTimers();

      const result = await resultPromise;

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(ProcessingError);
      expect((result.error as ProcessingError).code).toBe('timeout');
      // After retry exhausted, retryable should be false
      expect((result.error as ProcessingError).retryable).toBe(false);
    });

    // ============================================
    // Test 3: Network Error
    // ============================================

    it('handles network error with retry', async () => {
      // First call fails with network error, retry not exhausted
      (supabase.functions.invoke as jest.Mock).mockRejectedValue(
        new Error('network request failed')
      );

      const resultPromise = imageProcessingService.processImage({
        photoUri: 'file:///test-photo.jpg',
        profileId: 'profile-123',
      });

      jest.runAllTimers();

      const result = await resultPromise;

      // After MAX_RETRIES (1) + initial = 2 attempts, should return network_error
      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(ProcessingError);
      expect((result.error as ProcessingError).code).toBe('network_error');
      // Verify 2 attempts were made (initial + 1 retry)
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(2);
    });

    // ============================================
    // Test 4: Fallback When processedUrl is null
    // ============================================

    it('handles fallback when processedUrl is null (background removal failed)', async () => {
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: mockFallbackResponse,
        error: null,
      });

      const resultPromise = imageProcessingService.processImage({
        photoUri: 'file:///test-photo.jpg',
        profileId: 'profile-123',
      });

      jest.runAllTimers();

      const result = await resultPromise;

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.processedUrl).toBeNull();
      expect(result.data?.usedFallback).toBe(true);
      expect(result.data?.originalUrl).toBe(mockFallbackResponse.data.originalUrl);
    });

    // ============================================
    // Test 5: Auth Error
    // ============================================

    it('returns auth_error when session is expired', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: new Error('Session expired'),
      });

      const resultPromise = imageProcessingService.processImage({
        photoUri: 'file:///test-photo.jpg',
        profileId: 'profile-123',
      });

      jest.runAllTimers();

      const result = await resultPromise;

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(ProcessingError);
      expect((result.error as ProcessingError).code).toBe('auth_error');
      // Auth errors are not retryable
      expect((result.error as ProcessingError).retryable).toBe(false);
    });

    // ============================================
    // Test 6: Cancelled
    // ============================================

    it('returns cancelled error when aborted before start', async () => {
      const abortController = new AbortController();
      abortController.abort();

      const result = await imageProcessingService.processImage({
        photoUri: 'file:///test-photo.jpg',
        profileId: 'profile-123',
        signal: abortController.signal,
      });

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(ProcessingError);
      expect((result.error as ProcessingError).code).toBe('cancelled');
    });

    // ============================================
    // Test 7: Retry Success
    // ============================================

    it('succeeds on retry after initial network failure', async () => {
      // First call fails, second succeeds
      (supabase.functions.invoke as jest.Mock)
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce({
          data: mockSuccessResponse,
          error: null,
        });

      const resultPromise = imageProcessingService.processImage({
        photoUri: 'file:///test-photo.jpg',
        profileId: 'profile-123',
      });

      jest.runAllTimers();

      const result = await resultPromise;

      // Retry should succeed
      expect(result.error).toBeNull();
      expect(result.data?.originalUrl).toBe(mockSuccessResponse.data.originalUrl);
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(2);
    });

    // ============================================
    // Test 8: Retry Exhausted
    // ============================================

    it('returns error after retry exhausted (2 failures)', async () => {
      // Both attempts fail
      (supabase.functions.invoke as jest.Mock)
        .mockRejectedValueOnce(new Error('network error'))
        .mockRejectedValueOnce(new Error('network error'));

      const resultPromise = imageProcessingService.processImage({
        photoUri: 'file:///test-photo.jpg',
        profileId: 'profile-123',
      });

      jest.runAllTimers();

      const result = await resultPromise;

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(ProcessingError);
      expect((result.error as ProcessingError).code).toBe('network_error');
      // After retry exhausted, retryable should be false
      expect((result.error as ProcessingError).retryable).toBe(false);
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================
  // Test 9 & 10: combineAbortSignals
  // ============================================

  describe('combineAbortSignals', () => {
    it('aborts combined signal when first signal aborts', () => {
      const controller1 = new AbortController();
      const controller2 = new AbortController();

      const combined = imageProcessingService.combineAbortSignals(
        controller1.signal,
        controller2.signal
      );

      expect(combined.aborted).toBe(false);

      controller1.abort();

      expect(combined.aborted).toBe(true);
    });

    it('returns already aborted signal if input is pre-aborted', () => {
      const controller1 = new AbortController();
      controller1.abort(); // Pre-abort

      const controller2 = new AbortController();

      const combined = imageProcessingService.combineAbortSignals(
        controller1.signal,
        controller2.signal
      );

      expect(combined.aborted).toBe(true);
    });
  });

  // ============================================
  // Test 11: getMimeType with various URIs
  // ============================================

  describe('getMimeType', () => {
    it.each([
      ['file:///photo.jpg', 'image/jpeg'],
      ['file:///photo.jpeg', 'image/jpeg'],
      ['file:///photo.png', 'image/png'],
      ['file:///photo.heic', 'image/heic'],
      ['file:///photo.heif', 'image/heif'],
      ['file:///photo.webp', 'image/webp'],
      ['file:///photo.unknown', 'image/jpeg'], // Default
      ['file:///photo.jpg?token=abc123', 'image/jpeg'], // Query params
      ['file:///photo.png#section', 'image/png'], // Hash fragment
      ['https://cdn.example.com/image.webp?w=200&h=200', 'image/webp'], // URL with multiple params
    ])('returns correct MIME type for %s', (uri, expected) => {
      expect(imageProcessingService.getMimeType(uri)).toBe(expected);
    });
  });
});
