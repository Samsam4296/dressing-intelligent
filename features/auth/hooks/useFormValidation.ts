/**
 * useFormValidation Hook
 * Story 1.2: Création de Compte
 *
 * Real-time form validation for authentication forms.
 *
 * AC#3: Password validation rules:
 *   - Minimum 8 characters
 *   - At least 1 uppercase letter
 *   - At least 1 lowercase letter
 *   - At least 1 digit
 * AC#5: Clear error messages displayed in real-time
 */

import { useState, useCallback } from 'react';

// Password validation rules (AC#3)
export const PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
} as const;

// Validation result type
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Password strength level
export type PasswordStrength = 'weak' | 'medium' | 'strong';

// Password strength result
export interface PasswordStrengthResult {
  strength: PasswordStrength;
  score: number; // 0-4
  feedback: string[];
}

/**
 * Validate email format (RFC 5322 simplified)
 */
export const validateEmail = (email: string): ValidationResult => {
  if (!email || email.trim().length === 0) {
    return {
      isValid: false,
      errors: ['Email requis'],
    };
  }

  // RFC 5322 simplified regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email.trim());

  return {
    isValid,
    errors: isValid ? [] : ['Format email invalide'],
  };
};

/**
 * Validate password against rules (AC#3)
 */
export const validatePassword = (password: string): ValidationResult => {
  const errors: string[] = [];

  if (!password) {
    return {
      isValid: false,
      errors: ['Mot de passe requis'],
    };
  }

  if (password.length < PASSWORD_RULES.minLength) {
    errors.push(`Minimum ${PASSWORD_RULES.minLength} caractères`);
  }

  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Au moins une majuscule');
  }

  if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Au moins une minuscule');
  }

  if (PASSWORD_RULES.requireDigit && !/\d/.test(password)) {
    errors.push('Au moins un chiffre');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate password confirmation matches
 */
export const validateConfirmPassword = (
  password: string,
  confirmPassword: string
): ValidationResult => {
  if (!confirmPassword) {
    return {
      isValid: false,
      errors: ['Confirmation requise'],
    };
  }

  const isValid = password === confirmPassword;

  return {
    isValid,
    errors: isValid ? [] : ['Les mots de passe ne correspondent pas'],
  };
};

/**
 * Calculate password strength
 */
export const getPasswordStrength = (password: string): PasswordStrengthResult => {
  if (!password) {
    return {
      strength: 'weak',
      score: 0,
      feedback: ['Entrez un mot de passe'],
    };
  }

  let score = 0;
  const feedback: string[] = [];

  // Length checks
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Character type checks
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // Normalize score to 0-4
  const normalizedScore = Math.min(Math.floor((score / 6) * 4), 4);

  // Determine strength level
  let strength: PasswordStrength;
  if (normalizedScore <= 1) {
    strength = 'weak';
    feedback.push('Mot de passe faible');
  } else if (normalizedScore <= 2) {
    strength = 'medium';
    feedback.push('Mot de passe moyen');
  } else {
    strength = 'strong';
    feedback.push('Mot de passe fort');
  }

  return {
    strength,
    score: normalizedScore,
    feedback,
  };
};

// Form validation state
interface SignupFormValidation {
  email: ValidationResult;
  password: ValidationResult;
  confirmPassword: ValidationResult;
  passwordStrength: PasswordStrengthResult;
  isFormValid: boolean;
}

// Hook return type
interface UseFormValidationReturn {
  validation: SignupFormValidation;
  validateEmailField: (email: string) => ValidationResult;
  validatePasswordField: (password: string) => ValidationResult;
  validateConfirmPasswordField: (password: string, confirmPassword: string) => ValidationResult;
  validateForm: (email: string, password: string, confirmPassword: string) => SignupFormValidation;
}

/**
 * useFormValidation Hook
 *
 * Provides real-time validation for signup forms.
 *
 * Usage:
 * ```tsx
 * const { validation, validateEmailField, validatePasswordField, validateConfirmPasswordField } = useFormValidation();
 *
 * const handleEmailChange = (text: string) => {
 *   setEmail(text);
 *   const result = validateEmailField(text);
 *   setEmailError(result.errors[0] || null);
 * };
 * ```
 */
export const useFormValidation = (): UseFormValidationReturn => {
  const [validation, setValidation] = useState<SignupFormValidation>({
    email: { isValid: false, errors: [] },
    password: { isValid: false, errors: [] },
    confirmPassword: { isValid: false, errors: [] },
    passwordStrength: { strength: 'weak', score: 0, feedback: [] },
    isFormValid: false,
  });

  const validateEmailField = useCallback((email: string): ValidationResult => {
    const result = validateEmail(email);
    setValidation((prev) => ({
      ...prev,
      email: result,
      isFormValid: result.isValid && prev.password.isValid && prev.confirmPassword.isValid,
    }));
    return result;
  }, []);

  const validatePasswordField = useCallback((password: string): ValidationResult => {
    const result = validatePassword(password);
    const strengthResult = getPasswordStrength(password);
    setValidation((prev) => ({
      ...prev,
      password: result,
      passwordStrength: strengthResult,
      isFormValid: prev.email.isValid && result.isValid && prev.confirmPassword.isValid,
    }));
    return result;
  }, []);

  const validateConfirmPasswordField = useCallback(
    (password: string, confirmPassword: string): ValidationResult => {
      const result = validateConfirmPassword(password, confirmPassword);
      setValidation((prev) => ({
        ...prev,
        confirmPassword: result,
        isFormValid: prev.email.isValid && prev.password.isValid && result.isValid,
      }));
      return result;
    },
    []
  );

  const validateForm = useCallback(
    (email: string, password: string, confirmPassword: string): SignupFormValidation => {
      const emailResult = validateEmail(email);
      const passwordResult = validatePassword(password);
      const confirmResult = validateConfirmPassword(password, confirmPassword);
      const strengthResult = getPasswordStrength(password);

      const newValidation: SignupFormValidation = {
        email: emailResult,
        password: passwordResult,
        confirmPassword: confirmResult,
        passwordStrength: strengthResult,
        isFormValid: emailResult.isValid && passwordResult.isValid && confirmResult.isValid,
      };

      setValidation(newValidation);
      return newValidation;
    },
    []
  );

  return {
    validation,
    validateEmailField,
    validatePasswordField,
    validateConfirmPasswordField,
    validateForm,
  };
};
