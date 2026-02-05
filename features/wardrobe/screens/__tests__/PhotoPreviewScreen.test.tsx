/**
 * PhotoPreviewScreen Tests
 * Story 2.1: Capture Photo Camera
 *
 * Tests for photo preview with retake/use actions.
 * AC#5: Preview screen with "Reprendre" and "Utiliser" buttons
 * AC#6: Photo compression before processing flow
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import * as ImageManipulator from 'expo-image-manipulator';
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
    useLocalSearchParams: jest.fn(() => ({ photoUri: 'file:///test-photo.jpg' })),
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
    useSegments: () => [],
    usePathname: () => '/',
    Link: 'Link',
    Stack: { Screen: 'Stack.Screen' },
  };
});

// Import after mocks
import { router, useLocalSearchParams } from 'expo-router';
import { PhotoPreviewScreen } from '../PhotoPreviewScreen';

describe('PhotoPreviewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ photoUri: 'file:///test-photo.jpg' });
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: 'file:///compressed-photo.jpg',
    });
  });

  describe('Rendering', () => {
    it('renders preview image', () => {
      render(<PhotoPreviewScreen />);

      expect(screen.getByTestId('preview-image')).toBeTruthy();
    });

    it('renders Reprendre button (AC#5)', () => {
      render(<PhotoPreviewScreen />);

      expect(screen.getByTestId('preview-retake-button')).toBeTruthy();
      expect(screen.getByText(/Reprendre/i)).toBeTruthy();
    });

    it('renders Utiliser button (AC#5)', () => {
      render(<PhotoPreviewScreen />);

      expect(screen.getByTestId('preview-use-button')).toBeTruthy();
      expect(screen.getByText(/Utiliser/i)).toBeTruthy();
    });
  });

  describe('Retake action', () => {
    it('navigates back on Reprendre press', () => {
      render(<PhotoPreviewScreen />);

      fireEvent.press(screen.getByTestId('preview-retake-button'));

      expect(router.back).toHaveBeenCalled();
    });

    it('triggers haptic feedback on Reprendre press', () => {
      render(<PhotoPreviewScreen />);

      fireEvent.press(screen.getByTestId('preview-retake-button'));

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });
  });

  describe('Use photo action (AC#6)', () => {
    it('compresses photo with correct settings', async () => {
      render(<PhotoPreviewScreen />);

      fireEvent.press(screen.getByTestId('preview-use-button'));

      await waitFor(() => {
        expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
          'file:///test-photo.jpg',
          [{ resize: { width: 2048 } }],
          expect.objectContaining({
            compress: 0.8,
            format: ImageManipulator.SaveFormat.JPEG,
          })
        );
      });
    });

    it('navigates to process flow after compression', async () => {
      render(<PhotoPreviewScreen />);

      fireEvent.press(screen.getByTestId('preview-use-button'));

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith({
          pathname: '/wardrobe/process',
          params: { photoUri: 'file:///compressed-photo.jpg' },
        });
      });
    });

    it('triggers haptic feedback on Utiliser press', async () => {
      render(<PhotoPreviewScreen />);

      fireEvent.press(screen.getByTestId('preview-use-button'));

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('shows loading indicator during compression', async () => {
      // Make compression take time
      (ImageManipulator.manipulateAsync as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ uri: 'compressed.jpg' }), 100))
      );

      render(<PhotoPreviewScreen />);

      fireEvent.press(screen.getByTestId('preview-use-button'));

      // Loading indicator should be visible
      expect(screen.getByTestId('preview-loading')).toBeTruthy();
    });
  });

  describe('No photo URI edge case', () => {
    it('shows no-photo message when URI missing', () => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({ photoUri: undefined });

      render(<PhotoPreviewScreen />);

      expect(screen.getByTestId('preview-no-photo')).toBeTruthy();
      expect(screen.getByText(/Photo non disponible/i)).toBeTruthy();
    });
  });
});
