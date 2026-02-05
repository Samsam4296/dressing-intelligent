/**
 * Camera Service Tests
 * Story 2.1: Capture Photo Camera
 *
 * Tests for camera permissions.
 * AC#1, AC#2: Permission handling
 */

import { Camera } from 'expo-camera';
import * as Linking from 'expo-linking';
import { cameraService } from '../cameraService';

// Mock logger module
jest.mock('@/lib/logger', () => ({
  captureError: jest.fn(),
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('cameraService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkPermission', () => {
    it('returns granted:true when permission is granted (AC#1)', async () => {
      (Camera.getCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        granted: true,
        canAskAgain: true,
      });

      const result = await cameraService.checkPermission();

      expect(result.data?.granted).toBe(true);
      expect(result.data?.canAskAgain).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns granted:false when permission denied', async () => {
      (Camera.getCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        granted: false,
        canAskAgain: true,
      });

      const result = await cameraService.checkPermission();

      expect(result.data?.granted).toBe(false);
      expect(result.data?.canAskAgain).toBe(true);
    });

    it('returns canAskAgain:false when permanently denied (AC#2)', async () => {
      (Camera.getCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        granted: false,
        canAskAgain: false,
      });

      const result = await cameraService.checkPermission();

      expect(result.data?.granted).toBe(false);
      expect(result.data?.canAskAgain).toBe(false);
    });

    it('returns error when permission check fails', async () => {
      const mockError = new Error('Permission check failed');
      (Camera.getCameraPermissionsAsync as jest.Mock).mockRejectedValue(mockError);

      const result = await cameraService.checkPermission();

      expect(result.data).toBeNull();
      expect(result.error).toBe(mockError);
    });
  });

  describe('requestPermission', () => {
    it('requests and returns new permission status (AC#1)', async () => {
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        granted: true,
        canAskAgain: true,
      });

      const result = await cameraService.requestPermission();

      expect(Camera.requestCameraPermissionsAsync).toHaveBeenCalled();
      expect(result.data?.granted).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns denied status when user denies permission', async () => {
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        granted: false,
        canAskAgain: false,
      });

      const result = await cameraService.requestPermission();

      expect(result.data?.granted).toBe(false);
      expect(result.data?.canAskAgain).toBe(false);
    });

    it('returns error when request fails', async () => {
      const mockError = new Error('Request failed');
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockRejectedValue(mockError);

      const result = await cameraService.requestPermission();

      expect(result.data).toBeNull();
      expect(result.error).toBe(mockError);
    });
  });

  describe('openSystemSettings', () => {
    it('opens system settings (AC#2)', () => {
      cameraService.openSystemSettings();

      expect(Linking.openSettings).toHaveBeenCalled();
    });
  });
});
