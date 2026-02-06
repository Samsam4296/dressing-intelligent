/**
 * Category Mapping Module
 * Story 2.4: Catégorisation automatique
 *
 * Shared logic for mapping Cloudinary Imagga tags to clothing categories.
 * Extracted for testability and reusability.
 *
 * IMPORTANT: Categories MUST match database ENUM `clothing_category`
 * Values: 'top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory'
 */

// =============================================================================
// Types
// =============================================================================

/** The 6 supported clothing categories (matches database ENUM clothing_category) */
export type ClothingCategory = 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'accessory';

/** Tag with confidence from Cloudinary Imagga */
export interface ImaggaTag {
  tag: string;
  /** Confidence score from Cloudinary (0.0 - 1.0 scale) */
  confidence: number;
}

/** Result of category mapping */
export interface CategoryMappingResult {
  category: ClothingCategory;
  /** Confidence score converted to 0-100 scale */
  confidence: number;
}

// =============================================================================
// Mapping Configuration
// =============================================================================

/** Mapping from Cloudinary Imagga tags to our DB categories (English ENUM) */
export const CATEGORY_TAG_MAPPING: Record<string, ClothingCategory> = {
  // Tops (DB: 'top')
  shirt: 'top',
  't-shirt': 'top',
  tshirt: 'top',
  blouse: 'top',
  sweater: 'top',
  pullover: 'top',
  hoodie: 'top',
  top: 'top',
  polo: 'top',
  'tank top': 'top',
  cardigan: 'top',

  // Bottoms (DB: 'bottom')
  pants: 'bottom',
  trousers: 'bottom',
  jeans: 'bottom',
  shorts: 'bottom',
  skirt: 'bottom',
  leggings: 'bottom',

  // Dresses (DB: 'dress')
  dress: 'dress',
  gown: 'dress',
  jumpsuit: 'dress',
  romper: 'dress',

  // Outerwear (DB: 'outerwear')
  jacket: 'outerwear',
  coat: 'outerwear',
  blazer: 'outerwear',
  vest: 'outerwear',
  parka: 'outerwear',
  windbreaker: 'outerwear',

  // Shoes (DB: 'shoes')
  shoes: 'shoes',
  sneakers: 'shoes',
  boots: 'shoes',
  sandals: 'shoes',
  heels: 'shoes',
  loafers: 'shoes',
  slippers: 'shoes',

  // Accessories (DB: 'accessory')
  hat: 'accessory',
  cap: 'accessory',
  scarf: 'accessory',
  belt: 'accessory',
  bag: 'accessory',
  handbag: 'accessory',
  backpack: 'accessory',
  watch: 'accessory',
  jewelry: 'accessory',
  glasses: 'accessory',
  sunglasses: 'accessory',
  tie: 'accessory',
  gloves: 'accessory',
};

// =============================================================================
// Mapping Function
// =============================================================================

/**
 * Maps Cloudinary Imagga tags to our 6 clothing categories.
 * Returns the category with highest confidence match, or null if no match.
 *
 * @param tags - Array of tags with confidence (0.0-1.0 scale from Cloudinary)
 * @returns Category and confidence (0-100 scale) or null if no match
 *
 * @example
 * ```ts
 * const result = mapCloudinaryTagsToCategory([
 *   { tag: 'shirt', confidence: 0.95 },
 *   { tag: 'clothing', confidence: 0.85 }
 * ]);
 * // result: { category: 'top', confidence: 95 }
 * ```
 */
export function mapCloudinaryTagsToCategory(tags: ImaggaTag[]): CategoryMappingResult | null {
  if (!tags?.length) return null;

  // Sort by confidence descending
  const sortedTags = [...tags].sort((a, b) => b.confidence - a.confidence);

  // Find first matching tag
  for (const { tag, confidence } of sortedTags) {
    const normalizedTag = tag.toLowerCase().trim();
    const category = CATEGORY_TAG_MAPPING[normalizedTag];
    if (category) {
      // Convert from 0.0-1.0 to 0-100 scale
      return { category, confidence: Math.round(confidence * 100) };
    }
  }

  return null;
}
