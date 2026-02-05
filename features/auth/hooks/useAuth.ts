/**
 * useAuth Hook
 * Story 1.3: Connexion Utilisateur
 *
 * Provides authentication state and session persistence.
 *
 * AC#2: JWT generated with 1h expiration (handled by Supabase autoRefreshToken)
 * AC#3: Refresh token stored securely in AsyncStorage (AES-256)
 *
 * Features:
 * - Restores session from AsyncStorage on app launch
 * - Listens to auth state changes via onAuthStateChange
 * - Auto-refreshes JWT before expiration
 * - Persists session updates to AsyncStorage
 */

import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { storage, STORAGE_KEYS, storageHelpers, updateLastActivity } from '@/lib/storage';
import * as Sentry from '@sentry/react-native';
import type { AuthState } from '../types/auth.types';
import { showToast } from '@/shared/components/Toast';

/**
 * Check if an error is a network error
 * Handles both Error instances and Supabase error objects
 */
const isNetworkError = (error: unknown): boolean => {
  let message = '';

  if (error instanceof Error) {
    message = error.message.toLowerCase();
  } else if (error && typeof error === 'object' && 'message' in error) {
    // Handle Supabase/plain error objects
    message = String((error as { message: string }).message).toLowerCase();
  }

  if (!message) return false;

  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('unable to resolve host') ||
    message.includes('connection')
  );
};

/**
 * Check if a stored session is still within its refresh token validity window
 * Story 1.14 AC#5: Use local session if not expired when offline
 */
const isSessionUsable = (session: Session | null): boolean => {
  if (!session) return false;

  // Must have both tokens
  if (!session.refresh_token || !session.access_token) return false;

  // Check if session has expired (expires_at is in seconds since epoch)
  if (session.expires_at) {
    const expiresAtMs = session.expires_at * 1000;
    if (Date.now() > expiresAtMs) {
      return false; // Session has expired
    }
  }

  return true;
};

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
/** Number of days of inactivity before session is invalidated (NFR-S9) */
const INACTIVITY_DAYS_LIMIT = 30;

export const useAuth = (): AuthState => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inactivityError, setInactivityError] = useState<string | null>(null);

  // Initialize auth state from AsyncStorage and set up listeners
  useEffect(() => {
    // Skip if Supabase not configured
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    /**
     * Restore session from AsyncStorage (AC#3 - secure storage)
     * Story 1.14: Includes 30-day inactivity check (NFR-S9)
     */
    const restoreSession = async () => {
      try {
        // Story 1.14 AC#2: Check 30-day inactivity (NFR-S9)
        const lastActivity = await storageHelpers.getJSON<number>(STORAGE_KEYS.LAST_ACTIVITY);
        if (lastActivity) {
          const daysSinceActivity = Math.floor((Date.now() - lastActivity) / (1000 * 60 * 60 * 24));

          if (daysSinceActivity > INACTIVITY_DAYS_LIMIT) {
            // Invalidate session - too long inactive
            storage.delete(STORAGE_KEYS.AUTH_STATE);
            storage.delete(STORAGE_KEYS.LAST_ACTIVITY);

            Sentry.addBreadcrumb({
              category: 'auth',
              message: `Session invalidated: ${daysSinceActivity} days inactive (NFR-S9)`,
              level: 'warning',
              data: { daysSinceActivity, limit: INACTIVITY_DAYS_LIMIT },
            });

            if (isMounted) {
              setIsLoading(false);
              setInactivityError("Session expirée après 30 jours d'inactivité");
            }
            return; // Don't restore session
          }
        }

        // Try to get stored session from AsyncStorage
        const storedAuth = await storageHelpers.getJSON<StoredAuthState>(STORAGE_KEYS.AUTH_STATE);

        if (storedAuth?.session) {
          // Validate and refresh the stored session with Supabase
          const { data, error } = await supabase.auth.setSession({
            access_token: storedAuth.session.access_token,
            refresh_token: storedAuth.session.refresh_token,
          });

          if (error) {
            // Story 1.14 AC#5: Check if it's a network error
            if (isNetworkError(error) && isSessionUsable(storedAuth.session)) {
              // Use local session when offline (AC#5)
              if (isMounted) {
                setSession(storedAuth.session);
                setUser(storedAuth.user);

                Sentry.addBreadcrumb({
                  category: 'auth',
                  message: 'Using local session (offline mode)',
                  level: 'info',
                });

                // Story 1.14 AC#5: Show offline indicator Toast
                showToast({
                  type: 'info',
                  message: 'Mode hors-ligne',
                });
              }
            } else {
              // Session invalid or expired, clear storage
              storage.delete(STORAGE_KEYS.AUTH_STATE);
              Sentry.addBreadcrumb({
                category: 'auth',
                message: 'Stored session invalid, cleared',
                level: 'info',
              });
            }
          } else if (data.session && isMounted) {
            // Session restored successfully
            setSession(data.session);
            setUser(data.user);

            // Update stored session with refreshed tokens
            storage.set(
              STORAGE_KEYS.AUTH_STATE,
              JSON.stringify({
                session: data.session,
                user: data.user,
              })
            );

            // Story 1.14: Update last activity on successful restore
            await updateLastActivity();

            Sentry.addBreadcrumb({
              category: 'auth',
              message: 'Session restored from storage',
              level: 'info',
            });
          }
        } else {
          // No stored session, try to get current session from Supabase
          const {
            data: { session: currentSession },
          } = await supabase.auth.getSession();
          if (currentSession && isMounted) {
            setSession(currentSession);
            setUser(currentSession.user);
          }
        }
      } catch (err) {
        // Story 1.14 AC#4: Handle corrupted storage gracefully
        Sentry.captureException(err, {
          tags: { feature: 'auth', action: 'restoreSession' },
        });

        // Clean corrupted storage silently (AC#4)
        storage.delete(STORAGE_KEYS.AUTH_STATE);
        storage.delete(STORAGE_KEYS.LAST_ACTIVITY);

        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Corrupted storage cleaned during restore',
          level: 'warning',
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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      // Update state
      setSession(newSession);
      setUser(newSession?.user ?? null);

      // Persist to AsyncStorage (AC#3)
      if (newSession) {
        storage.set(
          STORAGE_KEYS.AUTH_STATE,
          JSON.stringify({
            session: newSession,
            user: newSession.user,
          })
        );
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
    });

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
    inactivityError, // Story 1.14: NFR-S9 inactivity error for Toast display
  };
};
