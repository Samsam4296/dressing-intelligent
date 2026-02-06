/**
 * Storage Service Tests
 * Story 2.7: Upload et Stockage Photo
 *
 * 4 consolidated tests covering:
 * - Happy path download + upload
 * - Download failure handling
 * - Signed URL creation with 15min expiry
 * - Temp file cleanup on error
 */

import { downloadAsync, readAsStringAsync, deleteAsync } from 'expo-file-system';
import { storageService } from '../storageService';

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  cacheDirectory: 'file:///cache/',
  downloadAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
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

describe('storageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('downloads and uploads image successfully', async () => {
    // Arrange
    (downloadAsync as jest.Mock).mockResolvedValue({
      status: 200,
      uri: 'file:///cache/upload_123.jpg',
    });
    (readAsStringAsync as jest.Mock).mockResolvedValue('base64data');
    (deleteAsync as jest.Mock).mockResolvedValue(undefined);
    mockUpload.mockResolvedValue({ error: null });

    // Act
    const result = await storageService.downloadAndUploadImage(
      'https://cloudinary.com/image.jpg',
      'user-123'
    );

    // Assert
    expect(result.error).toBeNull();
    expect(result.data).toMatch(/^user-123\/\d+_[a-z0-9]+\.jpg$/);
    expect(downloadAsync).toHaveBeenCalledWith(
      'https://cloudinary.com/image.jpg',
      expect.stringContaining('upload_')
    );
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-123\//),
      expect.any(ArrayBuffer),
      { contentType: 'image/jpeg', cacheControl: '3600', upsert: false }
    );
  });

  it('returns error when download fails', async () => {
    // Arrange
    (downloadAsync as jest.Mock).mockResolvedValue({
      status: 404,
      uri: 'file:///cache/upload_123.jpg',
    });
    (deleteAsync as jest.Mock).mockResolvedValue(undefined);

    // Act
    const result = await storageService.downloadAndUploadImage(
      'https://cloudinary.com/missing.jpg',
      'user-123'
    );

    // Assert
    expect(result.data).toBeNull();
    expect(result.error).toBeDefined();
    expect(result.error!.message).toContain('Download failed');
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
    (downloadAsync as jest.Mock).mockResolvedValue({
      status: 200,
      uri: 'file:///cache/upload_123.jpg',
    });
    (readAsStringAsync as jest.Mock).mockResolvedValue('base64data');
    (deleteAsync as jest.Mock).mockResolvedValue(undefined);
    mockUpload.mockResolvedValue({ error: new Error('Upload quota exceeded') });

    // Act
    const result = await storageService.downloadAndUploadImage(
      'https://cloudinary.com/image.jpg',
      'user-123'
    );

    // Assert
    expect(result.data).toBeNull();
    expect(result.error).toBeDefined();
    // Verify temp file cleanup was called
    expect(deleteAsync).toHaveBeenCalledWith(expect.stringContaining('upload_'), {
      idempotent: true,
    });
  });
});
