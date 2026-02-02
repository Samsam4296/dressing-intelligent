/**
 * ForgotPasswordScreen Component
 * Story 1.4: Réinitialisation Mot de Passe
 *
 * Password reset request form for users who forgot their password.
 *
 * AC#1: Request password reset with valid email → send reset email
 * AC#5: Accessibility (touch targets 44x44, contrast 4.5:1)
 * AC#6: Native dark mode support
 * AC#7: "Back to login" link visible and functional
 * AC#8: Clear error messages in French (unknown email, invalid format)
 * AC#9: Confirmation message displayed after email sent
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

import { validateEmail } from '../hooks/useFormValidation';
import { authService } from '../services/authService';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedView = Animated.createAnimatedComponent(View);

interface FormState {
  email: string;
}

interface FormErrors {
  email: string | null;
  general: string | null;
}

export const ForgotPasswordScreen: React.FC = () => {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Form state
  const [form, setForm] = useState<FormState>({ email: '' });
  const [errors, setErrors] = useState<FormErrors>({ email: null, general: null });
  const [touched, setTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  // Animation values
  const ctaScale = useSharedValue(1);
  const emailShake = useSharedValue(0);
  const generalShake = useSharedValue(0);

  // Shake animation for validation errors
  const triggerShake = useCallback((shakeValue: Animated.SharedValue<number>) => {
    shakeValue.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-4, { duration: 50 }),
      withTiming(4, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  }, []);

  // Check if form is valid
  const isFormValid = useCallback(() => {
    return validateEmail(form.email).isValid;
  }, [form.email]);

  // Validate email field
  const validateEmailField = useCallback(() => {
    const result = validateEmail(form.email);
    setErrors((prev) => ({
      ...prev,
      email: result.errors[0] || null,
    }));
    return result.isValid;
  }, [form.email]);

  // Handle email change with real-time validation
  const handleEmailChange = useCallback(
    (text: string) => {
      setForm({ email: text });
      if (touched) {
        const result = validateEmail(text);
        setErrors((prev) => ({
          ...prev,
          email: result.isValid ? null : result.errors[0],
          general: null, // Clear general error when typing
        }));
      }
    },
    [touched]
  );

  // Handle blur to mark field as touched
  const handleEmailBlur = useCallback(() => {
    setTouched(true);
    validateEmailField();
  }, [validateEmailField]);

  // Navigation handlers
  const handleBackPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleBackToLogin = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(auth)/login');
  }, [router]);

  // CTA button animation
  const handleCtaPressIn = useCallback(() => {
    ctaScale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  }, [ctaScale]);

  const handleCtaPressOut = useCallback(() => {
    ctaScale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [ctaScale]);

  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));

  // Shake animation styles
  const emailShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: emailShake.value }],
  }));

  const generalShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: generalShake.value }],
  }));

  // Submit handler
  const handleSubmit = useCallback(async () => {
    // Clear previous general error
    setErrors((prev) => ({ ...prev, general: null }));

    // Mark field as touched
    setTouched(true);

    // Validate email
    const emailValid = validateEmailField();

    if (!emailValid) {
      triggerShake(emailShake);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);

    try {
      const result = await authService.requestPasswordReset(form.email);

      if (result.error) {
        setErrors((prev) => ({ ...prev, general: result.error?.message || 'Erreur' }));
        triggerShake(generalShake);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setIsLoading(false);
        return;
      }

      // Success - show confirmation
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEmailSent(true);
    } catch {
      setErrors((prev) => ({
        ...prev,
        general: 'Une erreur inattendue est survenue',
      }));
      triggerShake(generalShake);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }, [validateEmailField, form.email, triggerShake, emailShake, generalShake]);

  const placeholderColor = isDark ? '#9CA3AF' : '#6B7280';

  // Success state (AC#9)
  if (isEmailSent) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
        <Animated.View
          entering={FadeIn.duration(300)}
          className="flex-1 items-center justify-center px-6">
          <Ionicons name="mail-outline" size={64} color="#22c55e" />
          <Text className="mt-4 text-center text-2xl font-bold text-gray-900 dark:text-white">
            Email envoyé !
          </Text>
          <Text className="mt-2 px-4 text-center text-gray-600 dark:text-gray-400">
            Consultez votre boîte mail et cliquez sur le lien pour réinitialiser votre mot de passe.
          </Text>
          <Text className="mt-4 text-center text-sm text-gray-500 dark:text-gray-500">
            Le lien expire dans 1 heure.
          </Text>
          <Pressable
            testID="success-back-to-login-button"
            className="mt-8 min-h-[44px] justify-center"
            onPress={handleBackToLogin}
            accessibilityRole="button"
            accessibilityLabel="Retour à la connexion">
            <Text className="font-semibold text-blue-600 dark:text-blue-400">
              Retour à la connexion
            </Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Animated.View
            entering={FadeIn.duration(500)}
            className="flex-1 justify-center px-6 py-8">
            {/* Header */}
            <View className="mb-8 items-center">
              <Text className="text-center text-3xl font-bold text-gray-900 dark:text-white">
                Mot de passe oublié ?
              </Text>
              <Text className="mt-2 text-center text-base text-gray-600 dark:text-gray-400">
                Entrez votre email pour recevoir un lien de réinitialisation.
              </Text>
            </View>

            {/* Form */}
            <View className="space-y-4">
              {/* Email Field */}
              <AnimatedView style={emailShakeStyle}>
                <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </Text>
                <TextInput
                  testID="forgot-email-input"
                  className={`h-12 rounded-lg bg-gray-100 px-4 text-gray-900 dark:bg-gray-800 dark:text-white ${
                    touched && errors.email ? 'border border-red-500' : ''
                  }`}
                  placeholder="votreemail@exemple.com"
                  placeholderTextColor={placeholderColor}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  value={form.email}
                  onChangeText={handleEmailChange}
                  onBlur={handleEmailBlur}
                  accessibilityLabel="Adresse email"
                />
                {touched && errors.email && (
                  <Text className="mt-1 text-sm text-red-500">{errors.email}</Text>
                )}
              </AnimatedView>

              {/* General Error Message (AC#8) */}
              {errors.general && (
                <AnimatedView
                  testID="forgot-error-message"
                  style={generalShakeStyle}
                  className="mt-4 rounded-lg bg-red-100 p-3 dark:bg-red-900/30">
                  <Text className="text-center text-sm text-red-600 dark:text-red-400">
                    {errors.general}
                  </Text>
                </AnimatedView>
              )}

              {/* Submit Button - Touch target min 56px (AC#5) */}
              <AnimatedPressable
                testID="forgot-submit-button"
                style={ctaAnimatedStyle}
                onPress={handleSubmit}
                onPressIn={handleCtaPressIn}
                onPressOut={handleCtaPressOut}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="Envoyer le lien de réinitialisation"
                accessibilityState={{ disabled: isLoading }}
                className={`mt-6 min-h-[56px] items-center justify-center rounded-2xl ${
                  isFormValid() && !isLoading
                    ? 'bg-blue-600 dark:bg-blue-500'
                    : 'bg-gray-300 dark:bg-gray-700'
                }`}>
                {isLoading ? (
                  <ActivityIndicator testID="forgot-loading-indicator" color="white" />
                ) : (
                  <Text
                    className={`text-lg font-semibold ${
                      isFormValid() ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                    Envoyer le lien
                  </Text>
                )}
              </AnimatedPressable>

              {/* Back to login link (AC#7) - Touch target min 44px */}
              <Pressable
                testID="forgot-back-link"
                onPress={handleBackPress}
                accessibilityRole="button"
                accessibilityLabel="Retour à la connexion"
                className="mt-6 min-h-[44px] items-center justify-center">
                <Text className="text-gray-600 dark:text-gray-400">
                  <Text className="text-blue-600 dark:text-blue-400">← Retour à la connexion</Text>
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
