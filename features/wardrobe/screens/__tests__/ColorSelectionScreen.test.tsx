import { render, screen, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';

const mockUseLocalSearchParams = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), dismissAll: jest.fn() },
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));
jest.mock('expo-haptics');
jest.spyOn(Alert, 'alert');

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
});
