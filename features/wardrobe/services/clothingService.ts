/**
 * Clothing Service
 * Story 2.5: Correction Catégorie
 * Story 2.6: Sélection Couleur
 *
 * Service for managing clothing items in Supabase.
 * Handles category and color mapping between UI (French) and DB (English).
 */

import { supabase } from '@/lib/supabase';
import type {
  ClothingCategory,
  ClothingColor,
  ClothingItem,
  SaveClothingInput,
  SaveClothingResult,
} from '../types/wardrobe.types';
import type {
  ClothingCategory as DbClothingCategory,
  ClothingColor as DbClothingColor,
} from '@/types/database.types';
import type { ApiResponse } from '@/types';

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

const BUCKET_NAME = 'clothes-photos';
const SIGNED_URL_EXPIRY = 900; // 15 minutes (NFR-S3)

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
   * Fetches all clothing items for a profile with signed image URLs.
   * Uses batch createSignedUrls for performance.
   * Maps DB values (English) → UI values (French).
   */
  async getClothes(profileId: string): Promise<ApiResponse<ClothingItem[]>> {
    if (!UUID_REGEX.test(profileId)) {
      return { data: null, error: new Error('Invalid profile ID format') };
    }

    try {
      const { data, error } = await supabase
        .from('clothes')
        .select('id, category, color, original_image_url, processed_image_url, created_at')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });

      if (error) throw new Error('Unable to load clothes');
      if (!data || data.length === 0) return { data: [], error: null };

      // Prefer processed (background-removed) image, fall back to original
      const paths = data.map((item) => item.processed_image_url ?? item.original_image_url);

      const { data: signedUrls, error: signError } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrls(paths, SIGNED_URL_EXPIRY);

      if (signError) throw new Error('Unable to generate image URLs');

      const clothes: ClothingItem[] = data.map((item, index) => ({
        id: item.id,
        category: DB_TO_UI_CATEGORY[item.category as DbClothingCategory],
        color: DB_TO_UI_COLOR[item.color as DbClothingColor],
        signedUrl: signedUrls?.[index]?.signedUrl ?? '',
        createdAt: item.created_at,
      }));

      return { data: clothes, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  },

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

  /**
   * Creates a new clothing item in the database.
   * Maps UI values (French) to DB values (English) for category and color.
   * RLS policy verifies profile_id belongs to authenticated user.
   */
  async saveClothing(input: SaveClothingInput): Promise<ApiResponse<SaveClothingResult>> {
    // Validate profileId UUID format (same pattern as updateCategory)
    if (!UUID_REGEX.test(input.profileId)) {
      return { data: null, error: new Error('Invalid profile ID format') };
    }

    try {
      const dbCategory = UI_TO_DB_CATEGORY[input.category];
      const dbColor = UI_TO_DB_COLOR[input.color];

      if (!dbCategory || !dbColor) {
        return { data: null, error: new Error('Invalid category or color') };
      }

      const { data, error } = await supabase
        .from('clothes')
        .insert({
          profile_id: input.profileId,
          category: dbCategory,
          color: dbColor,
          original_image_url: input.originalImagePath,
          processed_image_url: input.processedImagePath,
        })
        .select('id')
        .single();

      if (error) {
        throw new Error('Unable to save clothing');
      }

      return {
        data: { id: data.id },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  },
};
