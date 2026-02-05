/**
 * useUpdateCategoryMutation Hook
 * Story 2.5: Correction Catégorie
 *
 * TanStack Query mutation hook for updating clothing category.
 * Uses optimistic updates with rollback on error.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { captureError } from '@/lib/logger';
import { showToast } from '@/shared/components/Toast';
import { clothingService, type UpdateCategoryResult } from '../services/clothingService';
import type { ClothingCategory } from '../types/wardrobe.types';

// P3-05: Query keys factory for type safety and consistency
export const wardrobeKeys = {
  all: ['clothes'] as const,
  detail: (id: string) => ['clothes', id] as const,
};

interface UpdateCategoryParams {
  clothingId: string;
  category: ClothingCategory;
}

interface MutationContext {
  previousClothes: unknown;
  previousItem: unknown;
}

/** Mutation hook for updating clothing category with optimistic updates */
export const useUpdateCategoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<UpdateCategoryResult['data'], Error, UpdateCategoryParams, MutationContext>({
    // P2-04: Mutation key for deduplication
    mutationKey: ['updateCategory'],

    mutationFn: async ({ clothingId, category }) => {
      const { data, error } = await clothingService.updateCategory(clothingId, category);
      if (error) throw error;
      return data;
    },

    // P2-01: Optimistic update pattern from Context7
    onMutate: async ({ clothingId, category }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: wardrobeKeys.all });

      // Snapshot previous values for rollback
      const previousClothes = queryClient.getQueryData(wardrobeKeys.all);
      const previousItem = queryClient.getQueryData(wardrobeKeys.detail(clothingId));

      // Optimistically update list cache
      queryClient.setQueryData(
        wardrobeKeys.all,
        (old: { id: string; category: string }[] | undefined) =>
          old?.map((item) => (item.id === clothingId ? { ...item, category } : item))
      );

      // Optimistically update item cache
      queryClient.setQueryData(
        wardrobeKeys.detail(clothingId),
        (old: { category: string } | undefined) => (old ? { ...old, category } : old)
      );

      return { previousClothes, previousItem };
    },

    onError: (error, { clothingId, category }, context) => {
      // Rollback on error
      if (context?.previousClothes) {
        queryClient.setQueryData(wardrobeKeys.all, context.previousClothes);
      }
      if (context?.previousItem) {
        queryClient.setQueryData(wardrobeKeys.detail(clothingId), context.previousItem);
      }

      // P2-03: Use centralized logger
      captureError(error, 'wardrobe', 'updateCategory', { clothingId, category });
      showToast({ type: 'error', message: 'Impossible de mettre à jour. Réessayez.' });
    },

    onSuccess: () => {
      showToast({ type: 'success', message: 'Catégorie mise à jour' });
    },

    // Always refetch to ensure server state
    onSettled: (_data, _error, { clothingId }) => {
      queryClient.invalidateQueries({ queryKey: wardrobeKeys.detail(clothingId), exact: true });
    },
  });
};
