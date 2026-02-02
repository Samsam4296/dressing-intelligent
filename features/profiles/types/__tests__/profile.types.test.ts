/**
 * Profile Types Unit Tests
 * Story 1.5: Création Premier Profil
 *
 * Tests for the validateProfileName function (AC#2: 2-30 characters).
 */

import { validateProfileName } from '../profile.types';

describe('validateProfileName', () => {
  describe('valid names', () => {
    it('accepts a 2-character name (minimum valid)', () => {
      const result = validateProfileName('Em');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts a 30-character name (maximum valid)', () => {
      const result = validateProfileName('A'.repeat(30));
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts typical names like Emma, Lucas, Sophie', () => {
      const names = ['Emma', 'Lucas', 'Sophie', 'Marie-Anne', 'Jean-Pierre'];
      names.forEach((name) => {
        const result = validateProfileName(name);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('accepts names with accented characters', () => {
      const names = ['Émilie', 'François', 'José', 'Andrée', 'Noël'];
      names.forEach((name) => {
        const result = validateProfileName(name);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('accepts names with spaces', () => {
      const result = validateProfileName('Jean Marie');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('invalid names', () => {
    it('rejects an empty string', () => {
      const result = validateProfileName('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Le nom doit contenir au moins 2 caractères');
    });

    it('rejects a 1-character name (below minimum)', () => {
      const result = validateProfileName('A');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Le nom doit contenir au moins 2 caractères');
    });

    it('rejects a 31-character name (above maximum)', () => {
      const result = validateProfileName('A'.repeat(31));
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Le nom ne peut pas dépasser 30 caractères');
    });

    it('rejects a very long name (50 characters)', () => {
      const result = validateProfileName('A'.repeat(50));
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Le nom ne peut pas dépasser 30 caractères');
    });

    it('rejects whitespace-only strings', () => {
      const result = validateProfileName('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Le nom doit contenir au moins 2 caractères');
    });
  });

  describe('trimming behavior', () => {
    it('trims leading and trailing spaces before validation', () => {
      const result = validateProfileName('  Emma  ');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('considers trimmed length for validation (1 char after trim = invalid)', () => {
      const result = validateProfileName('  A  ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Le nom doit contenir au moins 2 caractères');
    });

    it('considers trimmed length for validation (30 chars after trim = valid)', () => {
      // 30 chars + spaces = valid after trim
      const result = validateProfileName('  ' + 'A'.repeat(30) + '  ');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('considers trimmed length for validation (31 chars after trim = invalid)', () => {
      // 31 chars + spaces = invalid after trim
      const result = validateProfileName('  ' + 'A'.repeat(31) + '  ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Le nom ne peut pas dépasser 30 caractères');
    });
  });
});
