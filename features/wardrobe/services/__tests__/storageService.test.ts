/**
 * Storage Service Tests
 * Story 2.7: Upload et Stockage Photo
 *
 * 7 consolidated tests covering:
 * - Happy path download + upload
 * - C-1: SSRF protection (rejects non-Cloudinary URLs)
 * - H-2: Content-Type validation
 * - Download failure handling (generic error)
 * - Signed URL creation with 15min expiry
 * - Temp file cleanup on error
 * - Storage file deletion
 */

import * as FileSystem from 'expo-file-system';
import { storageService } from '../storageService';

// Mock crypto.getRandomValues (L-1: used by generateFileName)
Object.defineProperty(globalThis, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = i + 1;
      return arr;
    },
  },
});

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  cacheDirectory: 'file:///cache/',
  downloadAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));

// Mock base64-arraybuffer
jest.mock('base64-arraybuffer', () => ({
  decode: jest.fn(() => new ArrayBuffer(8)),
}));

// Mock supabase
const mockUpload = jest.fn();
const mockCreateSignedUrl = jest.fn();
const mockRemove = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({
        upload: mockUpload,
        createSignedUrl: mockCreateSignedUrl,
        remove: mockRemove,
      })),
    },
  },
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  captureError: jest.fn(),
}));

const VALID_CLOUDINARY_URL = 'https://res.cloudinary.com/dnb7svbjd/image/upload/v1/test.jpg';

describe('storageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('downloads and uploads image successfully', async () => {
    // Arrange
    (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({
      status: 200,
      uri: 'file:///cache/upload_123.jpg',
      headers: { 'content-type': 'image/png' },
    });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('base64data');
    (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
    mockUpload.mockResolvedValue({ error: null });

    // Act
    const result = await storageService.downloadAndUploadImage(VALID_CLOUDINARY_URL, 'user-123');

    // Assert
    expect(result.error).toBeNull();
    expect(result.data).toMatch(/^user-123\/\d+_[a-z0-9]+\.jpg$/);
    expect(FileSystem.downloadAsync).toHaveBeenCalledWith(
      VALID_CLOUDINARY_URL,
      expect.stringContaining('upload_')
    );
    // H-2: content-type from response headers is passed through
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-123\//),
      expect.any(ArrayBuffer),
      { contentType: 'image/png', cacheControl: '3600', upsert: false }
    );
  });

  it('rejects non-Cloudinary URLs (C-1: anti-SSRF)', async () => {
    // Act - HTTP URL
    const httpResult = await storageService.downloadAndUploadImage(
      'http://res.cloudinary.com/image.jpg',
      'user-123'
    );
    expect(httpResult.data).toBeNull();
    expect(httpResult.error!.message).toBe('Invalid source URL');

    // Act - wrong host
    const wrongHostResult = await storageService.downloadAndUploadImage(
      'https://evil.com/image.jpg',
      'user-123'
    );
    expect(wrongHostResult.data).toBeNull();
    expect(wrongHostResult.error!.message).toBe('Invalid source URL');

    // Act - invalid URL
    const invalidResult = await storageService.downloadAndUploadImage('not-a-url', 'user-123');
    expect(invalidResult.data).toBeNull();
    expect(invalidResult.error!.message).toBe('Invalid source URL');

    // Verify no download attempts
    expect(FileSystem.downloadAsync).not.toHaveBeenCalled();
  });

  it('rejects invalid content-type from download (H-2)', async () => {
    // Arrange
    (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({
      status: 200,
      uri: 'file:///cache/upload_123.jpg',
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
    (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);

    // Act
    const result = await storageService.downloadAndUploadImage(VALID_CLOUDINARY_URL, 'user-123');

    // Assert
    expect(result.data).toBeNull();
    expect(result.error!.message).toBe('Invalid image type');
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('returns error when download fails (M-1: generic message)', async () => {
    // Arrange
    (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({
      status: 404,
      uri: 'file:///cache/upload_123.jpg',
    });
    (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);

    // Act
    const result = await storageService.downloadAndUploadImage(VALID_CLOUDINARY_URL, 'user-123');

    // Assert
    expect(result.data).toBeNull();
    expect(result.error).toBeDefined();
    // M-1: Generic error - no HTTP status code leaked
    expect(result.error!.message).toBe('Image download failed');
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('creates signed URL with 15min expiry', async () => {
    // Arrange
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.supabase.co/signed/path?token=abc' },
      error: null,
    });

    // Act
    const result = await storageService.createSignedUrl('user-123/image.jpg');

    // Assert
    expect(result.error).toBeNull();
    expect(result.data).toBe('https://storage.supabase.co/signed/path?token=abc');
    expect(mockCreateSignedUrl).toHaveBeenCalledWith('user-123/image.jpg', 900);
  });

  it('cleans up temp files even on error', async () => {
    // Arrange
    (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({
      status: 200,
      uri: 'file:///cache/upload_123.jpg',
    });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('base64data');
    (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
    mockUpload.mockResolvedValue({ error: new Error('Upload quota exceeded') });

    // Act
    const result = await storageService.downloadAndUploadImage(VALID_CLOUDINARY_URL, 'user-123');

    // Assert
    expect(result.data).toBeNull();
    expect(result.error).toBeDefined();
    // Verify temp file cleanup was called
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(expect.stringContaining('upload_'), {
      idempotent: true,
    });
  });

  it('deletes file from storage (non-blocking)', async () => {
    // Arrange
    mockRemove.mockResolvedValue({ error: null });

    // Act
    await storageService.deleteFromStorage('user-123/image.jpg');

    // Assert
    expect(mockRemove).toHaveBeenCalledWith(['user-123/image.jpg']);
  });
});
