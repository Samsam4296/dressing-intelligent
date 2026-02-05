/**
 * useUpdateCategoryMutation Tests
 * Story 2.5: Correction Catégorie
 *
 * Tests for the useUpdateCategoryMutation hook.
 * P1-03 FIX: Actually tests the mutation hook with proper renderHook.
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpdateCategoryMutation, wardrobeKeys } from '../useUpdateCategoryMutation';
import { clothingService } from '../../services/clothingService';
import { captureError } from '@/lib/logger';
import { showToast } from '@/shared/components/Toast';

// Mock dependencies
jest.mock('../../services/clothingService');
jest.mock('@/lib/logger');
jest.mock('@/shared/components/Toast');

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const createWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useUpdateCategoryMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful mutation', () => {
    it('calls clothingService.updateCategory with correct params', async () => {
      (clothingService.updateCategory as jest.Mock).mockResolvedValue({
        data: { id: '123', category: 'bas' },
        error: null,
      });

      const { result } = renderHook(() => useUpdateCategoryMutation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({ clothingId: '123', category: 'bas' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(clothingService.updateCategory).toHaveBeenCalledWith('123', 'bas');
      expect(clothingService.updateCategory).toHaveBeenCalledTimes(1);
    });

    it('shows success toast on completion', async () => {
      (clothingService.updateCategory as jest.Mock).mockResolvedValue({
        data: { id: '123', category: 'bas' },
        error: null,
      });

      const { result } = renderHook(() => useUpdateCategoryMutation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({ clothingId: '123', category: 'bas' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(showToast).toHaveBeenCalledWith({
        type: 'success',
        message: 'Catégorie mise à jour',
      });
    });

    it('returns updated data on success', async () => {
      const updatedData = { id: '123', category: 'robe' };
      (clothingService.updateCategory as jest.Mock).mockResolvedValue({
        data: updatedData,
        error: null,
      });

      const { result } = renderHook(() => useUpdateCategoryMutation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({ clothingId: '123', category: 'robe' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(updatedData);
    });
  });

  describe('Failed mutation', () => {
    it('shows error toast and logs to Sentry on failure', async () => {
      const error = new Error('Network error');
      (clothingService.updateCategory as jest.Mock).mockResolvedValue({
        data: null,
        error,
      });

      const { result } = renderHook(() => useUpdateCategoryMutation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({ clothingId: '123', category: 'bas' });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(captureError).toHaveBeenCalledWith(
        error,
        'wardrobe',
        'updateCategory',
        { clothingId: '123', category: 'bas' }
      );

      expect(showToast).toHaveBeenCalledWith({
        type: 'error',
        message: 'Impossible de mettre à jour. Réessayez.',
      });
    });

    it('returns error on failure', async () => {
      const error = new Error('Permission denied');
      (clothingService.updateCategory as jest.Mock).mockResolvedValue({
        data: null,
        error,
      });

      const { result } = renderHook(() => useUpdateCategoryMutation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({ clothingId: '123', category: 'bas' });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
    });
  });

  describe('Loading state', () => {
    it('returns isPending true while mutation is in progress', async () => {
      (clothingService.updateCategory as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: { id: '123', category: 'bas' }, error: null }), 100)
          )
      );

      const { result } = renderHook(() => useUpdateCategoryMutation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({ clothingId: '123', category: 'bas' });
      });

      expect(result.current.isPending).toBe(true);

      await waitFor(() => expect(result.current.isPending).toBe(false));
    });
  });

  describe('Query keys', () => {
    it('exports wardrobeKeys for cache management', () => {
      expect(wardrobeKeys.all).toEqual(['clothes']);
      expect(wardrobeKeys.detail('abc')).toEqual(['clothes', 'abc']);
    });
  });

  describe('Optimistic updates', () => {
    it('performs optimistic update on mutate', async () => {
      const queryClient = createTestQueryClient();

      // Pre-populate cache
      queryClient.setQueryData(wardrobeKeys.all, [
        { id: '123', category: 'haut' },
        { id: '456', category: 'bas' },
      ]);

      (clothingService.updateCategory as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: { id: '123', category: 'robe' }, error: null }), 100)
          )
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useUpdateCategoryMutation(), { wrapper });

      act(() => {
        result.current.mutate({ clothingId: '123', category: 'robe' });
      });

      // Check optimistic update happened immediately
      await waitFor(() => {
        const cached = queryClient.getQueryData(wardrobeKeys.all) as Array<{
          id: string;
          category: string;
        }>;
        expect(cached.find((c) => c.id === '123')?.category).toBe('robe');
      });

      // Wait for completion
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });
});
