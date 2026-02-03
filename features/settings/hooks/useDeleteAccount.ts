/**
 * useDeleteAccount Hook
 * Story 1.10: Suppression de Compte
 *
 * Custom hook that manages all state and logic for DeleteAccountModal.
 * Handles password re-authentication and account deletion via Edge Function.
 *
 * AC#1: Modal with password field for re-authentication
 * AC#2: Edge Function supprime tout (profils, clothes, Storage, auth)
 * AC#3: Clear local state, déconnexion, redirection
 * AC#4: Wrong password → error message, button disabled
 *
 * Flow:
 * 1. Verify password via signInWithPassword (re-auth)
 * 2. Call delete-account Edge Function
 * 3. Clear MMKV + QueryClient
 * 4. Redirect to welcome screen
 */

import { useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import * as Sentry from '@sentry/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { storage, storageHelpers } from '@/lib/storage';
import { showToast } from '@/shared/components/Toast';

// ============================================
// Types
// ============================================

interface UseDeleteAccountOptions {
  /** User's email for re-authentication */
  userEmail: string;
  /** Callback when modal should close */
  onClose: () => void;
}

interface UseDeleteAccountReturn {
  // State
  password: string;
  isPending: boolean;
  error: string | null;

  // Actions
  setPassword: (value: string) => void;
  handleDelete: () => Promise<void>;
  resetAndClose: () => void;
}

/**
 * Map error message to French user-friendly text
 */
const mapDeleteAccountError = (error: string): string => {
  const lowerError = error.toLowerCase();

  if (
    lowerError.includes('invalid login credentials') ||
    lowerError.includes('invalid credentials')
  ) {
    return 'Mot de passe incorrect';
  }

  if (lowerError.includes('network') || lowerError.includes('fetch')) {
    return 'Erreur de connexion. Vérifiez votre connexion internet.';
  }

  if (lowerError.includes('rate limit') || lowerError.includes('too many')) {
    return 'Trop de tentatives. Veuillez réessayer dans quelques minutes.';
  }

  return 'Une erreur est survenue lors de la suppression du compte';
};

// ============================================
// Hook
// ============================================

/**
 * Hook for managing DeleteAccountModal state and logic
 *
 * @example
 * ```tsx
 * const {
 *   password, isPending, error,
 *   setPassword, handleDelete, resetAndClose
 * } = useDeleteAccount({
 *   userEmail,
 *   onClose,
 * });
 * ```
 */
export const useDeleteAccount = ({
  userEmail,
  onClose,
}: UseDeleteAccountOptions): UseDeleteAccountReturn => {
  // State
  const [password, setPasswordState] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Set password and clear any existing error (Issue #3 fix)
   */
  const setPassword = useCallback((value: string) => {
    setError(null);
    setPasswordState(value);
  }, []);

  // Hooks
  const queryClient = useQueryClient();
  const router = useRouter();

  /**
   * Reset state and close modal
   */
  const resetAndClose = useCallback(() => {
    setPassword('');
    setError(null);
    onClose();
  }, [onClose]);

  /**
   * Clear all local state after deletion (AC#3)
   */
  const clearLocalState = useCallback(async () => {
    try {
      // Clear MMKV/AsyncStorage
      await storageHelpers.clearAll();

      // Clear TanStack Query cache
      queryClient.clear();

      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Local state cleared after account deletion',
        level: 'info',
      });
    } catch (err) {
      Sentry.captureException(err, {
        tags: { feature: 'settings', action: 'clearLocalState' },
      });
    }
  }, [queryClient]);

  /**
   * Handle account deletion
   */
  const handleDelete = useCallback(async () => {
    // Check Supabase configuration
    if (!isSupabaseConfigured()) {
      setError("Le service n'est pas configuré");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // Validate password not empty
    if (!password.trim()) {
      setError('Veuillez entrer votre mot de passe');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      // Step 1: Re-authenticate with password (AC#1, AC#4)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: password.trim(),
      });

      if (signInError) {
        const errorMessage = mapDeleteAccountError(signInError.message);
        setError(errorMessage);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        Sentry.captureException(signInError, {
          tags: { feature: 'settings', action: 'deleteAccount', step: 'reauth' },
        });
        return;
      }

      // Step 2: Get current session for Edge Function call
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError('Session invalide. Veuillez vous reconnecter.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      // Step 3: Call delete-account Edge Function (AC#2)
      const { data, error: functionError } = await supabase.functions.invoke('delete-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (functionError) {
        const errorMessage = mapDeleteAccountError(functionError.message);
        setError(errorMessage);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        Sentry.captureException(functionError, {
          tags: { feature: 'settings', action: 'deleteAccount', step: 'edgeFunction' },
        });
        return;
      }

      // Check response for errors
      if (data?.error) {
        const errorMessage = mapDeleteAccountError(data.error);
        setError(errorMessage);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      // Step 4: Clear local state (AC#3)
      await clearLocalState();

      // Step 5: Sign out locally
      await supabase.auth.signOut();

      // Success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast({
        type: 'success',
        message: 'Votre compte a été supprimé avec succès',
      });

      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Account deleted successfully',
        level: 'info',
      });

      // Step 6: Redirect to welcome screen (AC#3)
      router.replace('/(auth)/welcome');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inattendue';
      setError(mapDeleteAccountError(errorMessage));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      Sentry.captureException(err, {
        tags: { feature: 'settings', action: 'deleteAccount' },
      });
    } finally {
      setIsPending(false);
    }
  }, [password, userEmail, clearLocalState, router]);

  return {
    // State
    password,
    isPending,
    error,

    // Actions
    setPassword,
    handleDelete,
    resetAndClose,
  };
};
