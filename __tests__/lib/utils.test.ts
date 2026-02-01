/**
 * Utility Functions Tests
 *
 * Comprehensive tests for utility functions.
 * @priority P2 - Utility functions
 */

import { capitalize, truncate, randomId, cn, formatDate, formatTime, sleep } from '@/lib/utils';

describe('Utility Functions', () => {
  describe('capitalize', () => {
    it('capitalizes the first letter of a string', () => {
      expect(capitalize('hello')).toBe('Hello');
    });

    it('handles single character strings', () => {
      expect(capitalize('h')).toBe('H');
    });

    it('handles empty strings', () => {
      expect(capitalize('')).toBe('');
    });

    it('handles already capitalized strings', () => {
      expect(capitalize('Hello')).toBe('Hello');
    });
  });

  describe('truncate', () => {
    it('truncates long strings with ellipsis', () => {
      expect(truncate('This is a very long string', 10)).toBe('This is...');
    });

    it('does not truncate strings shorter than maxLength', () => {
      expect(truncate('Short', 10)).toBe('Short');
    });

    it('handles strings exactly at maxLength', () => {
      expect(truncate('Exact', 5)).toBe('Exact');
    });
  });

  describe('randomId', () => {
    it('generates a non-empty string', () => {
      const id = randomId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
    });

    it('generates unique IDs', () => {
      const id1 = randomId();
      const id2 = randomId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('cn (className merge)', () => {
    it('merges class names', () => {
      const result = cn('class1', 'class2');
      expect(result).toContain('class1');
      expect(result).toContain('class2');
    });

    it('handles conditional classes', () => {
      const result = cn('base', true && 'included', false && 'excluded');
      expect(result).toContain('base');
      expect(result).toContain('included');
      expect(result).not.toContain('excluded');
    });

    it('handles undefined and null values', () => {
      const result = cn('base', undefined, null, 'other');
      expect(result).toContain('base');
      expect(result).toContain('other');
    });
  });

  describe('formatDate', () => {
    it('[P2] formats Date object to localized string', () => {
      // GIVEN: A specific date
      const date = new Date('2025-01-15T10:30:00');

      // WHEN: Formatting with default locale (fr-FR)
      const result = formatDate(date);

      // THEN: Returns localized date string
      expect(result).toContain('15');
      expect(result).toContain('2025');
    });

    it('[P2] formats ISO string date', () => {
      // GIVEN: An ISO string date
      const isoDate = '2025-06-20T15:00:00';

      // WHEN: Formatting
      const result = formatDate(isoDate);

      // THEN: Returns localized date string
      expect(result).toContain('20');
      expect(result).toContain('2025');
    });

    it('[P2] uses custom locale when provided', () => {
      // GIVEN: A date and US locale
      const date = new Date('2025-03-25T10:00:00');

      // WHEN: Formatting with en-US locale
      const result = formatDate(date, 'en-US');

      // THEN: Uses US format
      expect(result).toContain('2025');
      expect(result).toContain('25');
    });
  });

  describe('formatTime', () => {
    it('[P2] formats Date object to HH:MM', () => {
      // GIVEN: A specific time
      const date = new Date('2025-01-15T14:30:00');

      // WHEN: Formatting time
      const result = formatTime(date);

      // THEN: Returns HH:MM format
      expect(result).toMatch(/14[h:]30/);
    });

    it('[P2] formats ISO string time', () => {
      // GIVEN: An ISO string with time
      const isoDate = '2025-06-20T09:15:00';

      // WHEN: Formatting time
      const result = formatTime(isoDate);

      // THEN: Returns HH:MM format
      expect(result).toMatch(/09[h:]15/);
    });
  });

  describe('sleep', () => {
    it('[P2] resolves after specified duration', async () => {
      // GIVEN: A short duration
      const duration = 50;
      const start = Date.now();

      // WHEN: Sleeping
      await sleep(duration);
      const elapsed = Date.now() - start;

      // THEN: At least the specified time has passed
      expect(elapsed).toBeGreaterThanOrEqual(duration - 10); // Allow 10ms tolerance
    });

    it('[P2] returns a Promise', () => {
      // GIVEN: Sleep function
      // WHEN: Calling sleep
      const result = sleep(1);

      // THEN: Returns a Promise
      expect(result).toBeInstanceOf(Promise);
    });
  });
});
