/**
 * useAuth Hook - Skeleton
 * Will be implemented in Stories 1.2 (Sign Up) and 1.3 (Sign In)
 */

import { AuthState } from '../types/auth.types';

/**
 * Authentication hook providing auth state and methods
 * @returns AuthState and auth methods
 */
export const useAuth = (): AuthState => {
  // Skeleton implementation - to be completed in Story 1.2/1.3
  return {
    user: null,
    session: null,
    isLoading: false,
    isAuthenticated: false,
  };
};
