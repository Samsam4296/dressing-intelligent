/**
 * useUpdateClothingMutation Tests
 * Story 2.10: Modification Vêtement
 *
 * Consolidated tests: happy path, error + rollback, optimistic update with correct query keys.
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpdateClothingMutation } from '../useUpdateClothingMutation';
import { clothingService } from '../../services/clothingService';
import { queryKeys } from '@/lib/query-client';
import { captureError } from '@/lib/logger';
import { showToast } from '@/shared/components/Toast';
import type { ClothingItem } from '../../types/wardrobe.types';

jest.mock('../../services/clothingService');
jest.mock('@/lib/logger');
jest.mock('@/shared/components/Toast');

const PROFILE_ID = '123e4567-e89b-12d3-a456-426614174000';
const CLOTHING_ID = 'aabbccdd-1122-3344-5566-778899aabbcc';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const createWrapper = (queryClient?: QueryClient) => {
  const qc = queryClient ?? createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('useUpdateClothingMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('completes happy path: calls service, shows success toast, returns data', async () => {
    (clothingService.updateClothing as jest.Mock).mockResolvedValue({
      data: { id: CLOTHING_ID, category: 'bas', color: 'rouge' },
      error: null,
    });

    const { result } = renderHook(() => useUpdateClothingMutation(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        profileId: PROFILE_ID,
        clothingId: CLOTHING_ID,
        category: 'bas',
        color: 'rouge',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(clothingService.updateClothing).toHaveBeenCalledWith(CLOTHING_ID, {
      category: 'bas',
      color: 'rouge',
    });
    expect(showToast).toHaveBeenCalledWith({
      type: 'success',
      message: 'Vêtement mis à jour',
    });
    expect(result.current.data).toEqual({
      id: CLOTHING_ID,
      category: 'bas',
      color: 'rouge',
    });
  });

  it('handles error: shows error toast, logs to Sentry, rolls back optimistic update', async () => {
    const queryClient = createTestQueryClient();

    // Pre-populate cache at the CORRECT query key
    const initialClothes: ClothingItem[] = [
      {
        id: CLOTHING_ID,
        category: 'haut',
        color: 'noir',
        signedUrl: 'url',
        createdAt: '2026-01-01',
      },
    ];
    queryClient.setQueryData(queryKeys.clothes.list(PROFILE_ID), initialClothes);

    const error = new Error('Network error');
    (clothingService.updateClothing as jest.Mock).mockResolvedValue({
      data: null,
      error,
    });

    const { result } = renderHook(() => useUpdateClothingMutation(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({
        profileId: PROFILE_ID,
        clothingId: CLOTHING_ID,
        category: 'bas',
        color: 'rouge',
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Verify error handling
    expect(captureError).toHaveBeenCalledWith(error, 'wardrobe', 'updateClothing', {
      clothingId: CLOTHING_ID,
      category: 'bas',
      color: 'rouge',
    });
    expect(showToast).toHaveBeenCalledWith({
      type: 'error',
      message: 'Impossible de mettre à jour. Réessayez.',
    });

    // Verify rollback: cache should be restored to initial values
    const cached = queryClient.getQueryData<ClothingItem[]>(queryKeys.clothes.list(PROFILE_ID));
    expect(cached?.[0]?.category).toBe('haut');
    expect(cached?.[0]?.color).toBe('noir');
  });

  it('performs optimistic update at correct query key (not wardrobeKeys.all bug)', async () => {
    const queryClient = createTestQueryClient();

    const initialClothes: ClothingItem[] = [
      {
        id: CLOTHING_ID,
        category: 'haut',
        color: 'noir',
        signedUrl: 'url',
        createdAt: '2026-01-01',
      },
      {
        id: 'other-id',
        category: 'bas',
        color: 'bleu',
        signedUrl: 'url2',
        createdAt: '2026-01-02',
      },
    ];
    queryClient.setQueryData(queryKeys.clothes.list(PROFILE_ID), initialClothes);

    // Slow mutation to verify optimistic update happens before resolve
    (clothingService.updateClothing as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({ data: { id: CLOTHING_ID, category: 'robe', color: 'rouge' }, error: null }),
            100
          )
        )
    );

    const { result } = renderHook(() => useUpdateClothingMutation(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({
        profileId: PROFILE_ID,
        clothingId: CLOTHING_ID,
        category: 'robe',
        color: 'rouge',
      });
    });

    // Verify optimistic update at clothes.list(profileId)
    await waitFor(() => {
      const cached = queryClient.getQueryData<ClothingItem[]>(queryKeys.clothes.list(PROFILE_ID));
      expect(cached?.find((c) => c.id === CLOTHING_ID)?.category).toBe('robe');
      expect(cached?.find((c) => c.id === CLOTHING_ID)?.color).toBe('rouge');
    });

    // Other items should be unchanged
    const cached = queryClient.getQueryData<ClothingItem[]>(queryKeys.clothes.list(PROFILE_ID));
    expect(cached?.find((c) => c.id === 'other-id')?.category).toBe('bas');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
