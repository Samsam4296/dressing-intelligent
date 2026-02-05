/**
 * Auth Feature Types
 * Types for authentication flow (Stories 1.1 - 1.14)
 */

import { Session, User } from '@supabase/supabase-js';

/** Authentication state */
export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Story 1.14: Error message when session invalidated due to 30-day inactivity (NFR-S9) */
  inactivityError: string | null;
}

/** Sign up request payload */
export interface SignUpRequest {
  email: string;
  password: string;
  displayName?: string;
}

/** Sign in request payload */
export interface SignInRequest {
  email: string;
  password: string;
}

/** Authentication error */
export interface AuthError {
  code: string;
  message: string;
}

/** Generic API response for auth operations */
export interface AuthResponse<T> {
  data: T | null;
  error: AuthError | null;
}
