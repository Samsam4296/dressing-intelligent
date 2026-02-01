// Global TypeScript types
// Add shared type definitions here

/**
 * Standard API response format
 * All services MUST return this format
 */
export type ApiResponse<T> = {
  data: T | null;
  error: Error | null;
};

/**
 * Environment type
 */
export type Environment = 'development' | 'staging' | 'production';
