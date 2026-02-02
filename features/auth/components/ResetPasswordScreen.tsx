/**
 * ResetPasswordScreen Component
 * Story 1.4: Réinitialisation Mot de Passe
 *
 * Password reset confirmation form after user clicks email link.
 *
 * AC#2: Link expires after 1 hour (handled by Supabase)
 * AC#3: New password must meet security criteria (8 chars, uppercase, lowercase, digit)
 * AC#4: All existing sessions invalidated after password change
 * AC#10: Real-time password criteria validation with visual indicators
 */

import React, { useState, useCallback, useMemo } from 'react';
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

import { validatePassword, validateConfirmPassword } from '../hooks/useFormValidation';
import { authService } from '../services/authService';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedView = Animated.createAnimatedComponent(View);

interface FormState {
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  password: string | null;
  confirmPassword: string | null;
  general: string | null;
}

interface FormTouched {
  password: boolean;
  confirmPassword: boolean;
}

interface PasswordCriteria {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
}

const CRITERIA_LABELS: Record<keyof PasswordCriteria, string> = {
  minLength: '8 caractères minimum',
  hasUppercase: 'Une lettre majuscule',
  hasLowercase: 'Une lettre minuscule',
  hasNumber: 'Un chiffre',
};

export const ResetPasswordScreen: React.FC = () => {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Form state
  const [form, setForm] = useState<FormState>({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<FormErrors>({
    password: null,
    confirmPassword: null,
    general: null,
  });
  const [touched, setTouched] = useState<FormTouched>({ password: false, confirmPassword: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Animation values
  const ctaScale = useSharedValue(1);
  const passwordShake = useSharedValue(0);
  const confirmShake = useSharedValue(0);
  const generalShake = useSharedValue(0);

  // Password criteria (AC#10 - real-time validation)
  const passwordCriteria = useMemo<PasswordCriteria>(
    () => ({
      minLength: form.password.length >= 8,
      hasUppercase: /[A-Z]/.test(form.password),
      hasLowercase: /[a-z]/.test(form.password),
      hasNumber: /[0-9]/.test(form.password),
    }),
    [form.password]
  );

  const isPasswordValid = useMemo(
    () => Object.values(passwordCriteria).every(Boolean),
    [passwordCriteria]
  );

  const isFormValid = useMemo(
    () =>
      isPasswordValid && form.password === form.confirmPassword && form.confirmPassword.length > 0,
    [isPasswordValid, form.password, form.confirmPassword]
  );

  // Shake animation
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

  // Handle password change with haptic feedback on criteria completion
  const handlePasswordChange = useCallback(
    (text: string) => {
      const prevCriteria = passwordCriteria;
      setForm((prev) => ({ ...prev, password: text }));

      // Check if any new criteria was just met
      const newCriteria: PasswordCriteria = {
        minLength: text.length >= 8,
        hasUppercase: /[A-Z]/.test(text),
        hasLowercase: /[a-z]/.test(text),
        hasNumber: /[0-9]/.test(text),
      };

      // Haptic feedback when a criteria is met (AC#10)
      const criteriaKeys = Object.keys(newCriteria) as (keyof PasswordCriteria)[];
      criteriaKeys.forEach((key) => {
        if (newCriteria[key] && !prevCriteria[key]) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      });

      if (touched.password) {
        const result = validatePassword(text);
        setErrors((prev) => ({
          ...prev,
          password: result.isValid ? null : result.errors[0],
        }));
      }
    },
    [touched.password, passwordCriteria]
  );

  const handleConfirmPasswordChange = useCallback(
    (text: string) => {
      setForm((prev) => ({ ...prev, confirmPassword: text }));
      if (touched.confirmPassword) {
        const result = validateConfirmPassword(form.password, text);
        setErrors((prev) => ({
          ...prev,
          confirmPassword: result.isValid ? null : result.errors[0],
        }));
      }
    },
    [touched.confirmPassword, form.password]
  );

  const handlePasswordBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, password: true }));
    const result = validatePassword(form.password);
    setErrors((prev) => ({ ...prev, password: result.isValid ? null : result.errors[0] }));
  }, [form.password]);

  const handleConfirmPasswordBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, confirmPassword: true }));
    const result = validateConfirmPassword(form.password, form.confirmPassword);
    setErrors((prev) => ({ ...prev, confirmPassword: result.isValid ? null : result.errors[0] }));
  }, [form.password, form.confirmPassword]);

  // Navigation
  const handleBackToLogin = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(auth)/login');
  }, [router]);

  // CTA animation
  const handleCtaPressIn = useCallback(() => {
    ctaScale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  }, [ctaScale]);

  const handleCtaPressOut = useCallback(() => {
    ctaScale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [ctaScale]);

  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));

  const passwordShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: passwordShake.value }],
  }));

  const confirmShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: confirmShake.value }],
  }));

  const generalShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: generalShake.value }],
  }));

  // Toggle password visibility
  const togglePasswordVisibility = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPassword((prev) => !prev);
  }, []);

  const toggleConfirmPasswordVisibility = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowConfirmPassword((prev) => !prev);
  }, []);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    setErrors((prev) => ({ ...prev, general: null }));
    setTouched({ password: true, confirmPassword: true });

    const passwordResult = validatePassword(form.password);
    const confirmResult = validateConfirmPassword(form.password, form.confirmPassword);

    if (!passwordResult.isValid) {
      triggerShake(passwordShake);
      setErrors((prev) => ({ ...prev, password: passwordResult.errors[0] }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!confirmResult.isValid) {
      triggerShake(confirmShake);
      setErrors((prev) => ({ ...prev, confirmPassword: confirmResult.errors[0] }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);

    try {
      const result = await authService.confirmPasswordReset(form.password);

      if (result.error) {
        setErrors((prev) => ({ ...prev, general: result.error?.message || 'Erreur' }));
        triggerShake(generalShake);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        // Clear passwords on error
        setForm({ password: '', confirmPassword: '' });
        setIsLoading(false);
        return;
      }

      // Success - show confirmation
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Clear sensitive data
      setForm({ password: '', confirmPassword: '' });
      setIsSuccess(true);
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
  }, [form, triggerShake, passwordShake, confirmShake, generalShake]);

  const placeholderColor = isDark ? '#9CA3AF' : '#6B7280';

  // Success state
  if (isSuccess) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
        <Animated.View
          entering={FadeIn.duration(300)}
          className="flex-1 items-center justify-center px-6">
          <Ionicons name="checkmark-circle-outline" size={64} color="#22c55e" />
          <Text className="mt-4 text-center text-2xl font-bold text-gray-900 dark:text-white">
            Mot de passe réinitialisé !
          </Text>
          <Text className="mt-2 px-4 text-center text-gray-600 dark:text-gray-400">
            Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter.
          </Text>
          <Pressable
            testID="success-login-button"
            className="mt-8 min-h-[56px] w-full items-center justify-center rounded-2xl bg-blue-600 dark:bg-blue-500"
            onPress={handleBackToLogin}
            accessibilityRole="button"
            accessibilityLabel="Se connecter">
            <Text className="text-lg font-semibold text-white">Se connecter</Text>
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
                Nouveau mot de passe
              </Text>
              <Text className="mt-2 text-center text-base text-gray-600 dark:text-gray-400">
                Choisissez un mot de passe sécurisé pour votre compte.
              </Text>
            </View>

            {/* Form */}
            <View className="space-y-4">
              {/* Password Field */}
              <AnimatedView style={passwordShakeStyle}>
                <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nouveau mot de passe
                </Text>
                <View className="relative">
                  <TextInput
                    testID="reset-password-input"
                    className={`h-12 rounded-lg bg-gray-100 px-4 pr-12 text-gray-900 dark:bg-gray-800 dark:text-white ${
                      touched.password && errors.password ? 'border border-red-500' : ''
                    }`}
                    placeholder="Nouveau mot de passe"
                    placeholderTextColor={placeholderColor}
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
                    autoCorrect={false}
                    value={form.password}
                    onChangeText={handlePasswordChange}
                    onBlur={handlePasswordBlur}
                    accessibilityLabel="Nouveau mot de passe"
                  />
                  <Pressable
                    onPress={togglePasswordVisibility}
                    className="absolute right-0 top-0 h-12 w-12 items-center justify-center"
                    accessibilityLabel={
                      showPassword ? 'Masquer mot de passe' : 'Afficher mot de passe'
                    }
                    accessibilityRole="button">
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={24}
                      color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                  </Pressable>
                </View>

                {/* Password Criteria Indicator (AC#10) */}
                <View className="mt-2 space-y-1">
                  {(Object.keys(passwordCriteria) as (keyof PasswordCriteria)[]).map((key) => (
                    <View key={key} className="flex-row items-center">
                      <Ionicons
                        name={passwordCriteria[key] ? 'checkmark-circle' : 'ellipse-outline'}
                        size={16}
                        color={passwordCriteria[key] ? '#22c55e' : '#9CA3AF'}
                        testID={`criteria-${key}-icon`}
                      />
                      <Text
                        className={`ml-2 text-sm ${
                          passwordCriteria[key]
                            ? 'text-green-500 dark:text-green-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                        {CRITERIA_LABELS[key]}
                      </Text>
                    </View>
                  ))}
                </View>
              </AnimatedView>

              {/* Confirm Password Field */}
              <AnimatedView style={confirmShakeStyle} className="mt-4">
                <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirmer le mot de passe
                </Text>
                <View className="relative">
                  <TextInput
                    testID="reset-confirm-password-input"
                    className={`h-12 rounded-lg bg-gray-100 px-4 pr-12 text-gray-900 dark:bg-gray-800 dark:text-white ${
                      touched.confirmPassword && errors.confirmPassword
                        ? 'border border-red-500'
                        : ''
                    }`}
                    placeholder="Confirmer le mot de passe"
                    placeholderTextColor={placeholderColor}
                    secureTextEntry={!showConfirmPassword}
                    autoComplete="new-password"
                    autoCorrect={false}
                    value={form.confirmPassword}
                    onChangeText={handleConfirmPasswordChange}
                    onBlur={handleConfirmPasswordBlur}
                    accessibilityLabel="Confirmer le mot de passe"
                  />
                  <Pressable
                    onPress={toggleConfirmPasswordVisibility}
                    className="absolute right-0 top-0 h-12 w-12 items-center justify-center"
                    accessibilityLabel={
                      showConfirmPassword ? 'Masquer confirmation' : 'Afficher confirmation'
                    }
                    accessibilityRole="button">
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off' : 'eye'}
                      size={24}
                      color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                  </Pressable>
                </View>
                {touched.confirmPassword && errors.confirmPassword && (
                  <Text className="mt-1 text-sm text-red-500">{errors.confirmPassword}</Text>
                )}
              </AnimatedView>

              {/* General Error Message */}
              {errors.general && (
                <AnimatedView
                  testID="reset-error-message"
                  style={generalShakeStyle}
                  className="mt-4 rounded-lg bg-red-100 p-3 dark:bg-red-900/30">
                  <Text className="text-center text-sm text-red-600 dark:text-red-400">
                    {errors.general}
                  </Text>
                </AnimatedView>
              )}

              {/* Submit Button */}
              <AnimatedPressable
                testID="reset-submit-button"
                style={ctaAnimatedStyle}
                onPress={handleSubmit}
                onPressIn={handleCtaPressIn}
                onPressOut={handleCtaPressOut}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="Réinitialiser le mot de passe"
                accessibilityState={{ disabled: isLoading }}
                className={`mt-6 min-h-[56px] items-center justify-center rounded-2xl ${
                  isFormValid && !isLoading
                    ? 'bg-blue-600 dark:bg-blue-500'
                    : 'bg-gray-300 dark:bg-gray-700'
                }`}>
                {isLoading ? (
                  <ActivityIndicator testID="reset-loading-indicator" color="white" />
                ) : (
                  <Text
                    className={`text-lg font-semibold ${
                      isFormValid ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                    Réinitialiser le mot de passe
                  </Text>
                )}
              </AnimatedPressable>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
