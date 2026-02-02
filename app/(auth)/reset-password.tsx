/**
 * Reset Password Screen Route
 * Story 1.4: Réinitialisation Mot de Passe
 *
 * Deep link target for password reset from email.
 * Handles token validation from URL and renders reset form.
 *
 * AC#2: Link expires after 1 hour (handled by Supabase token)
 */

import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sentry from '@sentry/react-native';

import { ResetPasswordScreen } from '@/features/auth';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const params = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
    type?: string;
    token_hash?: string;
  }>();
  const router = useRouter();
  const [isValidToken, setIsValidToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleTokenFromUrl = async () => {
      const { access_token, refresh_token, type, token_hash } = params;

      // Supabase sends recovery tokens via deep link
      if (type === 'recovery' && access_token && refresh_token) {
        try {
          // Restore session with the recovery token
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (!error) {
            setIsValidToken(true);
          } else {
            // Token expired or invalid (1h expiration)
            Sentry.captureMessage('Password reset token validation failed', {
              level: 'warning',
              tags: { feature: 'auth', action: 'resetPasswordTokenValidation' },
            });
            setError('Le lien a expiré. Veuillez demander un nouveau lien de réinitialisation.');
          }
        } catch (err) {
          Sentry.captureException(err, {
            tags: { feature: 'auth', action: 'resetPasswordTokenValidation' },
          });
          setError('Une erreur est survenue. Veuillez réessayer.');
        }
      } else if (token_hash) {
        // Some Supabase configurations use token_hash instead
        // Code Review Fix #4: Validate token_hash format before API call
        if (token_hash.length < 10 || token_hash.length > 500) {
          Sentry.captureMessage('Invalid token_hash format', {
            level: 'warning',
            tags: { feature: 'auth', action: 'resetPasswordTokenValidation' },
            extra: { tokenLength: token_hash.length },
          });
          setError('Lien invalide. Veuillez redemander un lien de réinitialisation.');
          setIsLoading(false);
          return;
        }

        try {
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: 'recovery',
          });

          if (!error) {
            setIsValidToken(true);
          } else {
            setError('Le lien a expiré. Veuillez demander un nouveau lien de réinitialisation.');
          }
        } catch (err) {
          Sentry.captureException(err, {
            tags: { feature: 'auth', action: 'resetPasswordTokenValidation' },
          });
          setError('Une erreur est survenue. Veuillez réessayer.');
        }
      } else {
        // No valid tokens - redirect to forgot password
        setError('Lien invalide. Veuillez redemander un lien de réinitialisation.');
      }
      setIsLoading(false);
    };

    handleTokenFromUrl();
  }, [params]);

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="mt-4 text-gray-600 dark:text-gray-400">Vérification du lien...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-xl font-bold text-gray-900 dark:text-white">
            Lien expiré
          </Text>
          <Text className="mt-2 text-center text-gray-600 dark:text-gray-400">{error}</Text>
          <View className="mt-8 w-full">
            <Text
              className="text-center font-semibold text-blue-600 dark:text-blue-400"
              onPress={() => router.replace('/(auth)/forgot-password')}>
              Demander un nouveau lien
            </Text>
          </View>
          <View className="mt-4 w-full">
            <Text
              className="text-center text-gray-500 dark:text-gray-500"
              onPress={() => router.replace('/(auth)/login')}>
              Retour à la connexion
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Valid token - show reset form
  if (!isValidToken) {
    return null; // Redirect in progress
  }

  return <ResetPasswordScreen />;
}
