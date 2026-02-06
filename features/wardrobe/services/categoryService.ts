/**
 * Category Service
 * Story 2.4: Catégorisation automatique
 *
 * Helper functions for parsing and validating clothing categories.
 */

import type { ClothingCategory, ClothingColor } from '../types/wardrobe.types';
import { CATEGORY_LABELS, CATEGORY_ORDER, COLOR_ORDER } from '../types/wardrobe.types';

/**
 * Threshold for pre-selecting suggested category
 */
const PRESELECT_THRESHOLD = 50;

/**
 * Threshold for showing AI badge
 */
const AI_BADGE_THRESHOLD = 70;

/**
 * Category service with helpers for parsing and validating categories
 */
export const categoryService = {
  /**
   * Parse suggestedCategory from string param
   * @param categoryString - Category string from navigation params
   * @returns Valid category or null
   */
  parseCategory(categoryString?: string): ClothingCategory | null {
    if (!categoryString) return null;
    const category = categoryString as ClothingCategory;
    return CATEGORY_ORDER.includes(category) ? category : null;
  },

  /**
   * Parse color from string param (same pattern as parseCategory)
   * @param colorString - Color string from navigation params
   * @returns Valid color or null
   */
  parseColor(colorString?: string): ClothingColor | null {
    if (!colorString) return null;
    const color = colorString as ClothingColor;
    return COLOR_ORDER.includes(color) ? color : null;
  },

  /**
   * Parse confidence from string param
   * @param confidenceString - Confidence string from navigation params
   * @returns Confidence value clamped to 0-100 range
   */
  parseConfidence(confidenceString?: string): number {
    if (!confidenceString) return 0;
    const confidence = parseFloat(confidenceString);
    if (isNaN(confidence)) return 0;
    return Math.max(0, Math.min(100, confidence));
  },

  /**
   * Check if category suggestion should be pre-selected
   * Pre-select only if confidence >= 50%
   * @param confidence - Confidence score (0-100)
   */
  shouldPreselect(confidence: number): boolean {
    return confidence >= PRESELECT_THRESHOLD;
  },

  /**
   * Check if AI badge should be shown
   * Show badge only if confidence >= 70%
   * @param confidence - Confidence score (0-100)
   */
  shouldShowAiBadge(confidence: number): boolean {
    return confidence >= AI_BADGE_THRESHOLD;
  },

  /**
   * Get category label for display
   * @param category - Category to get label for
   * @returns Localized label or category key as fallback
   */
  getCategoryLabel(category: ClothingCategory): string {
    return CATEGORY_LABELS[category] || category;
  },
};
