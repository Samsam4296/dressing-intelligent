/**
 * Wardrobe Feature Types
 * Story 2.3: Détourage automatique
 *
 * Type definitions for wardrobe image processing.
 */

// ============================================
// Processing Types (Story 2.3)
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
