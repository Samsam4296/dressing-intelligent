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
