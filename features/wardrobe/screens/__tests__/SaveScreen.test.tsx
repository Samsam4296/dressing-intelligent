/**
 * SaveScreen Tests
 * Story 2.7: Upload et Stockage Photo
 *
 * 4 consolidated tests covering:
 * - Loading state with image preview on mount
 * - Success state with animation after save completes
 * - Error state with retry/cancel buttons
 * - Missing params error state
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SaveScreen } from '../SaveScreen';

// Mock expo-router
const mockDismissAll = jest.fn();
const mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { dismissAll: (...args: unknown[]) => mockDismissAll(...args) },
  useLocalSearchParams: () => mockParams,
}));

// Mock useSaveClothingMutation
const mockMutate = jest.fn();
const mockReset = jest.fn();
let mockMutationState = {
  mutate: mockMutate,
  reset: mockReset,
  isSuccess: false,
  isError: false,
  isPending: false,
  error: null as Error | null,
  data: null as { clothingId: string; signedUrl: string } | null,
};

jest.mock('../../hooks/useSaveClothingMutation', () => ({
  useSaveClothingMutation: () => mockMutationState,
}));

// Mock useCurrentProfileId
jest.mock('@/features/profiles/stores/useProfileStore', () => ({
  useCurrentProfileId: () => 'profile-123',
}));

// Mock categoryService
jest.mock('../../services/categoryService', () => ({
  categoryService: {
    parseCategory: (s?: string) => {
      const valid = ['haut', 'bas', 'robe', 'veste', 'chaussures', 'accessoire'];
      return s && valid.includes(s) ? s : null;
    },
    parseColor: (s?: string) => {
      const valid = ['noir', 'blanc', 'gris', 'bleu', 'rouge'];
      return s && valid.includes(s) ? s : null;
    },
  },
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
  ImpactFeedbackStyle: { Medium: 'medium', Light: 'light' },
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: {
      View,
      Text,
    },
    FadeIn: { delay: () => undefined },
    BounceIn: { duration: () => undefined },
  };
});

// Mock wardrobe types
jest.mock('../../types/wardrobe.types', () => ({
  CATEGORY_LABELS: { haut: 'Haut', bas: 'Bas' },
  CATEGORY_ICONS: { haut: 'shirt-outline', bas: 'resize-outline' },
  COLOR_LABELS: { noir: 'Noir', blanc: 'Blanc' },
  COLOR_HEX: { noir: '#374151', blanc: '#F9FAFB' },
}));

// Helper to set search params
const setParams = (params: Record<string, string>) => {
  Object.keys(mockParams).forEach((key) => delete mockParams[key]);
  Object.assign(mockParams, params);
};

describe('SaveScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMutationState = {
      mutate: mockMutate,
      reset: mockReset,
      isSuccess: false,
      isError: false,
      isPending: false,
      error: null,
      data: null,
    };
  });

  it('shows loading state with image preview on mount', () => {
    setParams({
      originalUrl: 'https://cloudinary.com/original.jpg',
      processedUrl: 'https://cloudinary.com/processed.jpg',
      publicId: 'test-id',
      category: 'haut',
      color: 'noir',
    });
    mockMutationState.isPending = true;

    const { getByTestId, getByText } = render(<SaveScreen />);

    expect(getByTestId('save-loading-screen')).toBeTruthy();
    expect(getByTestId('loading-image')).toBeTruthy();
    expect(getByText('Enregistrement...')).toBeTruthy();
  });

  it('shows success with animation after save completes', () => {
    setParams({
      originalUrl: 'https://cloudinary.com/original.jpg',
      processedUrl: '',
      publicId: 'test-id',
      category: 'haut',
      color: 'noir',
    });
    mockMutationState.isSuccess = true;
    mockMutationState.data = { clothingId: 'abc', signedUrl: 'https://signed.url' };

    const { getByTestId, getByText } = render(<SaveScreen />);

    expect(getByTestId('save-success-screen')).toBeTruthy();
    expect(getByText('Vêtement ajouté !')).toBeTruthy();
    expect(getByTestId('success-back-button')).toBeTruthy();
  });

  it('shows error with retry button on failure', () => {
    setParams({
      originalUrl: 'https://cloudinary.com/original.jpg',
      processedUrl: '',
      publicId: 'test-id',
      category: 'haut',
      color: 'noir',
    });
    mockMutationState.isError = true;
    mockMutationState.error = new Error('Network error');

    const { getByTestId, getByText } = render(<SaveScreen />);

    expect(getByTestId('save-error-screen')).toBeTruthy();
    expect(getByText('Network error')).toBeTruthy();
    expect(getByTestId('retry-button')).toBeTruthy();
    expect(getByTestId('cancel-button')).toBeTruthy();

    // Test cancel button
    fireEvent.press(getByTestId('cancel-button'));
    expect(mockDismissAll).toHaveBeenCalled();
  });

  it('shows params error when required params missing', () => {
    setParams({
      originalUrl: '',
      processedUrl: '',
      publicId: '',
      category: '',
      color: '',
    });

    const { getByTestId, getByText } = render(<SaveScreen />);

    expect(getByTestId('save-error-params')).toBeTruthy();
    expect(getByText('Paramètres manquants')).toBeTruthy();

    fireEvent.press(getByTestId('error-back-button'));
    expect(mockDismissAll).toHaveBeenCalled();
  });
});
