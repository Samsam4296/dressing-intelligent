/**
 * usePasswordReset Hook
 * Story 1.4: Réinitialisation Mot de Passe
 *
 * Encapsulates password reset flow logic for both:
 * - Requesting password reset email (ForgotPasswordScreen)
 * - Confirming new password (ResetPasswordScreen)
 *
 * AC#1: Send password reset email
 * AC#3: Password validation during reset
 * AC#4: Session invalidation after reset
 */

import { useState, useCallback } from 'react';
import { authService } from '../services/authService';
import { validatePassword, validateConfirmPassword } from './useFormValidation';
import type { AuthError } from '../types/auth.types';
import * as Sentry from '@sentry/react-native';

/**
 * Password reset request state
 */
interface PasswordResetRequestState {
  isLoading: boolean;
  isSuccess: boolean;
  error: AuthError | null;
}

/**
 * Password reset confirmation state
 */
interface PasswordResetConfirmState {
  isLoading: boolean;
  isSuccess: boolean;
  error: AuthError | null;
}

/**
 * Password criteria validation state for real-time UI feedback (AC#10)
 */
export interface PasswordCriteria {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
}

/**
 * Hook return type
 */
interface UsePasswordResetReturn {
  // Request password reset (ForgotPasswordScreen)
  requestState: PasswordResetRequestState;
  requestPasswordReset: (email: string) => Promise<boolean>;
  resetRequestState: () => void;

  // Confirm password reset (ResetPasswordScreen)
  confirmState: PasswordResetConfirmState;
  confirmPasswordReset: (newPassword: string) => Promise<boolean>;
  resetConfirmState: () => void;

  // Password validation helpers
  validateNewPassword: (password: string) => { isValid: boolean; errors: string[] };
  validatePasswordMatch: (
    password: string,
    confirmPassword: string
  ) => { isValid: boolean; errors: string[] };
  getPasswordCriteria: (password: string) => PasswordCriteria;
}

/**
 * usePasswordReset Hook
 *
 * Provides password reset functionality for authentication flow.
 *
 * @example
 * ```tsx
 * const {
 *   requestState,
 *   requestPasswordReset,
 *   confirmState,
 *   confirmPasswordReset,
 *   getPasswordCriteria,
 * } = usePasswordReset();
 *
 * // Request reset email
 * const handleRequestReset = async (email: string) => {
 *   const success = await requestPasswordReset(email);
 *   if (success) {
 *     // Show success message
 *   }
 * };
 *
 * // Confirm new password
 * const handleConfirmReset = async (password: string) => {
 *   const success = await confirmPasswordReset(password);
 *   if (success) {
 *     // Redirect to login
 *   }
 * };
 *
 * // Real-time password criteria
 * const criteria = getPasswordCriteria(password);
 * ```
 */
export const usePasswordReset = (): UsePasswordResetReturn => {
  // Request state
  const [requestState, setRequestState] = useState<PasswordResetRequestState>({
    isLoading: false,
    isSuccess: false,
    error: null,
  });

  // Confirm state
  const [confirmState, setConfirmState] = useState<PasswordResetConfirmState>({
    isLoading: false,
    isSuccess: false,
    error: null,
  });

  /**
   * Request password reset email (AC#1)
   * @param email - User's email address
   * @returns Promise<boolean> - true if successful
   */
  const requestPasswordReset = useCallback(async (email: string): Promise<boolean> => {
    setRequestState({
      isLoading: true,
      isSuccess: false,
      error: null,
    });

    try {
      const response = await authService.requestPasswordReset(email);

      if (response.error) {
        setRequestState({
          isLoading: false,
          isSuccess: false,
          error: response.error,
        });
        return false;
      }

      setRequestState({
        isLoading: false,
        isSuccess: true,
        error: null,
      });

      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Password reset email requested successfully',
        level: 'info',
      });

      return true;
    } catch (err) {
      Sentry.captureException(err, {
        tags: { feature: 'auth', action: 'requestPasswordReset' },
      });

      setRequestState({
        isLoading: false,
        isSuccess: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: 'Une erreur inattendue est survenue',
        },
      });
      return false;
    }
  }, []);

  /**
   * Confirm password reset with new password (AC#3, AC#4)
   * @param newPassword - The new password to set
   * @returns Promise<boolean> - true if successful
   */
  const confirmPasswordReset = useCallback(async (newPassword: string): Promise<boolean> => {
    setConfirmState({
      isLoading: true,
      isSuccess: false,
      error: null,
    });

    // Validate password before sending to server
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      setConfirmState({
        isLoading: false,
        isSuccess: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: validation.errors[0] || 'Le mot de passe ne respecte pas les critères',
        },
      });
      return false;
    }

    try {
      const response = await authService.confirmPasswordReset(newPassword);

      if (response.error) {
        setConfirmState({
          isLoading: false,
          isSuccess: false,
          error: response.error,
        });
        return false;
      }

      setConfirmState({
        isLoading: false,
        isSuccess: true,
        error: null,
      });

      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Password reset confirmed successfully',
        level: 'info',
      });

      return true;
    } catch (err) {
      Sentry.captureException(err, {
        tags: { feature: 'auth', action: 'confirmPasswordReset' },
      });

      setConfirmState({
        isLoading: false,
        isSuccess: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: 'Une erreur inattendue est survenue',
        },
      });
      return false;
    }
  }, []);

  /**
   * Reset request state to initial values
   */
  const resetRequestState = useCallback(() => {
    setRequestState({
      isLoading: false,
      isSuccess: false,
      error: null,
    });
  }, []);

  /**
   * Reset confirm state to initial values
   */
  const resetConfirmState = useCallback(() => {
    setConfirmState({
      isLoading: false,
      isSuccess: false,
      error: null,
    });
  }, []);

  /**
   * Validate new password against criteria (AC#3)
   */
  const validateNewPassword = useCallback(
    (password: string): { isValid: boolean; errors: string[] } => {
      return validatePassword(password);
    },
    []
  );

  /**
   * Validate password confirmation matches
   */
  const validatePasswordMatch = useCallback(
    (password: string, confirmPassword: string): { isValid: boolean; errors: string[] } => {
      return validateConfirmPassword(password, confirmPassword);
    },
    []
  );

  /**
   * Get real-time password criteria status (AC#10)
   * Used for visual checkmark indicators in ResetPasswordScreen
   */
  const getPasswordCriteria = useCallback((password: string): PasswordCriteria => {
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
    };
  }, []);

  return {
    // Request
    requestState,
    requestPasswordReset,
    resetRequestState,

    // Confirm
    confirmState,
    confirmPasswordReset,
    resetConfirmState,

    // Validation helpers
    validateNewPassword,
    validatePasswordMatch,
    getPasswordCriteria,
  };
};
