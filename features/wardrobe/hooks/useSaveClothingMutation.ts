/**
 * useSaveClothingMutation Hook
 * Story 2.7: Upload et Stockage Photo
 *
 * TanStack Query mutation hook orchestrating the complete save flow:
 * 1. Get auth session (user_id for storage path)
 * 2. Download image(s) from Cloudinary -> upload to Supabase Storage
 * 3. Insert clothing record in DB
 * 4. Generate signed URL for immediate display
 * 5. Invalidate wardrobe queries for fresh data
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { captureError } from '@/lib/logger';
import { queryKeys } from '@/lib/query-client';
import { storageService } from '../services/storageService';
import { clothingService } from '../services/clothingService';
import type { ClothingCategory, ClothingColor } from '../types/wardrobe.types';

interface SaveClothingParams {
  originalUrl: string;
  processedUrl: string | null;
  publicId: string;
  category: ClothingCategory;
  color: ClothingColor;
  profileId: string;
}

interface SaveClothingResult {
  clothingId: string;
  signedUrl: string;
}

/** Mutation hook for orchestrating the complete clothing save flow */
export const useSaveClothingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<SaveClothingResult, Error, SaveClothingParams>({
    mutationKey: ['saveClothing'],

    mutationFn: async (params: SaveClothingParams) => {
      // 1. Get auth session for user_id
      const {
        data: { session },
        error: authError,
      } = await supabase.auth.getSession();
      if (authError || !session) {
        throw new Error('Session expirée, veuillez vous reconnecter');
      }
      const userId = session.user.id;

      // 2. Upload images to Supabase Storage (parallel if both exist)
      const uploadPromises: Promise<{ data: string | null; error: Error | null }>[] = [];

      // Always upload the original
      uploadPromises.push(storageService.downloadAndUploadImage(params.originalUrl, userId));

      // Upload processed if exists and different from original
      if (params.processedUrl && params.processedUrl !== params.originalUrl) {
        uploadPromises.push(storageService.downloadAndUploadImage(params.processedUrl, userId));
      }

      const results = await Promise.all(uploadPromises);

      // Check original upload
      const originalResult = results[0];
      if (originalResult.error || !originalResult.data) {
        throw new Error('Échec upload image originale');
      }

      // Check processed upload (if applicable)
      let processedPath: string | null = null;
      if (results.length > 1) {
        const processedResult = results[1];
        if (processedResult.error || !processedResult.data) {
          // Non-blocking: processed upload failed, use original only
          if (processedResult.error) {
            captureError(
              processedResult.error,
              'wardrobe',
              'useSaveClothingMutation.processedUpload'
            );
          }
        } else {
          processedPath = processedResult.data;
        }
      }

      // 3. Insert clothing record
      const { data: savedClothing, error: saveError } = await clothingService.saveClothing({
        profileId: params.profileId,
        category: params.category,
        color: params.color,
        originalImagePath: originalResult.data,
        processedImagePath: processedPath,
      });

      if (saveError || !savedClothing) {
        // Rollback: cleanup uploaded files on DB error
        await storageService.deleteFromStorage(originalResult.data);
        if (processedPath) {
          await storageService.deleteFromStorage(processedPath);
        }
        throw saveError || new Error('Échec sauvegarde vêtement');
      }

      // 4. Generate signed URL for immediate display
      const displayPath = processedPath || originalResult.data;
      const { data: signedUrl } = await storageService.createSignedUrl(displayPath);

      return {
        clothingId: savedClothing.id,
        signedUrl: signedUrl || '',
      };
    },

    onSuccess: (_data, params) => {
      // Invalidate wardrobe queries to refresh inventory
      queryClient.invalidateQueries({ queryKey: queryKeys.clothes.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.clothes.list(params.profileId),
      });
    },

    onError: (error) => {
      captureError(error, 'wardrobe', 'useSaveClothingMutation');
    },
  });
};
