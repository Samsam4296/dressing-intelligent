/**
 * useFormValidation Hook Tests
 * Story 1.2: Création de Compte
 *
 * Tests for form validation logic covering:
 * - AC#3: Password validation rules
 * - AC#5: Clear error messages
 */

import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  getPasswordStrength,
  PASSWORD_RULES,
} from '../useFormValidation';

describe('useFormValidation - Email Validation', () => {
  it('rejects empty email', () => {
    const result = validateEmail('');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Email requis');
  });

  it('rejects whitespace-only email', () => {
    const result = validateEmail('   ');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Email requis');
  });

  it('rejects invalid email format - no @', () => {
    const result = validateEmail('invalidemail.com');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Format email invalide');
  });

  it('rejects invalid email format - no domain', () => {
    const result = validateEmail('user@');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Format email invalide');
  });

  it('rejects invalid email format - no TLD', () => {
    const result = validateEmail('user@domain');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Format email invalide');
  });

  it('accepts valid email format', () => {
    const result = validateEmail('user@example.com');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts email with subdomain', () => {
    const result = validateEmail('user@mail.example.com');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts email with plus sign', () => {
    const result = validateEmail('user+tag@example.com');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('useFormValidation - Password Validation (AC#3)', () => {
  it('has correct password rules defined', () => {
    expect(PASSWORD_RULES.minLength).toBe(8);
    expect(PASSWORD_RULES.requireUppercase).toBe(true);
    expect(PASSWORD_RULES.requireLowercase).toBe(true);
    expect(PASSWORD_RULES.requireDigit).toBe(true);
  });

  it('rejects empty password', () => {
    const result = validatePassword('');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Mot de passe requis');
  });

  it('rejects password shorter than 8 characters', () => {
    const result = validatePassword('Abc123');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Minimum 8 caractères');
  });

  it('rejects password without uppercase', () => {
    const result = validatePassword('abcdefg1');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Au moins une majuscule');
  });

  it('rejects password without lowercase', () => {
    const result = validatePassword('ABCDEFG1');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Au moins une minuscule');
  });

  it('rejects password without digit', () => {
    const result = validatePassword('Abcdefgh');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Au moins un chiffre');
  });

  it('returns multiple errors when multiple rules fail', () => {
    const result = validatePassword('abc');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
    expect(result.errors).toContain('Minimum 8 caractères');
    expect(result.errors).toContain('Au moins une majuscule');
    expect(result.errors).toContain('Au moins un chiffre');
  });

  it('accepts valid password meeting all criteria', () => {
    const result = validatePassword('ValidPass1');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts password with special characters', () => {
    const result = validatePassword('Valid@Pass1!');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts password exactly 8 characters', () => {
    const result = validatePassword('Abcdef1a');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('useFormValidation - Confirm Password Validation', () => {
  it('rejects empty confirmation', () => {
    const result = validateConfirmPassword('Password1', '');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Confirmation requise');
  });

  it('rejects non-matching passwords', () => {
    const result = validateConfirmPassword('Password1', 'Password2');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Les mots de passe ne correspondent pas');
  });

  it('accepts matching passwords', () => {
    const result = validateConfirmPassword('Password1', 'Password1');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('is case-sensitive', () => {
    const result = validateConfirmPassword('Password1', 'password1');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Les mots de passe ne correspondent pas');
  });
});

describe('useFormValidation - Password Strength', () => {
  it('returns weak for empty password', () => {
    const result = getPasswordStrength('');
    expect(result.strength).toBe('weak');
    expect(result.score).toBe(0);
  });

  it('returns weak for short simple password', () => {
    const result = getPasswordStrength('abc');
    expect(result.strength).toBe('weak');
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('returns medium for moderate password', () => {
    const result = getPasswordStrength('Abcdef12');
    expect(result.strength).toBe('medium');
    expect(result.score).toBeGreaterThan(1);
  });

  it('returns strong for complex password', () => {
    const result = getPasswordStrength('MyStr0ng@Pass!');
    expect(result.strength).toBe('strong');
    expect(result.score).toBeGreaterThanOrEqual(3);
  });

  it('includes feedback message', () => {
    const result = getPasswordStrength('Password123');
    expect(result.feedback.length).toBeGreaterThan(0);
  });
});

describe('useFormValidation - Error Messages (AC#5)', () => {
  it('provides French error messages for email', () => {
    const result = validateEmail('');
    expect(result.errors[0]).toMatch(/email/i);
  });

  it('provides French error messages for password', () => {
    const result = validatePassword('short');
    const allErrors = result.errors.join(' ');
    expect(allErrors).toMatch(/caractères|majuscule|minuscule|chiffre/i);
  });

  it('provides French error messages for confirm password', () => {
    const result = validateConfirmPassword('pass1', 'pass2');
    expect(result.errors[0]).toMatch(/correspondent/i);
  });
});
