/**
 * CategoryFilterBar Tests
 * Story 2.9: Filtrage par Catégorie (subtask 4.3)
 *
 * Consolidated tests:
 * - Renders 7 chips (Tous + 6 categories)
 * - Selection/deselection behavior
 * - Active/inactive styling
 * - Haptics mock called on press
 */

import { render, screen, fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { CategoryFilterBar } from '../CategoryFilterBar';

const mockOnSelectCategory = jest.fn();

describe('CategoryFilterBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders 7 chips, selects/deselects, applies active style, triggers haptics', () => {
    const { rerender } = render(
      <CategoryFilterBar selectedCategory={null} onSelectCategory={mockOnSelectCategory} />
    );

    // 7 chips: Tous + 6 categories
    expect(screen.getByTestId('filter-chip-all')).toBeTruthy();
    expect(screen.getByTestId('filter-chip-haut')).toBeTruthy();
    expect(screen.getByTestId('filter-chip-bas')).toBeTruthy();
    expect(screen.getByTestId('filter-chip-robe')).toBeTruthy();
    expect(screen.getByTestId('filter-chip-veste')).toBeTruthy();
    expect(screen.getByTestId('filter-chip-chaussures')).toBeTruthy();
    expect(screen.getByTestId('filter-chip-accessoire')).toBeTruthy();

    // Labels rendered
    expect(screen.getByText('Tous')).toBeTruthy();
    expect(screen.getByText('Haut')).toBeTruthy();
    expect(screen.getByText('Chaussures')).toBeTruthy();

    // "Tous" chip has selected accessibility state when no filter
    expect(screen.getByTestId('filter-chip-all')).toHaveProp('accessibilityState', {
      selected: true,
    });
    expect(screen.getByTestId('filter-chip-haut')).toHaveProp('accessibilityState', {
      selected: false,
    });

    // Tap "Haut" → calls onSelectCategory('haut') + haptics
    fireEvent.press(screen.getByTestId('filter-chip-haut'));
    expect(mockOnSelectCategory).toHaveBeenCalledWith('haut');
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);

    // Re-render with 'haut' selected
    mockOnSelectCategory.mockClear();
    (Haptics.impactAsync as jest.Mock).mockClear();
    rerender(<CategoryFilterBar selectedCategory="haut" onSelectCategory={mockOnSelectCategory} />);

    // "Haut" chip now has selected state
    expect(screen.getByTestId('filter-chip-haut')).toHaveProp('accessibilityState', {
      selected: true,
    });
    expect(screen.getByTestId('filter-chip-all')).toHaveProp('accessibilityState', {
      selected: false,
    });

    // Re-tap active chip → calls onSelectCategory(null) (deselect)
    fireEvent.press(screen.getByTestId('filter-chip-haut'));
    expect(mockOnSelectCategory).toHaveBeenCalledWith(null);
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);

    // Tap "Tous" directly → calls onSelectCategory(null)
    mockOnSelectCategory.mockClear();
    fireEvent.press(screen.getByTestId('filter-chip-all'));
    expect(mockOnSelectCategory).toHaveBeenCalledWith(null);
  });
});
