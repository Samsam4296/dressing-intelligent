/**
 * EditCategoryModal Tests
 * Story 2.5: Correction Catégorie
 *
 * Tests for the EditCategoryModal component.
 * P1-03 FIX: Actually tests the EditCategoryModal component.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { EditCategoryModal } from '../EditCategoryModal';

// Mock dependencies
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'dark' }),
}));

describe('EditCategoryModal', () => {
  const mockOnConfirm = jest.fn();
  const mockOnClose = jest.fn();

  const defaultProps = {
    visible: true,
    currentCategory: 'haut' as const,
    onConfirm: mockOnConfirm,
    onClose: mockOnClose,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders modal with current category pre-selected', () => {
      render(<EditCategoryModal {...defaultProps} />);

      expect(screen.getByTestId('edit-category-modal')).toBeTruthy();
      expect(screen.getByText('Modifier catégorie')).toBeTruthy();

      // CategorySelector should have current category selected
      const hautButton = screen.getByTestId('category-haut');
      expect(hautButton.props.accessibilityState.selected).toBe(true);
    });

    it('renders close button with correct accessibility', () => {
      render(<EditCategoryModal {...defaultProps} />);

      const closeButton = screen.getByTestId('close-button');
      expect(closeButton.props.accessibilityRole).toBe('button');
      expect(closeButton.props.accessibilityLabel).toBe('Fermer');
    });

    it('renders confirm button with correct state', () => {
      render(<EditCategoryModal {...defaultProps} />);

      const confirmButton = screen.getByTestId('confirm-button');
      expect(confirmButton.props.accessibilityRole).toBe('button');
      expect(confirmButton.props.accessibilityState.disabled).toBe(true);
      expect(screen.getByText('Aucune modification')).toBeTruthy();
    });
  });

  describe('Category Selection', () => {
    it('enables confirm button when category changed', () => {
      render(<EditCategoryModal {...defaultProps} />);

      // Change category
      fireEvent.press(screen.getByTestId('category-bas'));

      // Confirm should be enabled
      const confirmButton = screen.getByTestId('confirm-button');
      expect(confirmButton.props.accessibilityState.disabled).toBe(false);
      expect(screen.getByText('Confirmer')).toBeTruthy();
    });

    it('disables confirm button when reverting to original category', () => {
      render(<EditCategoryModal {...defaultProps} />);

      // Change category
      fireEvent.press(screen.getByTestId('category-bas'));
      expect(screen.getByTestId('confirm-button').props.accessibilityState.disabled).toBe(false);

      // Revert to original
      fireEvent.press(screen.getByTestId('category-haut'));
      expect(screen.getByTestId('confirm-button').props.accessibilityState.disabled).toBe(true);
    });

    it('allows selecting any of the 6 categories', () => {
      render(<EditCategoryModal {...defaultProps} />);

      const categories = ['bas', 'robe', 'veste', 'chaussures', 'accessoire'];

      categories.forEach((cat) => {
        fireEvent.press(screen.getByTestId(`category-${cat}`));
        expect(screen.getByTestId(`category-${cat}`).props.accessibilityState.selected).toBe(true);
      });
    });
  });

  describe('Confirm Action', () => {
    it('calls onConfirm with new category when confirmed', () => {
      const Haptics = require('expo-haptics');
      render(<EditCategoryModal {...defaultProps} />);

      // Change category
      fireEvent.press(screen.getByTestId('category-robe'));

      // Confirm
      fireEvent.press(screen.getByTestId('confirm-button'));

      expect(mockOnConfirm).toHaveBeenCalledWith('robe');
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      );
    });

    it('does not call onConfirm when category unchanged', () => {
      render(<EditCategoryModal {...defaultProps} />);

      // Try to confirm without changing
      fireEvent.press(screen.getByTestId('confirm-button'));

      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  describe('Close Action', () => {
    it('calls onClose when close button pressed', () => {
      render(<EditCategoryModal {...defaultProps} />);

      fireEvent.press(screen.getByTestId('close-button'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('disables close button when loading', () => {
      render(<EditCategoryModal {...defaultProps} isLoading={true} />);

      const closeButton = screen.getByTestId('close-button');
      expect(closeButton.props.disabled).toBe(true);
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when isLoading is true', () => {
      render(<EditCategoryModal {...defaultProps} isLoading={true} />);

      expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    });

    it('disables confirm button when loading', () => {
      render(<EditCategoryModal {...defaultProps} isLoading={true} />);

      // Change category first
      fireEvent.press(screen.getByTestId('category-bas'));

      const confirmButton = screen.getByTestId('confirm-button');
      expect(confirmButton.props.accessibilityState.disabled).toBe(true);
    });

    it('does not call onConfirm when loading', () => {
      render(<EditCategoryModal {...defaultProps} isLoading={true} />);

      // Change category
      fireEvent.press(screen.getByTestId('category-bas'));

      // Try to confirm
      fireEvent.press(screen.getByTestId('confirm-button'));

      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  describe('Visibility', () => {
    it('does not render when visible is false', () => {
      render(<EditCategoryModal {...defaultProps} visible={false} />);

      expect(screen.queryByTestId('edit-category-modal')).toBeNull();
    });
  });
});
