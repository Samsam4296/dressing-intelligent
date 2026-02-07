/**
 * EditClothingModal Tests
 * Story 2.10: Modification Vêtement
 *
 * Consolidated tests: rendering with image + selectors, disabled button when no change,
 * reset on open, confirm flow.
 */

import { render, screen, fireEvent } from '@testing-library/react-native';
import { EditClothingModal } from '../EditClothingModal';
import type { ClothingItem } from '../../types/wardrobe.types';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'dark' }),
}));

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: (props: any) => <View {...props} testID={props.testID ?? 'expo-image'} />,
  };
});

const mockItem: ClothingItem = {
  id: 'test-id-123',
  category: 'haut',
  color: 'noir',
  signedUrl: 'https://example.com/photo.jpg',
  createdAt: '2026-01-01',
};

describe('EditClothingModal', () => {
  const mockOnConfirm = jest.fn();
  const mockOnClose = jest.fn();

  const defaultProps = {
    visible: true,
    item: mockItem,
    onConfirm: mockOnConfirm,
    onClose: mockOnClose,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders image, selectors, and disabled confirm button when no change', () => {
    render(<EditClothingModal {...defaultProps} />);

    expect(screen.getByTestId('edit-clothing-modal')).toBeTruthy();
    expect(screen.getByText('Modifier vêtement')).toBeTruthy();
    expect(screen.getByTestId('clothing-image')).toBeTruthy();
    expect(screen.getByText('Catégorie')).toBeTruthy();
    expect(screen.getByText('Couleur')).toBeTruthy();

    // Confirm button disabled when nothing changed
    const confirmButton = screen.getByTestId('confirm-button');
    expect(confirmButton.props.accessibilityState.disabled).toBe(true);
    expect(screen.getByText('Aucune modification')).toBeTruthy();
  });

  it('enables confirm and calls onConfirm with new values when category+color changed', () => {
    const Haptics = require('expo-haptics');
    render(<EditClothingModal {...defaultProps} />);

    // Change category to 'robe'
    fireEvent.press(screen.getByTestId('category-robe'));

    // Change color to 'rouge'
    fireEvent.press(screen.getByTestId('color-rouge'));

    // Confirm should be enabled
    expect(screen.getByText('Confirmer')).toBeTruthy();
    fireEvent.press(screen.getByTestId('confirm-button'));

    expect(mockOnConfirm).toHaveBeenCalledWith('robe', 'rouge');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success
    );
  });

  it('does not confirm when no change made', () => {
    render(<EditClothingModal {...defaultProps} />);
    fireEvent.press(screen.getByTestId('confirm-button'));
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('resets selections when modal reopens', () => {
    // First render: visible
    const { rerender } = render(<EditClothingModal {...defaultProps} />);

    // Change category
    fireEvent.press(screen.getByTestId('category-robe'));

    // Close modal
    rerender(<EditClothingModal {...defaultProps} visible={false} />);

    // Reopen with same item — should reset to item's original values
    rerender(<EditClothingModal {...defaultProps} visible={true} />);

    // Confirm should be disabled again (reset to original)
    expect(screen.getByTestId('confirm-button').props.accessibilityState.disabled).toBe(true);
  });

  it('shows loading state and disables interaction', () => {
    render(<EditClothingModal {...defaultProps} isLoading={true} />);

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    expect(screen.getByTestId('close-button').props.disabled).toBe(true);

    // Change category
    fireEvent.press(screen.getByTestId('category-robe'));
    // Confirm should still be disabled
    expect(screen.getByTestId('confirm-button').props.accessibilityState.disabled).toBe(true);
  });

  it('calls onClose when close button pressed', () => {
    render(<EditClothingModal {...defaultProps} />);
    fireEvent.press(screen.getByTestId('close-button'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when visible is false', () => {
    render(<EditClothingModal {...defaultProps} visible={false} />);
    expect(screen.queryByTestId('edit-clothing-modal')).toBeNull();
  });
});
