/**
 * VerifyEmailScreen Component
 * Story 1.2: Création de Compte
 *
 * Displayed after successful signup to inform the user
 * to check their email for verification.
 *
 * AC#2: After successful signup, redirect to email verification screen
 */

import React, { useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

export const VerifyEmailScreen: React.FC = () => {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleBackToLogin = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(auth)/login');
  }, [router]);

  const handleResendEmail = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Implement resend email functionality
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
          Nous vous avons envoyé un email de vérification. Cliquez sur le lien dans l'email pour
          activer votre compte.
        </Text>

        {/* Info Box */}
        <View className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-8 w-full">
          <Text className="text-sm text-blue-800 dark:text-blue-200 text-center">
            N'oubliez pas de vérifier votre dossier spam si vous ne trouvez pas l'email.
          </Text>
        </View>

        {/* Resend Email Button */}
        <Pressable
          onPress={handleResendEmail}
          accessibilityRole="button"
          accessibilityLabel="Renvoyer l'email de vérification"
          className="min-h-[44px] items-center justify-center mb-4"
        >
          <Text className="text-base font-medium text-blue-600 dark:text-blue-400">
            Renvoyer l'email
          </Text>
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
