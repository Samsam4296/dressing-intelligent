/**
 * Clothing Service
 * Story 2.5: Correction Catégorie
 *
 * Service for managing clothing items in Supabase.
 * Handles category mapping between UI (French) and DB (English).
 */

import { supabase } from '@/lib/supabase';
import type { ClothingCategory } from '../types/wardrobe.types';
import type { ClothingCategory as DbClothingCategory } from '@/types/database.types';

/** Map UI categories (French) to DB categories (English) */
const UI_TO_DB_CATEGORY: Record<ClothingCategory, DbClothingCategory> = {
  haut: 'top',
  bas: 'bottom',
  robe: 'dress',
  veste: 'outerwear',
  chaussures: 'shoes',
  accessoire: 'accessory',
};

/** Map DB categories (English) to UI categories (French) */
const DB_TO_UI_CATEGORY: Record<DbClothingCategory, ClothingCategory> = {
  top: 'haut',
  bottom: 'bas',
  dress: 'robe',
  outerwear: 'veste',
  shoes: 'chaussures',
  accessory: 'accessoire',
};

/** Valid UI category values for runtime validation */
const VALID_CATEGORIES = new Set<string>(Object.keys(UI_TO_DB_CATEGORY));

export interface UpdateCategoryResult {
  data: { id: string; category: ClothingCategory } | null;
  error: Error | null;
}

/** UUID format validation regex */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Clothing service for managing clothing items.
 * Error logging is handled by the mutation hook layer.
 */
export const clothingService = {
  /**
   * Update clothing category in Supabase.
   * RLS policy ensures user can only update their own items.
   */
  async updateCategory(
    clothingId: string,
    category: ClothingCategory
  ): Promise<UpdateCategoryResult> {
    // P1-02: Validate clothingId UUID format
    if (!UUID_REGEX.test(clothingId)) {
      return { data: null, error: new Error('Invalid clothing ID format') };
    }

    // P1-02: Validate category exists in mapping
    if (!VALID_CATEGORIES.has(category)) {
      return { data: null, error: new Error(`Invalid category: ${category}`) };
    }

    try {
      const dbCategory = UI_TO_DB_CATEGORY[category];

      const { data, error } = await supabase
        .from('clothes')
        .update({ category: dbCategory })
        .eq('id', clothingId)
        .select('id, category')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Validate response category exists in mapping
      const uiCategory = DB_TO_UI_CATEGORY[data.category as DbClothingCategory];
      if (!uiCategory) {
        throw new Error(`Unknown DB category: ${data.category}`);
      }

      return {
        data: { id: data.id, category: uiCategory },
        error: null,
      };
    } catch (error) {
      // P1-01: No Sentry here - error logging handled in mutation hook
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  },
};
