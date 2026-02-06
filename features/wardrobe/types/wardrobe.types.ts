/**
 * Wardrobe Feature Types
 * Story 2.3: Détourage automatique
 * Story 2.4: Catégorisation automatique
 *
 * Type definitions for wardrobe image processing and categorization.
 */

// ============================================
// Category Types (Story 2.4)
// ============================================

/**
 * The 6 supported clothing categories
 */
export type ClothingCategory = 'haut' | 'bas' | 'robe' | 'veste' | 'chaussures' | 'accessoire';

/**
 * Labels français pour affichage UI
 */
export const CATEGORY_LABELS: Record<ClothingCategory, string> = {
  haut: 'Haut',
  bas: 'Bas',
  robe: 'Robe',
  veste: 'Veste',
  chaussures: 'Chaussures',
  accessoire: 'Accessoire',
};

/**
 * Icônes Ionicons pour chaque catégorie
 * Note: Ionicons n'a pas d'icône pantalon parfaite, 'resize-outline' évoque une forme verticale
 * Type-safe: Uses 'as const satisfies' for compile-time icon validation
 */
export const CATEGORY_ICONS = {
  haut: 'shirt-outline',
  bas: 'resize-outline', // Forme verticale (pas d'icône pantalon dans Ionicons)
  robe: 'woman-outline',
  veste: 'layers-outline',
  chaussures: 'footsteps-outline',
  accessoire: 'watch-outline',
} as const satisfies Record<ClothingCategory, string>;

/**
 * Ordre d'affichage des catégories (grille 2x3)
 */
export const CATEGORY_ORDER: ClothingCategory[] = [
  'haut',
  'bas',
  'robe',
  'veste',
  'chaussures',
  'accessoire',
];

// ============================================
// Color Types (Story 2.6)
// ============================================

/**
 * The 14 supported clothing colors (UI values in French)
 * Maps to DB enum `clothing_color` (English values)
 */
export type ClothingColor =
  | 'noir'
  | 'blanc'
  | 'gris'
  | 'marine'
  | 'bleu'
  | 'rouge'
  | 'rose'
  | 'vert'
  | 'jaune'
  | 'orange'
  | 'violet'
  | 'marron'
  | 'beige'
  | 'multicolore';

/**
 * Labels français pour affichage UI
 */
export const COLOR_LABELS: Record<ClothingColor, string> = {
  noir: 'Noir',
  blanc: 'Blanc',
  gris: 'Gris',
  marine: 'Marine',
  bleu: 'Bleu',
  rouge: 'Rouge',
  rose: 'Rose',
  vert: 'Vert',
  jaune: 'Jaune',
  orange: 'Orange',
  violet: 'Violet',
  marron: 'Marron',
  beige: 'Beige',
  multicolore: 'Multi',
};

/**
 * Hex codes for color circle rendering
 * Adjusted for visibility on dark backgrounds
 * noir: #374151 (gray-700) for contrast on bg-gray-900
 * multicolore: null (rendered as quadrant pattern, not a single hex)
 */
export const COLOR_HEX: Record<ClothingColor, string | null> = {
  noir: '#374151',
  blanc: '#F9FAFB',
  gris: '#9CA3AF',
  marine: '#1E3A5F',
  bleu: '#3B82F6',
  rouge: '#EF4444',
  rose: '#EC4899',
  vert: '#22C55E',
  jaune: '#EAB308',
  orange: '#F97316',
  violet: '#8B5CF6',
  marron: '#92400E',
  beige: '#D4B896',
  multicolore: null,
};

/**
 * Display order for colors (5-column × 3-row grid)
 * Row 1: Neutrals (noir, blanc, gris, marine, bleu)
 * Row 2: Vivids (rouge, rose, vert, jaune, orange)
 * Row 3: Remaining (violet, marron, beige, multicolore)
 */
export const COLOR_ORDER: ClothingColor[] = [
  'noir',
  'blanc',
  'gris',
  'marine',
  'bleu',
  'rouge',
  'rose',
  'vert',
  'jaune',
  'orange',
  'violet',
  'marron',
  'beige',
  'multicolore',
];

/**
 * Params for ColorSelectionScreen navigation (Expo Router string params)
 */
export interface ColorSelectionParams {
  originalUrl: string;
  processedUrl: string;
  publicId: string;
  category: string;
}

// ============================================
// Processing Types (Story 2.3 + 2.4)
// ============================================

/**
 * Result from successful image processing via Edge Function
 */
export interface ProcessingResult {
  /** Cloudinary URL of the original uploaded image */
  originalUrl: string;
  /** Cloudinary URL with background removed (null if fallback) */
  processedUrl: string | null;
  /** Cloudinary public_id for future reference */
  publicId: string;
  /** True if background removal failed and original was kept */
  usedFallback: boolean;
  // Story 2.4: AI categorization
  /** Suggested category from AI (undefined if no match or pending) */
  suggestedCategory?: ClothingCategory;
  /** Confidence score 0-100 (undefined if no suggestion) */
  categoryConfidence?: number;
}

/**
 * Params for CategorizeScreen navigation (Expo Router string params)
 */
export interface CategorySelectionParams {
  originalUrl: string;
  processedUrl: string; // '' if null
  publicId: string;
  usedFallback: string; // 'true' | 'false'
  suggestedCategory?: string; // ClothingCategory as string
  categoryConfidence?: string; // number as string
}

/**
 * Error codes for image processing failures
 */
export type ProcessingErrorCode =
  | 'timeout'
  | 'network_error'
  | 'auth_error'
  | 'server_error'
  | 'cancelled';

/**
 * Processing-specific error with error code and retry information
 */
export class ProcessingError extends Error {
  constructor(
    public readonly code: ProcessingErrorCode,
    message: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'ProcessingError';
  }
}

/** Valid processing error codes for type guard validation */
const PROCESSING_ERROR_CODES: readonly ProcessingErrorCode[] = [
  'timeout',
  'network_error',
  'auth_error',
  'server_error',
  'cancelled',
];

/**
 * Type guard to check if an error is a ProcessingError
 * Validates both instance type and error code validity
 */
export const isProcessingError = (error: Error): error is ProcessingError => {
  if (error instanceof ProcessingError) return true;
  // Fallback check for serialized errors
  if ('code' in error && typeof (error as ProcessingError).code === 'string') {
    return PROCESSING_ERROR_CODES.includes((error as ProcessingError).code);
  }
  return false;
};
