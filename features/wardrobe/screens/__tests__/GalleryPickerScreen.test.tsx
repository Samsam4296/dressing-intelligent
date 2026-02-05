/**
 * Gallery Picker Screen Tests
 * Story 2.2: Import depuis Galerie
 *
 * Tests for gallery picker screen flow, navigation, and error handling.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

// Mock logger
jest.mock('@/lib/logger', () => ({
  captureError: jest.fn(),
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

// Mock Toast
jest.mock('@/shared/components/Toast', () => ({
  showToast: jest.fn(),
}));

// Mock expo-router - define mocks inside factory for proper hoisting
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
    useLocalSearchParams: jest.fn(() => ({})),
    useSegments: () => [],
    usePathname: () => '/',
    Link: 'Link',
    Stack: { Screen: 'Stack.Screen' },
  };
});

// Mock galleryService - keep GalleryError class, mock only service methods
jest.mock('../../services/galleryService', () => {
  const actual = jest.requireActual('../../services/galleryService');
  return {
    ...actual,
    galleryService: {
      pickImage: jest.fn(),
    },
  };
});

// Import after mocks
import { router } from 'expo-router';
import { GalleryPickerScreen } from '../GalleryPickerScreen';
import { galleryService, GalleryError } from '../../services/galleryService';
import { showToast } from '@/shared/components/Toast';

describe('GalleryPickerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ============================================
  // Basic Rendering
  // ============================================

  it('renders loading state initially', async () => {
    // Make pickImage return a pending promise
    (galleryService.pickImage as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<GalleryPickerScreen />);

    expect(screen.getByTestId('gallery-picker-screen')).toBeTruthy();
    expect(screen.getByTestId('gallery-loading')).toBeTruthy();
    expect(screen.getByText(/sélectionnez une image/i)).toBeTruthy();
  });

  // ============================================
  // Happy Path - Successful Selection
  // ============================================

  it('calls pickImage on mount (AC#1)', async () => {
    (galleryService.pickImage as jest.Mock).mockResolvedValue({
      data: null,
      error: new GalleryError('cancelled', 'Cancelled'),
    });

    render(<GalleryPickerScreen />);

    await waitFor(() => {
      expect(galleryService.pickImage).toHaveBeenCalledTimes(1);
    });
  });

  it('navigates to preview on successful selection (AC#4)', async () => {
    (galleryService.pickImage as jest.Mock).mockResolvedValue({
      data: {
        uri: 'file:///selected-image.jpg',
        fileName: 'selected-image.jpg',
        fileSize: 1024 * 1024,
        width: 1920,
        height: 1080,
        mimeType: 'image/jpeg',
      },
      error: null,
    });

    render(<GalleryPickerScreen />);

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/(app)/wardrobe/preview',
        params: { photoUri: 'file:///selected-image.jpg' },
      });
    });
  });

  it('triggers haptic feedback on successful selection', async () => {
    (galleryService.pickImage as jest.Mock).mockResolvedValue({
      data: {
        uri: 'file:///test.jpg',
        fileName: 'test.jpg',
        fileSize: 1024,
        width: 800,
        height: 600,
        mimeType: 'image/jpeg',
      },
      error: null,
    });

    render(<GalleryPickerScreen />);

    await waitFor(() => {
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });
  });

  // ============================================
  // Cancel Handling (AC#5)
  // ============================================

  it('navigates back silently on cancel (AC#5)', async () => {
    (galleryService.pickImage as jest.Mock).mockResolvedValue({
      data: null,
      error: new GalleryError('cancelled', 'Sélection annulée'),
    });

    render(<GalleryPickerScreen />);

    await waitFor(() => {
      expect(router.back).toHaveBeenCalled();
    });

    // No toast should be shown for cancellation
    expect(showToast).not.toHaveBeenCalled();
  });

  // ============================================
  // Error Handling (AC#2, AC#3)
  // ============================================

  it('shows toast and retries on file_too_large error (AC#3)', async () => {
    let callCount = 0;
    (galleryService.pickImage as jest.Mock).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          data: null,
          error: new GalleryError('file_too_large', 'Image trop volumineuse (15MB). Maximum: 10MB'),
        };
      }
      // Second call: user cancels
      return {
        data: null,
        error: new GalleryError('cancelled', 'Cancelled'),
      };
    });

    render(<GalleryPickerScreen />);

    // Wait for first call
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        type: 'error',
        message: 'Image trop volumineuse (15MB). Maximum: 10MB',
      });
    });

    // Error haptic feedback
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);

    // Advance timer to trigger retry
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    // Wait for second call
    await waitFor(() => {
      expect(galleryService.pickImage).toHaveBeenCalledTimes(2);
    });
  });

  it('shows toast and retries on invalid_format error (AC#2)', async () => {
    let callCount = 0;
    (galleryService.pickImage as jest.Mock).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          data: null,
          error: new GalleryError(
            'invalid_format',
            'Format non supporté. Formats acceptés: jpg, jpeg, png, heic, heif, webp'
          ),
        };
      }
      return {
        data: null,
        error: new GalleryError('cancelled', 'Cancelled'),
      };
    });

    render(<GalleryPickerScreen />);

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        type: 'error',
        message: 'Format non supporté. Formats acceptés: jpg, jpeg, png, heic, heif, webp',
      });
    });
  });

  it('shows error and navigates back on picker_error', async () => {
    (galleryService.pickImage as jest.Mock).mockResolvedValue({
      data: null,
      error: new GalleryError('picker_error', 'Erreur lors de la sélection'),
    });

    render(<GalleryPickerScreen />);

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        type: 'error',
        message: 'Erreur lors de la sélection',
      });
    });

    // Check error state is displayed
    expect(screen.getByText(/erreur de sélection/i)).toBeTruthy();

    // Advance timer for delayed navigation
    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    await waitFor(() => {
      expect(router.back).toHaveBeenCalled();
    });
  });

  // ============================================
  // Accessibility
  // ============================================

  it('has proper accessibility attributes', async () => {
    (galleryService.pickImage as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<GalleryPickerScreen />);

    const container = screen.getByTestId('gallery-picker-screen');
    expect(container.props.accessibilityLabel).toBe('Écran de sélection galerie');
  });
});
