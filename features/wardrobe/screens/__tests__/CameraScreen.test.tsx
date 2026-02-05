/**
 * CameraScreen Tests
 * Story 2.1: Capture Photo Camera
 *
 * Tests for camera screen with permissions and controls.
 * AC#1-4, AC#8: Permission handling, capture, flash control
 */

import { render, screen, fireEvent } from '@testing-library/react-native';
import { useCameraPermissions } from 'expo-camera';
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

// Import after mocks
import { router } from 'expo-router';
import { CameraScreen } from '../CameraScreen';

describe('CameraScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: permission granted
    (useCameraPermissions as jest.Mock).mockReturnValue([
      { granted: true, canAskAgain: true },
      jest.fn().mockResolvedValue({ granted: true, canAskAgain: true }),
    ]);
  });

  describe('Permission granted', () => {
    it('renders camera view with overlay guide', () => {
      render(<CameraScreen />);

      expect(screen.getByTestId('camera-view')).toBeTruthy();
    });

    it('renders control buttons (close, flash, flip, capture)', () => {
      render(<CameraScreen />);

      expect(screen.getByTestId('camera-close-button')).toBeTruthy();
      expect(screen.getByTestId('camera-flash-button')).toBeTruthy();
      expect(screen.getByTestId('camera-flip-button')).toBeTruthy();
      expect(screen.getByTestId('camera-capture-button')).toBeTruthy();
    });

    it('triggers haptic feedback on flash toggle (AC#8)', () => {
      render(<CameraScreen />);

      fireEvent.press(screen.getByTestId('camera-flash-button'));

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('triggers haptic feedback on flip camera', () => {
      render(<CameraScreen />);

      fireEvent.press(screen.getByTestId('camera-flip-button'));

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('closes camera on close button press', () => {
      render(<CameraScreen />);

      fireEvent.press(screen.getByTestId('camera-close-button'));

      expect(router.back).toHaveBeenCalled();
    });
  });

  describe('Permission not granted (AC#1, AC#2)', () => {
    it('shows permission request button when can ask again', () => {
      (useCameraPermissions as jest.Mock).mockReturnValue([
        { granted: false, canAskAgain: true },
        jest.fn(),
      ]);

      render(<CameraScreen />);

      expect(screen.getByTestId('camera-permission-request-button')).toBeTruthy();
      expect(screen.getByText(/Autoriser la caméra/i)).toBeTruthy();
    });

    it('shows settings button when permanently denied (AC#2)', () => {
      (useCameraPermissions as jest.Mock).mockReturnValue([
        { granted: false, canAskAgain: false },
        jest.fn(),
      ]);

      render(<CameraScreen />);

      expect(screen.getByTestId('camera-settings-button')).toBeTruthy();
      expect(screen.getByText(/Ouvrir les paramètres/i)).toBeTruthy();
    });
  });

  describe('Loading state', () => {
    it('shows loading view when permissions not yet loaded', () => {
      (useCameraPermissions as jest.Mock).mockReturnValue([null, jest.fn()]);

      render(<CameraScreen />);

      expect(screen.getByTestId('camera-loading')).toBeTruthy();
    });
  });
});
