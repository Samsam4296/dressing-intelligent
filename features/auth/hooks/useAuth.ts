/**
 * useAuth Hook
 * Story 1.3: Connexion Utilisateur
 *
 * Provides authentication state and session persistence.
 *
 * AC#2: JWT generated with 1h expiration (handled by Supabase autoRefreshToken)
 * AC#3: Refresh token stored securely in MMKV (AES-256)
 *
 * Features:
 * - Restores session from MMKV on app launch
 * - Listens to auth state changes via onAuthStateChange
 * - Auto-refreshes JWT before expiration
 * - Persists session updates to MMKV
 */

import { useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { storage, STORAGE_KEYS, storageHelpers } from '@/lib/storage';
import * as Sentry from '@sentry/react-native';
import type { AuthState } from '../types/auth.types';

interface StoredAuthState {
  session: Session | null;
  user: User | null;
}

/**
 * Authentication hook providing auth state and methods
 *
 * @returns AuthState with user, session, loading state, and authentication status
 *
 * @example
 * ```tsx
 * const { isAuthenticated, isLoading, user, session } = useAuth();
 *
 * if (isLoading) return <LoadingScreen />;
 * if (!isAuthenticated) return <LoginScreen />;
 * return <MainApp user={user} />;
 * ```
 */
export const useAuth = (): AuthState => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from MMKV and set up listeners
  useEffect(() => {
    // Skip if Supabase not configured
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    /**
     * Restore session from MMKV (AC#3 - secure storage)
     */
    const restoreSession = async () => {
      try {
        // Try to get stored session from MMKV
        const storedAuth = storageHelpers.getJSON<StoredAuthState>(STORAGE_KEYS.AUTH_STATE);

        if (storedAuth?.session) {
          // Validate and refresh the stored session with Supabase
          const { data, error } = await supabase.auth.setSession({
            access_token: storedAuth.session.access_token,
            refresh_token: storedAuth.session.refresh_token,
          });

          if (error) {
            // Session invalid or expired, clear storage
            storage.delete(STORAGE_KEYS.AUTH_STATE);
            Sentry.addBreadcrumb({
              category: 'auth',
              message: 'Stored session invalid, cleared',
              level: 'info',
            });
          } else if (data.session && isMounted) {
            // Session restored successfully
            setSession(data.session);
            setUser(data.user);

            // Update stored session with refreshed tokens
            storage.set(STORAGE_KEYS.AUTH_STATE, JSON.stringify({
              session: data.session,
              user: data.user,
            }));

            Sentry.addBreadcrumb({
              category: 'auth',
              message: 'Session restored from storage',
              level: 'info',
            });
          }
        } else {
          // No stored session, try to get current session from Supabase
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession && isMounted) {
            setSession(currentSession);
            setUser(currentSession.user);
          }
        }
      } catch (err) {
        Sentry.captureException(err, {
          tags: { feature: 'auth', action: 'restoreSession' },
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    /**
     * Listen to auth state changes (AC#2 - auto refresh JWT)
     * Supabase automatically handles:
     * - JWT refresh before 1h expiration
     * - Session token updates
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;

        // Update state
        setSession(newSession);
        setUser(newSession?.user ?? null);

        // Persist to MMKV (AC#3)
        if (newSession) {
          storage.set(STORAGE_KEYS.AUTH_STATE, JSON.stringify({
            session: newSession,
            user: newSession.user,
          }));
        } else {
          storage.delete(STORAGE_KEYS.AUTH_STATE);
        }

        // Log auth events for debugging
        Sentry.addBreadcrumb({
          category: 'auth',
          message: `Auth state change: ${event}`,
          level: 'info',
          data: { hasSession: !!newSession },
        });

        // Handle specific events
        switch (event) {
          case 'SIGNED_IN':
            Sentry.addBreadcrumb({
              category: 'auth',
              message: 'User signed in',
              level: 'info',
            });
            break;
          case 'SIGNED_OUT':
            Sentry.addBreadcrumb({
              category: 'auth',
              message: 'User signed out',
              level: 'info',
            });
            break;
          case 'TOKEN_REFRESHED':
            Sentry.addBreadcrumb({
              category: 'auth',
              message: 'Token refreshed automatically',
              level: 'info',
            });
            break;
          case 'USER_UPDATED':
            Sentry.addBreadcrumb({
              category: 'auth',
              message: 'User profile updated',
              level: 'info',
            });
            break;
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!session,
  };
};
