/**
 * LoginScreen Component
 * Story 1.3: Connexion Utilisateur
 *
 * Login form for existing users with email/password validation,
 * Supabase Auth integration, and accessibility support.
 *
 * AC#1: Authenticate with valid credentials → redirect to main screen
 * AC#5: Display clear error messages (unknown email, incorrect password)
 * AC#6: Accessibility (touch targets 44x44, contrast 4.5:1)
 * AC#7: Native dark mode support
 * AC#8: "Forgot password?" link visible and functional
 * AC#9: "Create account" link visible (navigation to signup)
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
  password: string;
}

interface FormErrors {
  email: string | null;
  password: string | null;
  general: string | null;
}

interface FormTouched {
  email: boolean;
  password: boolean;
}

export const LoginScreen: React.FC = () => {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Form state
  const [form, setForm] = useState<FormState>({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<FormErrors>({
    email: null,
    password: null,
    general: null,
  });

  const [touched, setTouched] = useState<FormTouched>({
    email: false,
    password: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Animation values
  const ctaScale = useSharedValue(1);
  const emailShake = useSharedValue(0);
  const passwordShake = useSharedValue(0);
  const generalShake = useSharedValue(0);

  // Shake animation for validation errors (AC#6)
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

  // Check if form is valid for submission
  const isFormValid = useCallback(() => {
    const emailValid = validateEmail(form.email).isValid;
    const passwordValid = form.password.length > 0;
    return emailValid && passwordValid;
  }, [form]);

  // Validate email on blur or when submitting
  const validateEmailField = useCallback(() => {
    const result = validateEmail(form.email);
    setErrors((prev) => ({
      ...prev,
      email: result.errors[0] || null,
    }));
    return result.isValid;
  }, [form.email]);

  // Validate password is not empty
  const validatePasswordField = useCallback(() => {
    const isValid = form.password.length > 0;
    setErrors((prev) => ({
      ...prev,
      password: isValid ? null : 'Mot de passe requis',
    }));
    return isValid;
  }, [form.password]);

  // Handle form field changes with real-time validation
  const handleEmailChange = useCallback(
    (text: string) => {
      setForm((prev) => ({ ...prev, email: text }));
      // Clear error when user starts typing
      if (touched.email) {
        const result = validateEmail(text);
        setErrors((prev) => ({
          ...prev,
          email: result.isValid ? null : result.errors[0],
        }));
      }
    },
    [touched.email]
  );

  const handlePasswordChange = useCallback(
    (text: string) => {
      setForm((prev) => ({ ...prev, password: text }));
      // Clear error when user starts typing
      if (touched.password) {
        setErrors((prev) => ({
          ...prev,
          password: text.length > 0 ? null : 'Mot de passe requis',
        }));
      }
    },
    [touched.password]
  );

  // Handle blur events to mark fields as touched
  const handleEmailBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, email: true }));
    validateEmailField();
  }, [validateEmailField]);

  const handlePasswordBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, password: true }));
    validatePasswordField();
  }, [validatePasswordField]);

  // Navigation handlers
  const handleSignupPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(auth)/signup');
  }, [router]);

  const handleForgotPasswordPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(auth)/forgot-password');
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

  // Shake animation styles for validation errors
  const emailShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: emailShake.value }],
  }));

  const passwordShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: passwordShake.value }],
  }));

  const generalShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: generalShake.value }],
  }));

  // Password visibility toggle
  const togglePasswordVisibility = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPassword((prev) => !prev);
  }, []);

  // Submit handler with Supabase Auth integration
  const handleSignIn = useCallback(async () => {
    // Clear any previous general error
    setErrors((prev) => ({ ...prev, general: null }));

    // Mark all fields as touched to show all errors
    setTouched({ email: true, password: true });

    // Validate all fields
    const emailValid = validateEmailField();
    const passwordValid = validatePasswordField();

    if (!emailValid || !passwordValid) {
      // Trigger shake animations for invalid fields (AC#6)
      if (!emailValid) triggerShake(emailShake);
      if (!passwordValid) triggerShake(passwordShake);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);

    try {
      // Call Supabase Auth via authService
      const result = await authService.signIn({
        email: form.email,
        password: form.password,
      });

      if (result.error) {
        // Display error message (AC#5)
        setErrors((prev) => ({ ...prev, general: result.error?.message || 'Erreur de connexion' }));
        triggerShake(generalShake);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        // Clear password from state on error (security best practice - NFR-S6)
        setForm((prev) => ({ ...prev, password: '' }));
        setIsLoading(false);
        return;
      }

      // Success - clear sensitive data from state (NFR-S6) and navigate
      setForm((prev) => ({ ...prev, password: '' }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Navigation handled by auth state change in _layout.tsx
    } catch (err) {
      // Unexpected error
      setErrors((prev) => ({
        ...prev,
        general: 'Une erreur inattendue est survenue',
      }));
      triggerShake(generalShake);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }, [
    validateEmailField,
    validatePasswordField,
    form.email,
    form.password,
    triggerShake,
    emailShake,
    passwordShake,
    generalShake,
  ]);

  const placeholderColor = isDark ? '#9CA3AF' : '#6B7280';

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
                Connexion
              </Text>
              <Text className="mt-2 text-center text-base text-gray-600 dark:text-gray-400">
                Bienvenue sur Dressing Intelligent
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
                  testID="login-email-input"
                  className={`h-12 rounded-lg bg-gray-100 px-4 text-gray-900 dark:bg-gray-800 dark:text-white ${
                    touched.email && errors.email ? 'border border-red-500' : ''
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
                {touched.email && errors.email && (
                  <Text className="mt-1 text-sm text-red-500">{errors.email}</Text>
                )}
              </AnimatedView>

              {/* Password Field */}
              <AnimatedView style={passwordShakeStyle} className="mt-4">
                <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mot de passe
                </Text>
                <View className="relative">
                  <TextInput
                    testID="login-password-input"
                    className={`h-12 rounded-lg bg-gray-100 px-4 pr-12 text-gray-900 dark:bg-gray-800 dark:text-white ${
                      touched.password && errors.password ? 'border border-red-500' : ''
                    }`}
                    placeholder="Mot de passe"
                    placeholderTextColor={placeholderColor}
                    secureTextEntry={!showPassword}
                    autoComplete="current-password"
                    autoCorrect={false}
                    value={form.password}
                    onChangeText={handlePasswordChange}
                    onBlur={handlePasswordBlur}
                    accessibilityLabel="Mot de passe"
                  />
                  <Pressable
                    onPress={togglePasswordVisibility}
                    className="absolute right-0 top-0 h-12 w-12 items-center justify-center"
                    accessibilityLabel={
                      showPassword ? 'Masquer mot de passe' : 'Afficher mot de passe'
                    }
                    accessibilityRole="button"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={24}
                      color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                  </Pressable>
                </View>
                {touched.password && errors.password && (
                  <Text className="mt-1 text-sm text-red-500">{errors.password}</Text>
                )}
              </AnimatedView>

              {/* Forgot Password Link (AC#8) - Touch target min 44px */}
              <Pressable
                testID="login-forgot-password-link"
                onPress={handleForgotPasswordPress}
                accessibilityRole="button"
                accessibilityLabel="Mot de passe oublié"
                className="mt-2 min-h-[44px] justify-center self-end">
                <Text className="text-sm text-blue-600 dark:text-blue-400">
                  Mot de passe oublié ?
                </Text>
              </Pressable>

              {/* General Error Message (AC#5) */}
              {errors.general && (
                <AnimatedView
                  testID="login-error-message"
                  style={generalShakeStyle}
                  className="mt-4 rounded-lg bg-red-100 p-3 dark:bg-red-900/30">
                  <Text className="text-center text-sm text-red-600 dark:text-red-400">
                    {errors.general}
                  </Text>
                </AnimatedView>
              )}

              {/* Submit Button - Touch target min 56px (AC#6) */}
              <AnimatedPressable
                testID="login-submit-button"
                style={ctaAnimatedStyle}
                onPress={handleSignIn}
                onPressIn={handleCtaPressIn}
                onPressOut={handleCtaPressOut}
                disabled={!isFormValid() || isLoading}
                accessibilityRole="button"
                accessibilityLabel="Se connecter"
                accessibilityState={{ disabled: !isFormValid() || isLoading }}
                className={`mt-6 min-h-[56px] items-center justify-center rounded-2xl ${
                  isFormValid() && !isLoading
                    ? 'bg-blue-600 dark:bg-blue-500'
                    : 'bg-gray-300 dark:bg-gray-700'
                }`}>
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text
                    className={`text-lg font-semibold ${
                      isFormValid() ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                    Se connecter
                  </Text>
                )}
              </AnimatedPressable>
            </View>

            {/* Signup Link (AC#9) - Touch target min 44px */}
            <Pressable
              testID="login-signup-link"
              onPress={handleSignupPress}
              accessibilityRole="button"
              accessibilityLabel="Créer un compte"
              className="mt-6 min-h-[44px] items-center justify-center">
              <Text className="text-base text-gray-600 dark:text-gray-400">
                Pas encore de compte ?{' '}
                <Text className="font-semibold text-blue-600 dark:text-blue-400">
                  Créer un compte
                </Text>
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
