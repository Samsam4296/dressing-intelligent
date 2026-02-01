/**
 * Auth Store
 *
 * Manages authentication state including user session, tokens, and auth status.
 * Persisted to MMKV with AES-256 encryption.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage, STORAGE_KEYS } from '@/lib/storage';
import type { User, Session } from '@supabase/supabase-js';

// Auth state types
export interface AuthState {
  // User data
  user: User | null;
  session: Session | null;

  // Auth status
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Error handling
  error: string | null;
}

// Auth actions types
export interface AuthActions {
  // Session management
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;

  // Loading states
  setLoading: (isLoading: boolean) => void;
  setInitialized: (isInitialized: boolean) => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;

  // Auth actions
  signOut: () => void;
  reset: () => void;
}

// Combined store type
export type AuthStore = AuthState & AuthActions;

// Initial state
const initialState: AuthState = {
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,
};

// Create the store
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // Initial state
      ...initialState,

      // Session management
      setSession: (session) =>
        set({
          session,
          user: session?.user ?? null,
          isAuthenticated: !!session,
          error: null,
        }),

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      // Loading states
      setLoading: (isLoading) => set({ isLoading }),
      setInitialized: (isInitialized) => set({ isInitialized }),

      // Error handling
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // Sign out - clear all auth data
      signOut: () =>
        set({
          ...initialState,
          isInitialized: true,
        }),

      // Full reset
      reset: () => set(initialState),
    }),
    {
      name: STORAGE_KEYS.AUTH_STATE,
      storage: createJSONStorage(() => zustandStorage),
      // Only persist these fields
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Selector hooks for optimized re-renders
export const useUser = () => useAuthStore((state) => state.user);
export const useSession = () => useAuthStore((state) => state.session);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);
