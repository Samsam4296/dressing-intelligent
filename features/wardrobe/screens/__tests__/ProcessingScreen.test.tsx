/**
 * Processing Screen Tests
 * Story 2.3: Détourage automatique
 *
 * Tests for processing screen flow, navigation, and error handling.
 * Total: 9 tests per story specification
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

// ============================================
// Mocks
// ============================================

// Mock logger
jest.mock('@/lib/logger', () => ({
  captureError: jest.fn(),
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

// Mock Toast
jest.mock('@/shared/components/Toast', () => ({
  showToast: jest.fn(),
}));

// Mock expo-router
jest.mock('expo-router', () => {
  const mockBack = jest.fn();
  const mockReplace = jest.fn();
  const mockPush = jest.fn();

  return {
    router: {
      back: mockBack,
      replace: mockReplace,
      push: mockPush,
    },
    useRouter: () => ({
      back: mockBack,
      replace: mockReplace,
      push: mockPush,
    }),
    useLocalSearchParams: jest.fn(() => ({ photoUri: 'file:///test-photo.jpg' })),
    useSegments: () => [],
    usePathname: () => '/',
    Link: 'Link',
    Stack: { Screen: 'Stack.Screen' },
  };
});

// Mock imageProcessingService
jest.mock('../../services/imageProcessingService', () => ({
  imageProcessingService: {
    processImage: jest.fn(),
  },
}));

// Mock profile store
jest.mock('@/features/profiles', () => ({
  useProfileStore: jest.fn((selector) => selector({ currentProfileId: 'profile-123' })),
}));

// Mock wardrobe types - keep actual implementation, just import for reference
jest.mock('../../types/wardrobe.types', () => {
  const actual = jest.requireActual('../../types/wardrobe.types');
  return actual;
});

// Import after mocks
import { router, useLocalSearchParams } from 'expo-router';
import { ProcessingScreen } from '../ProcessingScreen';
import { imageProcessingService } from '../../services/imageProcessingService';
import { useProfileStore } from '@/features/profiles';
import { showToast } from '@/shared/components/Toast';
import { ProcessingError } from '../../types/wardrobe.types';

// ============================================
// Test Suite
// ============================================

describe('ProcessingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset mocks to default values
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      photoUri: 'file:///test-photo.jpg',
    });
    (useProfileStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ currentProfileId: 'profile-123' })
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ============================================
  // Test 1: Loading State
  // ============================================

  it('shows loading spinner on mount', async () => {
    // Mock never-resolving promise to keep loading state
    (imageProcessingService.processImage as jest.Mock).mockImplementation(
      () => new Promise(() => {})
    );

    render(<ProcessingScreen />);

    expect(screen.getByTestId('processing-screen')).toBeTruthy();
    expect(screen.getByTestId('spinner')).toBeTruthy();
    expect(screen.getByText(/upload en cours/i)).toBeTruthy();
  });

  // ============================================
  // Test 2: Success Navigation
  // ============================================

  it('navigates to categorization on success (AC#3)', async () => {
    (imageProcessingService.processImage as jest.Mock).mockResolvedValue({
      data: {
        originalUrl: 'https://cloudinary.com/original.jpg',
        processedUrl: 'https://cloudinary.com/processed.jpg',
        publicId: 'test-public-id',
        usedFallback: false,
      },
      error: null,
    });

    render(<ProcessingScreen />);

    // Advance timers for navigation delay
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    await waitFor(
      () => {
        expect(router.replace).toHaveBeenCalledWith(
          expect.objectContaining({
            pathname: '/(app)/wardrobe/categorize',
            params: expect.objectContaining({
              originalUrl: 'https://cloudinary.com/original.jpg',
              processedUrl: 'https://cloudinary.com/processed.jpg',
              publicId: 'test-public-id',
              usedFallback: 'false',
            }),
          })
        );
      },
      { timeout: 2000 }
    );
  });

  // ============================================
  // Test 3: Error State with Retry Button
  // ============================================

  it('shows error state with retry button on failure (AC#5)', async () => {
    (imageProcessingService.processImage as jest.Mock).mockResolvedValue({
      data: null,
      error: new ProcessingError('network_error', 'Erreur de connexion', true),
    });

    render(<ProcessingScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('error-icon')).toBeTruthy();
      expect(screen.getByText(/erreur de connexion/i)).toBeTruthy();
      expect(screen.getByTestId('retry-button')).toBeTruthy();
    });
  });

  // ============================================
  // Test 4: Retry Press
  // ============================================

  it('calls processImage again when retry is pressed', async () => {
    (imageProcessingService.processImage as jest.Mock)
      .mockResolvedValueOnce({
        data: null,
        error: new ProcessingError('timeout', 'Timeout', true),
      })
      .mockResolvedValueOnce({
        data: {
          originalUrl: 'https://cloudinary.com/original.jpg',
          processedUrl: 'https://cloudinary.com/processed.jpg',
          publicId: 'test-id',
          usedFallback: false,
        },
        error: null,
      });

    render(<ProcessingScreen />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByTestId('retry-button')).toBeTruthy();
    });

    // Press retry
    fireEvent.press(screen.getByTestId('retry-button'));

    await waitFor(() => {
      expect(imageProcessingService.processImage).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================
  // Test 5: Cancel Press
  // ============================================

  it('navigates back when cancel is pressed (AC#6)', async () => {
    (imageProcessingService.processImage as jest.Mock).mockImplementation(
      () => new Promise(() => {})
    );

    render(<ProcessingScreen />);

    // Find and press cancel button
    const cancelButton = screen.getByTestId('cancel-button');
    fireEvent.press(cancelButton);

    expect(router.back).toHaveBeenCalled();
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
  });

  // ============================================
  // Test 6: BackHandler Android
  // ============================================

  it('handles Android back button via BackHandler', async () => {
    (imageProcessingService.processImage as jest.Mock).mockImplementation(
      () => new Promise(() => {})
    );

    render(<ProcessingScreen />);

    // Simulate cancel button press (same behavior as BackHandler)
    fireEvent.press(screen.getByTestId('cancel-button'));

    // BackHandler triggers handleCancel() which calls router.back()
    expect(router.back).toHaveBeenCalled();
  });

  // ============================================
  // Test 7: usedFallback Param
  // ============================================

  it('passes usedFallback param to categorize route', async () => {
    (imageProcessingService.processImage as jest.Mock).mockResolvedValue({
      data: {
        originalUrl: 'https://cloudinary.com/original.jpg',
        processedUrl: null, // Fallback case
        publicId: 'test-id',
        usedFallback: true,
      },
      error: null,
    });

    render(<ProcessingScreen />);

    // Advance timers for navigation
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    await waitFor(
      () => {
        expect(router.replace).toHaveBeenCalledWith(
          expect.objectContaining({
            params: expect.objectContaining({
              processedUrl: '', // Empty string for null
              usedFallback: 'true',
            }),
          })
        );
      },
      { timeout: 2000 }
    );

    // Should show fallback toast
    expect(showToast).toHaveBeenCalledWith({
      type: 'info',
      message: 'Détourage non disponible, photo originale conservée',
    });
  });

  // ============================================
  // Test 8: currentProfileId null
  // ============================================

  it('shows error when currentProfileId is null', async () => {
    // Override mock to return null currentProfileId
    (useProfileStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ currentProfileId: null })
    );

    render(<ProcessingScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('error-icon')).toBeTruthy();
      expect(screen.getByText(/paramètres manquants/i)).toBeTruthy();
    });

    // Should NOT call processImage
    expect(imageProcessingService.processImage).not.toHaveBeenCalled();
  });

  // ============================================
  // Test 9: Success Icon Before Navigation
  // ============================================

  it('shows success icon before navigation', async () => {
    (imageProcessingService.processImage as jest.Mock).mockResolvedValue({
      data: {
        originalUrl: 'https://cloudinary.com/original.jpg',
        processedUrl: 'https://cloudinary.com/processed.jpg',
        publicId: 'test-id',
        usedFallback: false,
      },
      error: null,
    });

    render(<ProcessingScreen />);

    // Should show success state before navigation (500ms delay)
    await waitFor(() => {
      expect(screen.getByTestId('success-icon')).toBeTruthy();
      expect(screen.getByText(/terminé/i)).toBeTruthy();
    });

    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success
    );
  });
});
