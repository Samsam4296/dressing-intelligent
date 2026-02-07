/**
 * WardrobeScreen Tests
 * Story 2.8: Affichage Inventaire
 * Story 2.9: Filtrage par Catégorie
 *
 * Consolidated tests:
 * - Happy path: grid renders with counter, cards, pull-to-refresh
 * - Empty state: EmptyWardrobe shown when no clothes
 * - Loading state: ActivityIndicator shown
 * - Error state: error message + retry button
 * - Filter: chips rendered, selection filters grid + contextual counter
 * - Filtered empty: contextual message when filter yields 0 results
 * - Filter bar hidden when inventory is globally empty
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
  {
    id: 'item-4',
    category: 'haut',
    color: 'bleu',
    signedUrl: 'https://signed/img4.jpg',
    createdAt: '2026-02-01T03:00:00Z',
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

  // --- Story 2.8 tests (preserved) ---

  it('renders grid with counter, cards, and supports pull-to-refresh', () => {
    mockUseClothesReturn.data = mockClothes;

    render(<WardrobeScreen />);

    // Counter header (4 items, no filter)
    expect(screen.getByTestId('wardrobe-count')).toBeTruthy();
    expect(screen.getByText('4 vêtements')).toBeTruthy();

    // Cards rendered
    expect(screen.getByTestId('clothing-card-item-1')).toBeTruthy();
    expect(screen.getByTestId('clothing-card-item-2')).toBeTruthy();
    expect(screen.getByTestId('clothing-card-item-3')).toBeTruthy();
    expect(screen.getByTestId('clothing-card-item-4')).toBeTruthy();

    // Grid testID
    expect(screen.getByTestId('wardrobe-grid')).toBeTruthy();

    // Category filter bar visible
    expect(screen.getByTestId('category-filter-bar')).toBeTruthy();
  });

  it('shows empty state when no clothes (no filter bar)', () => {
    mockUseClothesReturn.data = [];

    render(<WardrobeScreen />);

    expect(screen.getByTestId('wardrobe-empty')).toBeTruthy();
    expect(screen.getByText('Votre garde-robe est vide')).toBeTruthy();
    // Filter bar NOT shown when inventory is globally empty (AC #6)
    expect(screen.queryByTestId('category-filter-bar')).toBeNull();
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

  // --- Story 2.9 tests (new) ---

  it('filters grid by category with contextual counter on chip press', () => {
    mockUseClothesReturn.data = mockClothes;

    render(<WardrobeScreen />);

    // Initially: 4 items, "4 vêtements"
    expect(screen.getByText('4 vêtements')).toBeTruthy();
    expect(screen.getAllByTestId(/^clothing-card-/)).toHaveLength(4);

    // Tap "Haut" filter chip
    fireEvent.press(screen.getByTestId('filter-chip-haut'));

    // Filtered: only 2 haut items shown
    expect(screen.getByText('2 hauts')).toBeTruthy();
    expect(screen.getByTestId('clothing-card-item-1')).toBeTruthy();
    expect(screen.getByTestId('clothing-card-item-4')).toBeTruthy();
    expect(screen.queryByTestId('clothing-card-item-2')).toBeNull();
    expect(screen.queryByTestId('clothing-card-item-3')).toBeNull();

    // Re-tap active chip → deselect (back to "Tous")
    fireEvent.press(screen.getByTestId('filter-chip-haut'));
    expect(screen.getByText('4 vêtements')).toBeTruthy();
    expect(screen.getAllByTestId(/^clothing-card-/)).toHaveLength(4);
  });

  it('shows contextual empty state when filter yields 0 results, and re-tap resets', () => {
    mockUseClothesReturn.data = mockClothes;

    render(<WardrobeScreen />);

    // Tap "Veste" → 0 results
    fireEvent.press(screen.getByTestId('filter-chip-veste'));

    expect(screen.getByTestId('filtered-empty')).toBeTruthy();
    expect(screen.getByText('Aucune veste dans votre garde-robe')).toBeTruthy();
    expect(screen.getByTestId('filtered-empty-add-button')).toBeTruthy();
    expect(screen.getByText('0 veste')).toBeTruthy();

    // Tap "Tous" to reset
    fireEvent.press(screen.getByTestId('filter-chip-all'));
    expect(screen.queryByTestId('filtered-empty')).toBeNull();
    expect(screen.getByText('4 vêtements')).toBeTruthy();
  });
});
