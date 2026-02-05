/**
 * Category Service Tests
 * Story 2.4: Catégorisation automatique
 *
 * Tests for category parsing, validation, and threshold checking.
 */

import { categoryService } from '../categoryService';

describe('categoryService', () => {
  describe('parseCategory', () => {
    it('returns valid category for known string', () => {
      expect(categoryService.parseCategory('haut')).toBe('haut');
      expect(categoryService.parseCategory('bas')).toBe('bas');
      expect(categoryService.parseCategory('robe')).toBe('robe');
      expect(categoryService.parseCategory('veste')).toBe('veste');
      expect(categoryService.parseCategory('chaussures')).toBe('chaussures');
      expect(categoryService.parseCategory('accessoire')).toBe('accessoire');
    });

    it('returns null for invalid category', () => {
      expect(categoryService.parseCategory('invalid')).toBeNull();
      expect(categoryService.parseCategory('HAUT')).toBeNull(); // Case sensitive
      expect(categoryService.parseCategory('shirt')).toBeNull(); // English not accepted
    });

    it('returns null for undefined or empty string', () => {
      expect(categoryService.parseCategory(undefined)).toBeNull();
      expect(categoryService.parseCategory('')).toBeNull();
    });
  });

  describe('parseConfidence', () => {
    it('parses valid confidence string', () => {
      expect(categoryService.parseConfidence('75')).toBe(75);
      expect(categoryService.parseConfidence('99.5')).toBe(99.5);
      expect(categoryService.parseConfidence('0')).toBe(0);
      expect(categoryService.parseConfidence('100')).toBe(100);
    });

    it('returns 0 for invalid or undefined', () => {
      expect(categoryService.parseConfidence(undefined)).toBe(0);
      expect(categoryService.parseConfidence('')).toBe(0);
      expect(categoryService.parseConfidence('abc')).toBe(0);
      expect(categoryService.parseConfidence('NaN')).toBe(0);
    });

    it('clamps values to 0-100 range', () => {
      expect(categoryService.parseConfidence('-10')).toBe(0);
      expect(categoryService.parseConfidence('-1')).toBe(0);
      expect(categoryService.parseConfidence('150')).toBe(100);
      expect(categoryService.parseConfidence('999')).toBe(100);
    });
  });

  describe('shouldPreselect', () => {
    it('returns true for confidence >= 50', () => {
      expect(categoryService.shouldPreselect(50)).toBe(true);
      expect(categoryService.shouldPreselect(75)).toBe(true);
      expect(categoryService.shouldPreselect(100)).toBe(true);
    });

    it('returns false for confidence < 50', () => {
      expect(categoryService.shouldPreselect(49)).toBe(false);
      expect(categoryService.shouldPreselect(49.9)).toBe(false);
      expect(categoryService.shouldPreselect(0)).toBe(false);
      expect(categoryService.shouldPreselect(25)).toBe(false);
    });
  });

  describe('shouldShowAiBadge', () => {
    it('returns true for confidence >= 70', () => {
      expect(categoryService.shouldShowAiBadge(70)).toBe(true);
      expect(categoryService.shouldShowAiBadge(85)).toBe(true);
      expect(categoryService.shouldShowAiBadge(100)).toBe(true);
    });

    it('returns false for confidence < 70', () => {
      expect(categoryService.shouldShowAiBadge(69)).toBe(false);
      expect(categoryService.shouldShowAiBadge(69.9)).toBe(false);
      expect(categoryService.shouldShowAiBadge(50)).toBe(false);
      expect(categoryService.shouldShowAiBadge(0)).toBe(false);
    });
  });

  describe('getCategoryLabel', () => {
    it('returns correct french labels', () => {
      expect(categoryService.getCategoryLabel('haut')).toBe('Haut');
      expect(categoryService.getCategoryLabel('bas')).toBe('Bas');
      expect(categoryService.getCategoryLabel('robe')).toBe('Robe');
      expect(categoryService.getCategoryLabel('veste')).toBe('Veste');
      expect(categoryService.getCategoryLabel('chaussures')).toBe('Chaussures');
      expect(categoryService.getCategoryLabel('accessoire')).toBe('Accessoire');
    });
  });
});
