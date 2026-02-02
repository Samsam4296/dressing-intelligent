/**
 * VerifyEmailScreen Component
 * Story 1.2: Création de Compte
 *
 * Displayed after successful signup to inform the user
 * to check their email for verification.
 *
 * AC#2: After successful signup, redirect to email verification screen
 */

import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { supabase } from '@/lib/supabase';

export const VerifyEmailScreen: React.FC = () => {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const handleBackToLogin = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(auth)/login');
  }, [router]);

  const handleResendEmail = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsResending(true);
    setResendMessage(null);

    try {
      // Get the current session to retrieve the user's email
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user?.email) {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: session.user.email,
        });

        if (error) {
          setResendMessage('Erreur lors de l\'envoi. Veuillez réessayer.');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else {
          setResendMessage('Email envoyé avec succès !');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        setResendMessage('Session expirée. Veuillez vous reconnecter.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch {
      setResendMessage('Une erreur inattendue est survenue.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsResending(false);
    }
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <Animated.View
        entering={FadeIn.duration(500)}
        className="flex-1 justify-center items-center px-6"
      >
        {/* Email Icon */}
        <View className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/30 items-center justify-center mb-8">
          <Ionicons
            name="mail-outline"
            size={48}
            color={isDark ? '#60A5FA' : '#2563EB'}
          />
        </View>

        {/* Title */}
        <Text className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-4">
          Vérifiez votre email
        </Text>

        {/* Description */}
        <Text className="text-base text-gray-600 dark:text-gray-400 text-center mb-8 px-4">
          Nous vous avons envoyé un email de vérification. Cliquez sur le lien dans le message pour
          activer votre compte.
        </Text>

        {/* Info Box */}
        <View className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-8 w-full">
          <Text className="text-sm text-blue-800 dark:text-blue-200 text-center">
            Pensez à vérifier votre dossier spam si vous ne trouvez pas le message.
          </Text>
        </View>

        {/* Resend Status Message */}
        {resendMessage && (
          <Text
            className={`text-sm text-center mb-4 ${
              resendMessage.includes('succès')
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-500'
            }`}
          >
            {resendMessage}
          </Text>
        )}

        {/* Resend Email Button */}
        <Pressable
          onPress={handleResendEmail}
          disabled={isResending}
          accessibilityRole="button"
          accessibilityLabel="Renvoyer l'email de vérification"
          accessibilityState={{ disabled: isResending }}
          className="min-h-[44px] items-center justify-center mb-4"
        >
          {isResending ? (
            <ActivityIndicator size="small" color={isDark ? '#60A5FA' : '#2563EB'} />
          ) : (
            <Text className="text-base font-medium text-blue-600 dark:text-blue-400">
              Renvoyer le message
            </Text>
          )}
        </Pressable>

        {/* Back to Login Button */}
        <Pressable
          onPress={handleBackToLogin}
          accessibilityRole="button"
          accessibilityLabel="Retourner à la page de connexion"
          className="min-h-[56px] w-full items-center justify-center rounded-2xl bg-blue-600 dark:bg-blue-500"
        >
          <Text className="text-lg font-semibold text-white">
            Retour à la connexion
          </Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
};
