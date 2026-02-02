/**
 * Auth Service
 * API calls for authentication operations
 * Story 1.2: Sign Up implementation with Supabase Auth
 * Story 1.3: Sign In implementation with Supabase Auth
 *
 * CRITICAL: Sentry logging per project-context.md:
 * - Log errors BEFORE return: Sentry.captureException(error, { tags: {...} })
 */

import type { AuthResponse, SignInRequest, SignUpRequest } from '../types/auth.types';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import * as Sentry from '@sentry/react-native';

/**
 * Map Supabase auth error codes to user-friendly French messages for SignUp
 */
const mapSignUpError = (error: { message: string; status?: number }): { code: string; message: string } => {
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
 * Map Supabase auth error codes to user-friendly French messages for SignIn (AC#5)
 */
const mapSignInError = (error: { message: string; status?: number }): { code: string; message: string } => {
  const message = error.message.toLowerCase();

  // Invalid credentials (AC#5 - email inconnu, mot de passe incorrect)
  if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
    return {
      code: 'INVALID_CREDENTIALS',
      message: 'Email ou mot de passe incorrect',
    };
  }

  // Email not confirmed
  if (message.includes('email not confirmed')) {
    return {
      code: 'EMAIL_NOT_CONFIRMED',
      message: 'Veuillez confirmer votre email avant de vous connecter',
    };
  }

  // User not found
  if (message.includes('user not found')) {
    return {
      code: 'USER_NOT_FOUND',
      message: 'Aucun compte trouvé avec cet email',
    };
  }

  // Too many requests / Rate limiting (NFR-S7)
  if (message.includes('too many requests') || message.includes('rate limit') || error.status === 429) {
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

  // Account disabled
  if (message.includes('disabled') || message.includes('banned')) {
    return {
      code: 'ACCOUNT_DISABLED',
      message: 'Ce compte a été désactivé. Contactez le support.',
    };
  }

  // Default error
  return {
    code: 'SIGNIN_ERROR',
    message: 'Une erreur est survenue lors de la connexion',
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
          emailRedirectTo: 'dressingintelligent://verify-email',
          data: {
            display_name: request.displayName,
          },
        },
      });

      if (error) {
        // Log to Sentry before returning (no PII - email removed for GDPR)
        Sentry.captureException(error, {
          tags: { feature: 'auth', action: 'signup' },
        });

        return {
          data: null,
          error: mapSignUpError(error),
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
      // Log unexpected errors to Sentry (no PII - email removed for GDPR)
      Sentry.captureException(err, {
        tags: { feature: 'auth', action: 'signup' },
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
   * Sign in an existing user (Story 1.3)
   * @param request - Sign in credentials
   * @returns AuthResponse with session data or error
   *
   * AC#1: Authenticate with valid credentials → redirect to main screen
   * AC#2: JWT generated with 1h expiration (handled by Supabase)
   * AC#3: Refresh token stored securely in MMKV (AES-256)
   * AC#4: Failed attempts rate limited (100 req/min/user - NFR-S7)
   * AC#5: Clear error messages (email unknown, incorrect password)
   */
  async signIn(request: SignInRequest): Promise<AuthResponse<Session>> {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      const configError = {
        code: 'CONFIG_ERROR',
        message: "Le service d'authentification n'est pas configuré",
      };
      Sentry.captureMessage('Supabase not configured for signin', {
        level: 'warning',
        tags: { feature: 'auth', action: 'signin' },
      });
      return { data: null, error: configError };
    }

    try {
      // Call Supabase signInWithPassword (AC#1)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: request.email,
        password: request.password,
      });

      if (error) {
        // Log to Sentry before returning (no PII - GDPR compliant)
        Sentry.captureException(error, {
          tags: { feature: 'auth', action: 'signin' },
          extra: { errorCode: error.status },
        });

        return {
          data: null,
          error: mapSignInError(error),
        };
      }

      // Store session in MMKV with AES-256 encryption (AC#3)
      if (data.session) {
        storage.set(STORAGE_KEYS.AUTH_STATE, JSON.stringify({
          session: data.session,
          user: data.user,
        }));

        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'User signed in successfully',
          level: 'info',
        });
      }

      return {
        data: data.session,
        error: null,
      };
    } catch (err) {
      // Log unexpected errors to Sentry (no PII)
      Sentry.captureException(err, {
        tags: { feature: 'auth', action: 'signin' },
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
   * Sign out the current user (Story 1.3)
   * @returns AuthResponse indicating success or error
   */
  async signOut(): Promise<AuthResponse<null>> {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      const configError = {
        code: 'CONFIG_ERROR',
        message: "Le service d'authentification n'est pas configuré",
      };
      return { data: null, error: configError };
    }

    try {
      // Call Supabase signOut
      const { error } = await supabase.auth.signOut();

      if (error) {
        Sentry.captureException(error, {
          tags: { feature: 'auth', action: 'signout' },
        });

        return {
          data: null,
          error: {
            code: 'SIGNOUT_ERROR',
            message: 'Une erreur est survenue lors de la déconnexion',
          },
        };
      }

      // Clear auth state from MMKV
      storage.delete(STORAGE_KEYS.AUTH_STATE);

      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'User signed out successfully',
        level: 'info',
      });

      return {
        data: null,
        error: null,
      };
    } catch (err) {
      Sentry.captureException(err, {
        tags: { feature: 'auth', action: 'signout' },
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
};
