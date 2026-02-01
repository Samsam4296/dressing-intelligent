/**
 * Auth Service
 * API calls for authentication operations
 * Story 1.2: Sign Up implementation with Supabase Auth
 *
 * CRITICAL: Sentry logging per project-context.md:
 * - Log errors BEFORE return: Sentry.captureException(error, { tags: {...} })
 */

import type { AuthResponse, SignInRequest, SignUpRequest } from '../types/auth.types';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import * as Sentry from '@sentry/react-native';

/**
 * Map Supabase auth error codes to user-friendly French messages
 */
const mapAuthError = (error: { message: string; status?: number }): { code: string; message: string } => {
  const message = error.message.toLowerCase();

  // Email related errors
  if (message.includes('email already registered') || message.includes('user already registered')) {
    return {
      code: 'EMAIL_EXISTS',
      message: 'Cette adresse email est déjà utilisée',
    };
  }

  if (message.includes('invalid email')) {
    return {
      code: 'INVALID_EMAIL',
      message: 'Adresse email invalide',
    };
  }

  // Password related errors
  if (message.includes('password') && message.includes('weak')) {
    return {
      code: 'WEAK_PASSWORD',
      message: 'Le mot de passe est trop faible',
    };
  }

  // Rate limiting
  if (message.includes('rate limit') || error.status === 429) {
    return {
      code: 'RATE_LIMITED',
      message: 'Trop de tentatives. Veuillez réessayer dans quelques minutes',
    };
  }

  // Network errors
  if (message.includes('network') || message.includes('fetch')) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Erreur de connexion. Vérifiez votre connexion internet',
    };
  }

  // Default error
  return {
    code: 'SIGNUP_ERROR',
    message: 'Une erreur est survenue lors de la création du compte',
  };
};

/**
 * Authentication service with Supabase integration
 */
export const authService = {
  /**
   * Sign up a new user
   * @param request - Sign up credentials
   * @returns AuthResponse with user data or error
   */
  async signUp(request: SignUpRequest): Promise<AuthResponse<User>> {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      const configError = {
        code: 'CONFIG_ERROR',
        message: 'Le service d\'authentification n\'est pas configuré',
      };
      Sentry.captureMessage('Supabase not configured for signup', {
        level: 'warning',
        tags: { feature: 'auth', action: 'signup' },
      });
      return { data: null, error: configError };
    }

    try {
      // Call Supabase signUp
      const { data, error } = await supabase.auth.signUp({
        email: request.email,
        password: request.password,
        options: {
          data: {
            display_name: request.displayName,
          },
        },
      });

      if (error) {
        // Log to Sentry before returning
        Sentry.captureException(error, {
          tags: { feature: 'auth', action: 'signup' },
          extra: { email: request.email },
        });

        return {
          data: null,
          error: mapAuthError(error),
        };
      }

      // Check if user needs email verification
      if (data.user && !data.user.confirmed_at) {
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'User signed up - awaiting email verification',
          level: 'info',
        });
      }

      return {
        data: data.user,
        error: null,
      };
    } catch (err) {
      // Log unexpected errors to Sentry
      Sentry.captureException(err, {
        tags: { feature: 'auth', action: 'signup' },
        extra: { email: request.email },
      });

      return {
        data: null,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: 'Une erreur inattendue est survenue',
        },
      };
    }
  },

  /**
   * Sign in an existing user
   * @param request - Sign in credentials
   * @returns AuthResponse with session data or error
   */
  async signIn(_request: SignInRequest): Promise<AuthResponse<Session>> {
    // Skeleton - to be implemented in Story 1.3
    return {
      data: null,
      error: { code: 'NOT_IMPLEMENTED', message: 'To be implemented in Story 1.3' },
    };
  },

  /**
   * Sign out the current user
   * @returns AuthResponse indicating success or error
   */
  async signOut(): Promise<AuthResponse<null>> {
    // Skeleton - to be implemented in Story 1.3
    return {
      data: null,
      error: { code: 'NOT_IMPLEMENTED', message: 'To be implemented in Story 1.3' },
    };
  },
};
