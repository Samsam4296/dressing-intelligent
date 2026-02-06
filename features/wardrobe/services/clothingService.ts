/**
 * Clothing Service
 * Story 2.5: Correction Catégorie
 * Story 2.6: Sélection Couleur
 *
 * Service for managing clothing items in Supabase.
 * Handles category and color mapping between UI (French) and DB (English).
 */

import { supabase } from '@/lib/supabase';
import type { ClothingCategory, ClothingColor } from '../types/wardrobe.types';
import type {
  ClothingCategory as DbClothingCategory,
  ClothingColor as DbClothingColor,
} from '@/types/database.types';

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

/** Map UI colors (French) to DB colors (English) */
export const UI_TO_DB_COLOR: Record<ClothingColor, DbClothingColor> = {
  noir: 'black',
  blanc: 'white',
  gris: 'gray',
  marine: 'navy',
  bleu: 'blue',
  rouge: 'red',
  rose: 'pink',
  vert: 'green',
  jaune: 'yellow',
  orange: 'orange',
  violet: 'purple',
  marron: 'brown',
  beige: 'beige',
  multicolore: 'multicolor',
};

/** Map DB colors (English) to UI colors (French) */
export const DB_TO_UI_COLOR: Record<DbClothingColor, ClothingColor> = {
  black: 'noir',
  white: 'blanc',
  gray: 'gris',
  navy: 'marine',
  blue: 'bleu',
  red: 'rouge',
  pink: 'rose',
  green: 'vert',
  yellow: 'jaune',
  orange: 'orange',
  purple: 'violet',
  brown: 'marron',
  beige: 'beige',
  multicolor: 'multicolore',
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
    // P2-02 FIX: Generic error message to prevent information leakage
    if (!VALID_CATEGORIES.has(category)) {
      return { data: null, error: new Error('Invalid category provided') };
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
        // P2-02 FIX: Generic error message to prevent Supabase details leakage
        throw new Error('Unable to update category');
      }

      // Validate response category exists in mapping
      const uiCategory = DB_TO_UI_CATEGORY[data.category as DbClothingCategory];
      if (!uiCategory) {
        // P2-02 FIX: Generic error message
        throw new Error('Unable to update category');
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
