/**
 * Category Mapping Tests
 * Story 2.4: Catégorisation automatique
 *
 * Unit tests for mapCloudinaryTagsToCategory function.
 * Run with: deno test --allow-all supabase/functions/tests/categoryMapping.test.ts
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
  mapCloudinaryTagsToCategory,
  CATEGORY_TAG_MAPPING,
  type ImaggaTag,
} from '../_shared/categoryMapping.ts';

// =============================================================================
// Test Suite: mapCloudinaryTagsToCategory
// =============================================================================

Deno.test('mapCloudinaryTagsToCategory - returns matching category for known tag', () => {
  const tags: ImaggaTag[] = [{ tag: 'shirt', confidence: 0.9 }];
  const result = mapCloudinaryTagsToCategory(tags);

  assertExists(result);
  assertEquals(result.category, 'haut');
  assertEquals(result.confidence, 90);
});

Deno.test('mapCloudinaryTagsToCategory - returns null when no tags match', () => {
  const tags: ImaggaTag[] = [
    { tag: 'sunset', confidence: 0.95 },
    { tag: 'ocean', confidence: 0.85 },
  ];
  const result = mapCloudinaryTagsToCategory(tags);

  assertEquals(result, null);
});

Deno.test('mapCloudinaryTagsToCategory - returns null for empty array', () => {
  const result = mapCloudinaryTagsToCategory([]);
  assertEquals(result, null);
});

Deno.test('mapCloudinaryTagsToCategory - returns null for null/undefined input', () => {
  // @ts-ignore - Testing edge case
  assertEquals(mapCloudinaryTagsToCategory(null), null);
  // @ts-ignore - Testing edge case
  assertEquals(mapCloudinaryTagsToCategory(undefined), null);
});

Deno.test('mapCloudinaryTagsToCategory - matches tags case-insensitively', () => {
  const tags: ImaggaTag[] = [{ tag: 'JACKET', confidence: 0.8 }];
  const result = mapCloudinaryTagsToCategory(tags);

  assertExists(result);
  assertEquals(result.category, 'veste');
  assertEquals(result.confidence, 80);
});

Deno.test('mapCloudinaryTagsToCategory - trims whitespace from tags', () => {
  const tags: ImaggaTag[] = [{ tag: '  dress  ', confidence: 0.75 }];
  const result = mapCloudinaryTagsToCategory(tags);

  assertExists(result);
  assertEquals(result.category, 'robe');
  assertEquals(result.confidence, 75);
});

Deno.test('mapCloudinaryTagsToCategory - returns highest confidence matching tag', () => {
  const tags: ImaggaTag[] = [
    { tag: 'nature', confidence: 0.95 }, // No match
    { tag: 'jacket', confidence: 0.85 }, // Match: veste
    { tag: 'shirt', confidence: 0.7 }, // Match: haut (lower confidence)
  ];
  const result = mapCloudinaryTagsToCategory(tags);

  assertExists(result);
  // Should return jacket (first matching after sort by confidence)
  assertEquals(result.category, 'veste');
  assertEquals(result.confidence, 85);
});

Deno.test('mapCloudinaryTagsToCategory - correctly converts confidence 0.0-1.0 to 0-100', () => {
  const testCases = [
    { input: 1.0, expected: 100 },
    { input: 0.5, expected: 50 },
    { input: 0.123, expected: 12 }, // Rounds down
    { input: 0.567, expected: 57 }, // Rounds up
    { input: 0.0, expected: 0 },
  ];

  for (const { input, expected } of testCases) {
    const tags: ImaggaTag[] = [{ tag: 'shirt', confidence: input }];
    const result = mapCloudinaryTagsToCategory(tags);
    assertExists(result);
    assertEquals(result.confidence, expected, `Expected ${expected} for input ${input}`);
  }
});

Deno.test('mapCloudinaryTagsToCategory - maps all category types correctly', () => {
  const categoryTests = [
    { tag: 'shirt', expectedCategory: 'haut' },
    { tag: 'jeans', expectedCategory: 'bas' },
    { tag: 'dress', expectedCategory: 'robe' },
    { tag: 'jacket', expectedCategory: 'veste' },
    { tag: 'sneakers', expectedCategory: 'chaussures' },
    { tag: 'watch', expectedCategory: 'accessoire' },
  ];

  for (const { tag, expectedCategory } of categoryTests) {
    const tags: ImaggaTag[] = [{ tag, confidence: 0.9 }];
    const result = mapCloudinaryTagsToCategory(tags);
    assertExists(result, `Expected result for tag: ${tag}`);
    assertEquals(result.category, expectedCategory, `Tag "${tag}" should map to "${expectedCategory}"`);
  }
});

// =============================================================================
// Test Suite: CATEGORY_TAG_MAPPING coverage
// =============================================================================

Deno.test('CATEGORY_TAG_MAPPING - all categories have at least one tag', () => {
  const categories = ['haut', 'bas', 'robe', 'veste', 'chaussures', 'accessoire'];
  const mappedCategories = new Set(Object.values(CATEGORY_TAG_MAPPING));

  for (const category of categories) {
    assertEquals(
      mappedCategories.has(category as 'haut' | 'bas' | 'robe' | 'veste' | 'chaussures' | 'accessoire'),
      true,
      `Category "${category}" should have at least one tag mapping`
    );
  }
});

Deno.test('CATEGORY_TAG_MAPPING - contains expected tag count (37 tags)', () => {
  const tagCount = Object.keys(CATEGORY_TAG_MAPPING).length;
  assertEquals(tagCount, 37, 'Should have 37 tag mappings');
});
