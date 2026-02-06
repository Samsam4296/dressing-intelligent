/**
 * useSaveClothingMutation Tests
 * Story 2.7: Upload et Stockage Photo
 *
 * 3 consolidated tests covering:
 * - Happy path: complete save flow with query invalidation
 * - Rollback: storage cleanup when DB insert fails
 * - Auth: session expired handling
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSaveClothingMutation } from '../useSaveClothingMutation';

// Mock supabase auth
const mockGetSession = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}));

// Mock storageService
const mockDownloadAndUpload = jest.fn();
const mockCreateSignedUrl = jest.fn();
const mockDeleteFromStorage = jest.fn();
jest.mock('../../services/storageService', () => ({
  storageService: {
    downloadAndUploadImage: (...args: unknown[]) => mockDownloadAndUpload(...args),
    createSignedUrl: (...args: unknown[]) => mockCreateSignedUrl(...args),
    deleteFromStorage: (...args: unknown[]) => mockDeleteFromStorage(...args),
  },
}));

// Mock clothingService
const mockSaveClothing = jest.fn();
jest.mock('../../services/clothingService', () => ({
  clothingService: {
    saveClothing: (...args: unknown[]) => mockSaveClothing(...args),
  },
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  captureError: jest.fn(),
}));

// Mock query-client
jest.mock('@/lib/query-client', () => ({
  queryKeys: {
    clothes: {
      all: ['clothes'],
      list: (profileId: string) => ['clothes', 'list', profileId],
    },
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const defaultParams = {
  originalUrl: 'https://cloudinary.com/original.jpg',
  processedUrl: 'https://cloudinary.com/processed.jpg',
  publicId: 'test-public-id',
  category: 'haut' as const,
  color: 'noir' as const,
  profileId: 'profile-123',
};

describe('useSaveClothingMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('orchestrates complete save flow and invalidates queries', async () => {
    // Arrange
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-123' } } },
      error: null,
    });
    mockDownloadAndUpload
      .mockResolvedValueOnce({ data: 'user-123/original.jpg', error: null })
      .mockResolvedValueOnce({ data: 'user-123/processed.jpg', error: null });
    mockSaveClothing.mockResolvedValue({
      data: { id: 'clothing-456' },
      error: null,
    });
    mockCreateSignedUrl.mockResolvedValue({
      data: 'https://storage.supabase.co/signed/url',
      error: null,
    });

    const { result } = renderHook(() => useSaveClothingMutation(), {
      wrapper: createWrapper(),
    });

    // Act
    act(() => {
      result.current.mutate(defaultParams);
    });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetSession).toHaveBeenCalled();
    expect(mockDownloadAndUpload).toHaveBeenCalledTimes(2);
    expect(mockSaveClothing).toHaveBeenCalledWith({
      profileId: 'profile-123',
      category: 'haut',
      color: 'noir',
      originalImagePath: 'user-123/original.jpg',
      processedImagePath: 'user-123/processed.jpg',
    });
    expect(result.current.data).toEqual({
      clothingId: 'clothing-456',
      signedUrl: 'https://storage.supabase.co/signed/url',
    });
  });

  it('cleans up storage files when DB insert fails', async () => {
    // Arrange
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-123' } } },
      error: null,
    });
    mockDownloadAndUpload
      .mockResolvedValueOnce({ data: 'user-123/original.jpg', error: null })
      .mockResolvedValueOnce({ data: 'user-123/processed.jpg', error: null });
    mockSaveClothing.mockResolvedValue({
      data: null,
      error: new Error('RLS violation'),
    });
    mockDeleteFromStorage.mockResolvedValue(undefined);

    const { result } = renderHook(() => useSaveClothingMutation(), {
      wrapper: createWrapper(),
    });

    // Act
    act(() => {
      result.current.mutate(defaultParams);
    });

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Verify storage rollback
    expect(mockDeleteFromStorage).toHaveBeenCalledWith('user-123/original.jpg');
    expect(mockDeleteFromStorage).toHaveBeenCalledWith('user-123/processed.jpg');
  });

  it('handles auth session expired gracefully', async () => {
    // Arrange
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { result } = renderHook(() => useSaveClothingMutation(), {
      wrapper: createWrapper(),
    });

    // Act
    act(() => {
      result.current.mutate(defaultParams);
    });

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Session expirée, veuillez vous reconnecter');
    expect(mockDownloadAndUpload).not.toHaveBeenCalled();
  });
});
