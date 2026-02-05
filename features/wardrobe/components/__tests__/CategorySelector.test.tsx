/**
 * CategorySelector Component Tests
 * Story 2.4: Catégorisation automatique
 *
 * Tests for category grid rendering, selection, and AI badge display.
 */

import { render, screen, fireEvent } from '@testing-library/react-native';
import { CategorySelector } from '../CategorySelector';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

describe('CategorySelector', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all 6 categories', () => {
    render(<CategorySelector selectedCategory={null} onSelect={mockOnSelect} />);

    expect(screen.getByTestId('category-haut')).toBeTruthy();
    expect(screen.getByTestId('category-bas')).toBeTruthy();
    expect(screen.getByTestId('category-robe')).toBeTruthy();
    expect(screen.getByTestId('category-veste')).toBeTruthy();
    expect(screen.getByTestId('category-chaussures')).toBeTruthy();
    expect(screen.getByTestId('category-accessoire')).toBeTruthy();
  });

  it('highlights selected category', () => {
    render(<CategorySelector selectedCategory="haut" onSelect={mockOnSelect} />);

    const selectedButton = screen.getByTestId('category-haut');
    expect(selectedButton.props.accessibilityState.selected).toBe(true);

    const unselectedButton = screen.getByTestId('category-bas');
    expect(unselectedButton.props.accessibilityState.selected).toBe(false);
  });

  it('calls onSelect when category pressed', () => {
    render(<CategorySelector selectedCategory={null} onSelect={mockOnSelect} />);

    fireEvent.press(screen.getByTestId('category-veste'));

    expect(mockOnSelect).toHaveBeenCalledWith('veste');
    expect(mockOnSelect).toHaveBeenCalledTimes(1);
  });

  it('triggers haptic feedback on press', () => {
    const Haptics = require('expo-haptics');
    render(<CategorySelector selectedCategory={null} onSelect={mockOnSelect} />);

    fireEvent.press(screen.getByTestId('category-robe'));

    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('shows AI badge on suggested category when not selected', () => {
    render(
      <CategorySelector
        selectedCategory={null}
        suggestedCategory="robe"
        showAiBadge={true}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByTestId('ai-badge')).toBeTruthy();
  });

  it('shows AI badge when different category is selected', () => {
    render(
      <CategorySelector
        selectedCategory="haut"
        suggestedCategory="robe"
        showAiBadge={true}
        onSelect={mockOnSelect}
      />
    );

    // Badge should still show on 'robe' since 'haut' is selected
    expect(screen.getByTestId('ai-badge')).toBeTruthy();
  });

  it('hides AI badge when suggested category is selected', () => {
    render(
      <CategorySelector
        selectedCategory="robe"
        suggestedCategory="robe"
        showAiBadge={true}
        onSelect={mockOnSelect}
      />
    );

    // Badge hidden because suggested is now selected
    expect(screen.queryByTestId('ai-badge')).toBeNull();
  });

  it('hides AI badge when showAiBadge is false', () => {
    render(
      <CategorySelector
        selectedCategory={null}
        suggestedCategory="robe"
        showAiBadge={false}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.queryByTestId('ai-badge')).toBeNull();
  });

  it('has correct accessibility labels', () => {
    render(
      <CategorySelector
        selectedCategory={null}
        suggestedCategory="haut"
        showAiBadge={true}
        onSelect={mockOnSelect}
      />
    );

    const hautButton = screen.getByTestId('category-haut');
    expect(hautButton.props.accessibilityLabel).toContain('Haut');
    expect(hautButton.props.accessibilityLabel).toContain('suggéré par IA');
    expect(hautButton.props.accessibilityRole).toBe('button');
  });

  it('does not include AI mention in label when showAiBadge is false', () => {
    render(
      <CategorySelector
        selectedCategory={null}
        suggestedCategory="haut"
        showAiBadge={false}
        onSelect={mockOnSelect}
      />
    );

    const hautButton = screen.getByTestId('category-haut');
    expect(hautButton.props.accessibilityLabel).not.toContain('suggéré par IA');
  });
});
