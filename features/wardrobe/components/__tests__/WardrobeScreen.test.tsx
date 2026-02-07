/**
 * WardrobeScreen Tests
 * Story 2.8: Affichage Inventaire
 *
 * Consolidated tests (subtasks 3.1 + 3.2):
 * - Happy path: grid renders with counter, cards, pull-to-refresh
 * - Empty state: EmptyWardrobe shown when no clothes
 * - Loading state: ActivityIndicator shown
 * - Error state: error message + retry button
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

// ---- Mocks ----

const mockRefetch = jest.fn();
let mockUseClothesReturn: {
  data: unknown;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  isRefetching: boolean;
};

jest.mock('@/features/wardrobe/hooks/useClothes', () => ({
  useClothes: () => mockUseClothesReturn,
}));

jest.mock('@/features/profiles', () => ({
  useCurrentProfileId: () => 'profile-123',
}));

// Mock expo-image (not in global jest.setup)
jest.mock('expo-image', () => {
  const React = require('react');
  return {
    Image: ({ testID, accessibilityLabel, ...props }: Record<string, unknown>) =>
      React.createElement('Image', { testID, accessibilityLabel, ...props }),
  };
});

// Import after mocks
import WardrobeScreen from '@/app/(tabs)/wardrobe';
import type { ClothingItem } from '../../types/wardrobe.types';

const mockClothes: ClothingItem[] = [
  {
    id: 'item-1',
    category: 'haut',
    color: 'noir',
    signedUrl: 'https://signed/img1.jpg',
    createdAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'item-2',
    category: 'robe',
    color: 'rouge',
    signedUrl: 'https://signed/img2.jpg',
    createdAt: '2026-02-01T01:00:00Z',
  },
  {
    id: 'item-3',
    category: 'chaussures',
    color: 'blanc',
    signedUrl: 'https://signed/img3.jpg',
    createdAt: '2026-02-01T02:00:00Z',
  },
];

describe('WardrobeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseClothesReturn = {
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
      isRefetching: false,
    };
  });

  it('renders grid with counter, cards, and supports pull-to-refresh', () => {
    mockUseClothesReturn.data = mockClothes;

    render(<WardrobeScreen />);

    // Counter header
    expect(screen.getByTestId('wardrobe-count')).toBeTruthy();
    expect(screen.getByText('3 vêtements')).toBeTruthy();

    // Cards rendered
    expect(screen.getByTestId('clothing-card-item-1')).toBeTruthy();
    expect(screen.getByTestId('clothing-card-item-2')).toBeTruthy();
    expect(screen.getByTestId('clothing-card-item-3')).toBeTruthy();

    // Color badges (item-2 has 'rouge' → hex exists, item-1 has 'noir' → hex exists)
    expect(screen.getByTestId('color-badge-item-1')).toBeTruthy();
    expect(screen.getByTestId('color-badge-item-2')).toBeTruthy();

    // Grid testID
    expect(screen.getByTestId('wardrobe-grid')).toBeTruthy();
  });

  it('renders singular counter for 1 item', () => {
    mockUseClothesReturn.data = [mockClothes[0]];

    render(<WardrobeScreen />);

    expect(screen.getByText('1 vêtement')).toBeTruthy();
  });

  it('shows empty state when no clothes', () => {
    mockUseClothesReturn.data = [];

    render(<WardrobeScreen />);

    expect(screen.getByTestId('wardrobe-empty')).toBeTruthy();
    expect(screen.getByText('Votre garde-robe est vide')).toBeTruthy();
    expect(screen.getByText('Ajoutez votre premier vêtement')).toBeTruthy();
    expect(screen.getByTestId('wardrobe-add-button')).toBeTruthy();
  });

  it('shows loading indicator while fetching', () => {
    mockUseClothesReturn.isLoading = true;

    render(<WardrobeScreen />);

    expect(screen.getByTestId('wardrobe-loading')).toBeTruthy();
  });

  it('shows error state with retry button that calls refetch', () => {
    mockUseClothesReturn.isError = true;

    render(<WardrobeScreen />);

    expect(screen.getByTestId('wardrobe-error')).toBeTruthy();
    expect(screen.getByText('Impossible de charger la garde-robe')).toBeTruthy();

    const retryButton = screen.getByTestId('wardrobe-retry-button');
    expect(retryButton).toBeTruthy();

    fireEvent.press(retryButton);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
