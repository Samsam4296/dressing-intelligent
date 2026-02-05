/**
 * Gallery Service Tests
 * Story 2.2: Import depuis Galerie
 *
 * Tests for gallery picker, format validation, and size validation.
 */

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { galleryService, type GalleryError } from '../galleryService';

// Note: expo-image-picker, expo-file-system, and @/lib/logger are mocked globally in jest.setup.js

describe('galleryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default FileSystem mock: 1MB file
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
      exists: true,
      size: 1024 * 1024, // 1MB
    });
  });

  // ============================================
  // pickImage tests
  // ============================================

  describe('pickImage', () => {
    it('returns image data on successful selection', async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [
          {
            uri: 'file:///test.jpg',
            fileName: 'test.jpg',
            width: 1920,
            height: 1080,
            mimeType: 'image/jpeg',
          },
        ],
      });

      const result = await galleryService.pickImage();

      expect(result.error).toBeNull();
      expect(result.data?.uri).toBe('file:///test.jpg');
      expect(result.data?.fileName).toBe('test.jpg');
      expect(result.data?.width).toBe(1920);
      expect(result.data?.height).toBe(1080);
    });

    it('returns cancelled error when user cancels', async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: true,
      });

      const result = await galleryService.pickImage();

      expect(result.data).toBeNull();
      expect((result.error as GalleryError)?.code).toBe('cancelled');
    });

    it('returns file_too_large error for files over 10MB', async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [
          {
            uri: 'file:///large.jpg',
            fileName: 'large.jpg',
            width: 4000,
            height: 3000,
          },
        ],
      });
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 15 * 1024 * 1024, // 15MB
      });

      const result = await galleryService.pickImage();

      expect(result.data).toBeNull();
      expect((result.error as GalleryError)?.code).toBe('file_too_large');
      expect(result.error?.message).toContain('10MB');
    });

    it('returns invalid_format error for unsupported formats', async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [
          {
            uri: 'file:///document.pdf',
            fileName: 'document.pdf',
            width: 800,
            height: 600,
          },
        ],
      });

      const result = await galleryService.pickImage();

      expect(result.data).toBeNull();
      expect((result.error as GalleryError)?.code).toBe('invalid_format');
    });

    it('returns picker_error on unexpected exception', async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockRejectedValue(
        new Error('System error')
      );

      const result = await galleryService.pickImage();

      expect(result.data).toBeNull();
      expect((result.error as GalleryError)?.code).toBe('picker_error');
    });

    it('generates filename when asset.fileName is undefined', async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [
          {
            uri: 'file:///path/to/image.jpg',
            // No fileName provided
            width: 800,
            height: 600,
          },
        ],
      });

      const result = await galleryService.pickImage();

      expect(result.error).toBeNull();
      expect(result.data?.fileName).toMatch(/^image_\d+\.jpg$/);
    });
  });

  // ============================================
  // isValidFormat tests
  // ============================================

  describe('isValidFormat', () => {
    it.each([
      ['jpg', true],
      ['jpeg', true],
      ['png', true],
      ['heic', true],
      ['heif', true],
      ['webp', true],
      ['pdf', false],
      ['gif', false],
      ['bmp', false],
      ['tiff', false],
    ])('validates %s extension as %s', (ext, expected) => {
      expect(galleryService.isValidFormat(ext)).toBe(expected);
    });
  });

  // ============================================
  // getFileExtension tests
  // ============================================

  describe('getFileExtension', () => {
    it('extracts extension from filename', () => {
      expect(galleryService.getFileExtension('photo.jpg')).toBe('jpg');
      expect(galleryService.getFileExtension('file.name.png')).toBe('png');
    });

    it('extracts extension from URI', () => {
      expect(galleryService.getFileExtension('file:///path/to/image.heic')).toBe('heic');
    });

    it('handles uppercase extensions', () => {
      expect(galleryService.getFileExtension('PHOTO.JPG')).toBe('jpg');
    });
  });

  // ============================================
  // getFileSize tests
  // ============================================

  describe('getFileSize', () => {
    it('returns FileSystem size when available', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 5 * 1024 * 1024, // 5MB
      });

      const result = await galleryService.getFileSize(
        'file:///test.jpg',
        3 * 1024 * 1024
      );

      expect(result).toBe(5 * 1024 * 1024); // FileSystem takes priority
    });

    it('falls back to assetFileSize when FileSystem fails', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockRejectedValue(
        new Error('Access denied')
      );

      const result = await galleryService.getFileSize(
        'file:///test.jpg',
        8 * 1024 * 1024
      );

      expect(result).toBe(8 * 1024 * 1024); // Fallback to asset.fileSize
    });

    it('falls back to assetFileSize when file does not exist', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: false,
      });

      const result = await galleryService.getFileSize(
        'file:///test.jpg',
        2 * 1024 * 1024
      );

      expect(result).toBe(2 * 1024 * 1024); // Fallback to asset.fileSize
    });

    it('returns 0 when both FileSystem and assetFileSize unavailable', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockRejectedValue(new Error('Error'));

      const result = await galleryService.getFileSize('file:///test.jpg', undefined);

      expect(result).toBe(0);
    });

    it('returns assetFileSize when FileSystem returns no size property', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        // No size property
      });

      const result = await galleryService.getFileSize(
        'file:///test.jpg',
        4 * 1024 * 1024
      );

      expect(result).toBe(4 * 1024 * 1024);
    });
  });
});
