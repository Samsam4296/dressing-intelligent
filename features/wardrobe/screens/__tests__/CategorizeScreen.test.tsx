/**
 * CategorizeScreen Tests
 * Story 2.4: Catégorisation automatique
 *
 * Tests for category selection screen rendering, pre-selection, and navigation.
 */

import { render, screen, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';

// Store params for useLocalSearchParams mock
let mockParams: Record<string, string> = {};

// Mock expo-router - define mocks inside factory for hoisting
jest.mock('expo-router', () => {
  const push = jest.fn();
  const dismissAll = jest.fn();
  return {
    router: { push, dismissAll },
    useLocalSearchParams: () => mockParams,
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Warning: 'warning', Success: 'success' },
}));

jest.spyOn(Alert, 'alert');

// Import AFTER mocks are set up
import { CategorizeScreen } from '../CategorizeScreen';
import { router } from 'expo-router';

// Default params helper
const defaultParams = {
  originalUrl: 'https://cloudinary.com/original.jpg',
  processedUrl: 'https://cloudinary.com/processed.jpg',
  publicId: 'test-public-id',
  usedFallback: 'false',
  suggestedCategory: 'haut',
  categoryConfidence: '85',
};

// Helper to set params
const setParams = (params: Record<string, string>) => {
  mockParams = { ...params };
};

describe('CategorizeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setParams(defaultParams);
  });

  it('renders screen with image', () => {
    render(<CategorizeScreen />);
    expect(screen.getByTestId('categorize-screen')).toBeTruthy();
    expect(screen.getByTestId('clothing-image')).toBeTruthy();
  });

  it('pre-selects suggested category when confidence >= 50', () => {
    render(<CategorizeScreen />);
    // Confirm button should be enabled (category pre-selected)
    const confirmButton = screen.getByTestId('confirm-button');
    expect(confirmButton.props.accessibilityState.disabled).toBe(false);
  });

  it('does not pre-select when confidence < 50', () => {
    setParams({
      ...defaultParams,
      categoryConfidence: '40',
    });

    render(<CategorizeScreen />);
    // Confirm button should be disabled (no pre-selection)
    const confirmButton = screen.getByTestId('confirm-button');
    expect(confirmButton.props.accessibilityState.disabled).toBe(true);
  });

  it('shows AI suggestion message when pre-selecting', () => {
    render(<CategorizeScreen />);
    expect(screen.getByText(/catégorie suggérée par l'ia/i)).toBeTruthy();
  });

  it('shows selection prompt when not pre-selecting', () => {
    setParams({
      ...defaultParams,
      categoryConfidence: '30',
    });

    render(<CategorizeScreen />);
    // Text appears in prompt area - use getAllByText since it also appears in button
    const matches = screen.getAllByText(/sélectionnez une catégorie/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('allows category selection and enables confirm', () => {
    setParams({
      ...defaultParams,
      suggestedCategory: '',
      categoryConfidence: '0',
    });

    render(<CategorizeScreen />);

    // Initially disabled
    let confirmButton = screen.getByTestId('confirm-button');
    expect(confirmButton.props.accessibilityState.disabled).toBe(true);

    // Select a category
    fireEvent.press(screen.getByTestId('category-robe'));

    // Now enabled
    confirmButton = screen.getByTestId('confirm-button');
    expect(confirmButton.props.accessibilityState.disabled).toBe(false);
  });

  it('navigates to color screen on confirm', () => {
    render(<CategorizeScreen />);

    // Confirm pre-selected category
    fireEvent.press(screen.getByTestId('confirm-button'));

    expect(router.push).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/(app)/wardrobe/color',
        params: expect.objectContaining({
          category: 'haut',
          originalUrl: defaultParams.originalUrl,
          processedUrl: defaultParams.processedUrl,
          publicId: defaultParams.publicId,
        }),
      })
    );
  });

  it('shows confirmation dialog on cancel', () => {
    render(<CategorizeScreen />);

    fireEvent.press(screen.getByTestId('cancel-button'));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Annuler l'ajout ?",
      expect.any(String),
      expect.any(Array)
    );
  });

  it('shows error state for missing params', () => {
    setParams({
      originalUrl: '',
      processedUrl: '',
      publicId: '',
    });

    render(<CategorizeScreen />);

    expect(screen.getByText(/paramètres manquants/i)).toBeTruthy();
    expect(screen.getByTestId('error-back-button')).toBeTruthy();
  });

  it('displays fallback warning when usedFallback is true', () => {
    setParams({
      ...defaultParams,
      usedFallback: 'true',
    });

    render(<CategorizeScreen />);

    expect(screen.getByText(/détourage non disponible/i)).toBeTruthy();
  });

  it('displays confidence percentage', () => {
    render(<CategorizeScreen />);

    expect(screen.getByText(/confiance ia: 85%/i)).toBeTruthy();
  });

  it('does not display confidence when no suggestion', () => {
    setParams({
      ...defaultParams,
      suggestedCategory: '',
      categoryConfidence: '0',
    });

    render(<CategorizeScreen />);

    expect(screen.queryByText(/confiance ia/i)).toBeNull();
  });
});
