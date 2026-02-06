import { render, screen, fireEvent } from '@testing-library/react-native';
import { ColorSelector } from '../ColorSelector';
import { COLOR_ORDER } from '../../types/wardrobe.types';

jest.mock('expo-haptics');

describe('ColorSelector', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all 14 colors', () => {
    render(<ColorSelector selectedColor={null} onSelect={mockOnSelect} />);

    for (const color of COLOR_ORDER) {
      expect(screen.getByTestId(`color-${color}`)).toBeTruthy();
    }
  });

  it('highlights selected color with checkmark', () => {
    render(<ColorSelector selectedColor="bleu" onSelect={mockOnSelect} />);

    expect(screen.getByTestId('color-check-bleu')).toBeTruthy();
    expect(screen.queryByTestId('color-check-rouge')).toBeNull();
  });

  it('calls onSelect with color when pressed', () => {
    const Haptics = require('expo-haptics');
    render(<ColorSelector selectedColor={null} onSelect={mockOnSelect} />);

    fireEvent.press(screen.getByTestId('color-rouge'));

    expect(mockOnSelect).toHaveBeenCalledWith('rouge');
    expect(Haptics.impactAsync).toHaveBeenCalled();
  });

  it('renders multicolore with quadrant pattern (no crash)', () => {
    render(<ColorSelector selectedColor={null} onSelect={mockOnSelect} />);

    const multiButton = screen.getByTestId('color-multicolore');
    expect(multiButton).toBeTruthy();
  });

  it('has correct accessibility labels for each color', () => {
    render(<ColorSelector selectedColor="noir" onSelect={mockOnSelect} />);

    const noirButton = screen.getByTestId('color-noir');
    expect(noirButton.props.accessibilityLabel).toContain('Noir');
    expect(noirButton.props.accessibilityState.selected).toBe(true);

    const blancButton = screen.getByTestId('color-blanc');
    expect(blancButton.props.accessibilityState.selected).toBe(false);
  });
});
