/**
 * useUpdateClothingMutation Hook
 * Story 2.10: Modification Vêtement
 *
 * TanStack Query mutation hook for updating clothing category AND color.
 * Uses optimistic updates with correct query keys (fixes bug from useUpdateCategoryMutation).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { captureError } from '@/lib/logger';
import { queryKeys } from '@/lib/query-client';
import { showToast } from '@/shared/components/Toast';
import { clothingService, type UpdateClothingResult } from '../services/clothingService';
import type { ClothingCategory, ClothingColor, ClothingItem } from '../types/wardrobe.types';

interface UpdateClothingParams {
  profileId: string;
  clothingId: string;
  category: ClothingCategory;
  color: ClothingColor;
}

interface MutationContext {
  previousClothes: ClothingItem[] | undefined;
}

/** Mutation hook for updating clothing category + color with optimistic updates */
export function useUpdateClothingMutation() {
  const queryClient = useQueryClient();

  return useMutation<UpdateClothingResult['data'], Error, UpdateClothingParams, MutationContext>({
    mutationKey: ['updateClothing'],

    mutationFn: async ({ clothingId, category, color }) => {
      const { data, error } = await clothingService.updateClothing(clothingId, {
        category,
        color,
      });
      if (error) throw error;
      return data;
    },

    onMutate: async ({ profileId, clothingId, category, color }) => {
      // Cancel outgoing refetches for this profile's clothes list
      await queryClient.cancelQueries({ queryKey: queryKeys.clothes.list(profileId) });

      // Snapshot previous value using CORRECT query key
      const previousClothes = queryClient.getQueryData<ClothingItem[]>(
        queryKeys.clothes.list(profileId)
      );

      // Optimistically update list cache
      queryClient.setQueryData<ClothingItem[]>(queryKeys.clothes.list(profileId), (old) =>
        old?.map((item) => (item.id === clothingId ? { ...item, category, color } : item))
      );

      return { previousClothes };
    },

    onError: (error, { profileId, clothingId, category, color }, context) => {
      // Rollback on error
      if (context?.previousClothes) {
        queryClient.setQueryData(queryKeys.clothes.list(profileId), context.previousClothes);
      }

      captureError(error, 'wardrobe', 'updateClothing', { clothingId, category, color });
      showToast({ type: 'error', message: 'Impossible de mettre à jour. Réessayez.' });
    },

    onSuccess: () => {
      showToast({ type: 'success', message: 'Vêtement mis à jour' });
    },

    onSettled: (_data, _error, { clothingId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clothes.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.clothes.detail(clothingId),
        exact: true,
      });
    },
  });
}
