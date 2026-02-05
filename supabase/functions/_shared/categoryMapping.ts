/**
 * Category Mapping Module
 * Story 2.4: Catégorisation automatique
 *
 * Shared logic for mapping Cloudinary Imagga tags to clothing categories.
 * Extracted for testability and reusability.
 */

// =============================================================================
// Types
// =============================================================================

/** The 6 supported clothing categories */
export type ClothingCategory = 'haut' | 'bas' | 'robe' | 'veste' | 'chaussures' | 'accessoire';

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

/** Mapping from Cloudinary Imagga tags to our categories */
export const CATEGORY_TAG_MAPPING: Record<string, ClothingCategory> = {
  // Hauts
  shirt: 'haut',
  't-shirt': 'haut',
  tshirt: 'haut',
  blouse: 'haut',
  sweater: 'haut',
  pullover: 'haut',
  hoodie: 'haut',
  top: 'haut',
  polo: 'haut',
  'tank top': 'haut',
  cardigan: 'haut',

  // Bas
  pants: 'bas',
  trousers: 'bas',
  jeans: 'bas',
  shorts: 'bas',
  skirt: 'bas',
  leggings: 'bas',

  // Robes
  dress: 'robe',
  gown: 'robe',
  jumpsuit: 'robe',
  romper: 'robe',

  // Vestes
  jacket: 'veste',
  coat: 'veste',
  blazer: 'veste',
  vest: 'veste',
  parka: 'veste',
  windbreaker: 'veste',

  // Chaussures
  shoes: 'chaussures',
  sneakers: 'chaussures',
  boots: 'chaussures',
  sandals: 'chaussures',
  heels: 'chaussures',
  loafers: 'chaussures',
  slippers: 'chaussures',

  // Accessoires
  hat: 'accessoire',
  cap: 'accessoire',
  scarf: 'accessoire',
  belt: 'accessoire',
  bag: 'accessoire',
  handbag: 'accessoire',
  backpack: 'accessoire',
  watch: 'accessoire',
  jewelry: 'accessoire',
  glasses: 'accessoire',
  sunglasses: 'accessoire',
  tie: 'accessoire',
  gloves: 'accessoire',
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
 * // result: { category: 'haut', confidence: 95 }
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
