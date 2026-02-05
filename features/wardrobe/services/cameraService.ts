/**
 * Camera Service
 * Story 2.1: Capture Photo Camera
 *
 * Handles camera permissions.
 * CRITICAL: All methods return { data, error } format per project-context.md
 * CRITICAL: Use captureError (NEVER console.log) per project-context.md
 */

import { Camera } from 'expo-camera';
import * as Linking from 'expo-linking';
import { captureError } from '@/lib/logger';
import type { ApiResponse } from '@/types';

/**
 * Camera permission result
 */
export interface PermissionResult {
  granted: boolean;
  canAskAgain: boolean;
}

/**
 * Camera service with expo-camera integration
 * AC#1, AC#2: Permission handling
 */
export const cameraService = {
  /**
   * Check current camera permission status
   * AC#1: Permission status check
   */
  async checkPermission(): Promise<ApiResponse<PermissionResult>> {
    try {
      const status = await Camera.getCameraPermissionsAsync();
      return {
        data: { granted: status.granted, canAskAgain: status.canAskAgain },
        error: null,
      };
    } catch (error) {
      captureError(error, 'wardrobe', 'cameraService.checkPermission');
      return { data: null, error: error as Error };
    }
  },

  /**
   * Request camera permission from user
   * AC#1: Permission request flow
   */
  async requestPermission(): Promise<ApiResponse<PermissionResult>> {
    try {
      const status = await Camera.requestCameraPermissionsAsync();
      return {
        data: { granted: status.granted, canAskAgain: status.canAskAgain },
        error: null,
      };
    } catch (error) {
      captureError(error, 'wardrobe', 'cameraService.requestPermission');
      return { data: null, error: error as Error };
    }
  },

  /**
   * Open system settings for app permissions
   * AC#2: Redirect to settings when permission permanently denied
   */
  openSystemSettings(): void {
    Linking.openSettings();
  },
};
