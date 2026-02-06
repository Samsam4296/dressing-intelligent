import { render, screen, fireEvent } from '@testing-library/react-native';
import { Alert, BackHandler } from 'react-native';

const mockUseLocalSearchParams = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), dismissAll: jest.fn() },
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));
jest.mock('expo-haptics');
jest.mock('@sentry/react-native', () => ({
  captureMessage: jest.fn(),
  captureException: jest.fn(),
}));
jest.spyOn(Alert, 'alert');

// Global BackHandler mock to prevent cleanup errors in test renderer
const mockRemove = jest.fn();
let capturedBackHandler: (() => boolean | null | undefined) | undefined;
jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
  capturedBackHandler = handler;
  return { remove: mockRemove };
});

import { ColorSelectionScreen } from '../ColorSelectionScreen';
import { router } from 'expo-router';

const defaultParams = {
  originalUrl: 'https://cloudinary.com/original.jpg',
  processedUrl: 'https://cloudinary.com/processed.jpg',
  publicId: 'test-id',
  category: 'haut',
};

describe('ColorSelectionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue(defaultParams);
  });

  it('renders screen with image and category badge', () => {
    render(<ColorSelectionScreen />);

    expect(screen.getByTestId('color-selection-screen')).toBeTruthy();
    expect(screen.getByTestId('clothing-image')).toBeTruthy();
    expect(screen.getByTestId('category-badge')).toBeTruthy();
    expect(screen.getByText('Haut')).toBeTruthy();
  });

  it('disables confirm button when no color selected', () => {
    render(<ColorSelectionScreen />);

    const confirmButton = screen.getByTestId('confirm-button');
    expect(confirmButton.props.accessibilityState.disabled).toBe(true);
    expect(screen.getByText('Sélectionnez une couleur')).toBeTruthy();
  });

  it('enables confirm button when color selected', () => {
    render(<ColorSelectionScreen />);

    fireEvent.press(screen.getByTestId('color-bleu'));

    const confirmButton = screen.getByTestId('confirm-button');
    expect(confirmButton.props.accessibilityState.disabled).toBe(false);
    expect(screen.getByText('Confirmer')).toBeTruthy();
  });

  it('navigates to save screen with all params on confirm', () => {
    render(<ColorSelectionScreen />);

    fireEvent.press(screen.getByTestId('color-rouge'));
    fireEvent.press(screen.getByTestId('confirm-button'));

    expect(router.push).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/(app)/wardrobe/save',
        params: expect.objectContaining({
          originalUrl: defaultParams.originalUrl,
          processedUrl: defaultParams.processedUrl,
          publicId: defaultParams.publicId,
          category: 'haut',
          color: 'rouge',
        }),
      })
    );
  });

  it('shows confirmation dialog on cancel button', () => {
    render(<ColorSelectionScreen />);

    fireEvent.press(screen.getByTestId('cancel-button'));

    expect(Alert.alert).toHaveBeenCalledWith(
      expect.stringContaining('Annuler'),
      expect.any(String),
      expect.any(Array)
    );
  });

  it('shows error state when params missing', () => {
    mockUseLocalSearchParams.mockReturnValue({
      originalUrl: '',
      processedUrl: '',
      publicId: '',
      category: '',
    });

    render(<ColorSelectionScreen />);

    expect(screen.getByText(/paramètres manquants/i)).toBeTruthy();
    expect(screen.getByTestId('error-back-button')).toBeTruthy();
  });

  it('triggers confirmation dialog on Android back button (BackHandler)', () => {
    render(<ColorSelectionScreen />);

    expect(BackHandler.addEventListener).toHaveBeenCalledWith(
      'hardwareBackPress',
      expect.any(Function)
    );

    // Simulate Android back button press via captured handler
    const result = capturedBackHandler?.();
    expect(result).toBe(true);
    expect(Alert.alert).toHaveBeenCalledWith(
      expect.stringContaining('Annuler'),
      expect.any(String),
      expect.any(Array)
    );
  });

  it('replaces color selection when selecting a different color', () => {
    render(<ColorSelectionScreen />);

    // Select first color
    fireEvent.press(screen.getByTestId('color-bleu'));
    expect(screen.getByText('Confirmer')).toBeTruthy();

    // Select second color - should replace first
    fireEvent.press(screen.getByTestId('color-rouge'));
    fireEvent.press(screen.getByTestId('confirm-button'));

    expect(router.push).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          color: 'rouge', // Not 'bleu' - second selection wins
        }),
      })
    );
  });
});
