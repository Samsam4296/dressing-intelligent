/**
 * SignupScreen Component
 * Story 1.2: Création de Compte
 *
 * Signup form for new users with email/password validation,
 * Supabase Auth integration, and accessibility support.
 *
 * AC#1: Create account with valid email/password → Supabase Auth
 * AC#3: Password validation (8 chars, uppercase, lowercase, digit)
 * AC#5: Real-time validation errors displayed clearly
 * AC#6: Accessibility (touch targets 44x44, contrast 4.5:1)
 * AC#7: Native dark mode support
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
  type SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  getPasswordStrength,
  type PasswordStrength,
} from '../hooks/useFormValidation';
import { authService } from '../services/authService';
import * as Sentry from '@sentry/react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedView = Animated.createAnimatedComponent(View);

interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  email: string | null;
  password: string[] | null;
  confirmPassword: string | null;
  general: string | null;
}

interface FormTouched {
  email: boolean;
  password: boolean;
  confirmPassword: boolean;
}

// Password strength indicator component
const PasswordStrengthIndicator: React.FC<{
  password: string;
}> = ({ password }) => {
  if (!password) return null;

  const { strength, score } = getPasswordStrength(password);

  const getStrengthColor = (s: PasswordStrength): string => {
    switch (s) {
      case 'weak':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'strong':
        return 'bg-green-500';
    }
  };

  const getStrengthLabel = (s: PasswordStrength): string => {
    switch (s) {
      case 'weak':
        return 'Faible';
      case 'medium':
        return 'Moyen';
      case 'strong':
        return 'Fort';
    }
  };

  return (
    <View className="mt-2">
      <View className="h-1 flex-row overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            className={`mx-0.5 flex-1 rounded-full ${
              i <= score ? getStrengthColor(strength) : 'bg-transparent'
            }`}
          />
        ))}
      </View>
      <Text
        className={`mt-1 text-xs ${
          strength === 'weak'
            ? 'text-red-500'
            : strength === 'medium'
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-green-600 dark:text-green-400'
        }`}>
        {getStrengthLabel(strength)}
      </Text>
    </View>
  );
};

export const SignupScreen: React.FC = () => {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Form state
  const [form, setForm] = useState<FormState>({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<FormErrors>({
    email: null,
    password: null,
    confirmPassword: null,
    general: null,
  });

  const [touched, setTouched] = useState<FormTouched>({
    email: false,
    password: false,
    confirmPassword: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Animation values
  const ctaScale = useSharedValue(1);
  const emailShake = useSharedValue(0);
  const passwordShake = useSharedValue(0);
  const confirmShake = useSharedValue(0);

  // Shake animation for validation errors (AC#6)
  const triggerShake = useCallback((shakeValue: SharedValue<number>) => {
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
    const passwordValid = validatePassword(form.password).isValid;
    const confirmValid = validateConfirmPassword(form.password, form.confirmPassword).isValid;
    return emailValid && passwordValid && confirmValid;
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

  // Validate password on blur or when submitting
  const validatePasswordField = useCallback(() => {
    const result = validatePassword(form.password);
    setErrors((prev) => ({
      ...prev,
      password: result.errors.length > 0 ? result.errors : null,
    }));
    return result.isValid;
  }, [form.password]);

  // Validate confirm password on blur or when typing
  const validateConfirmField = useCallback(() => {
    const result = validateConfirmPassword(form.password, form.confirmPassword);
    setErrors((prev) => ({
      ...prev,
      confirmPassword: result.errors[0] || null,
    }));
    return result.isValid;
  }, [form.password, form.confirmPassword]);

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
      // Validate password in real-time if touched
      if (touched.password) {
        const result = validatePassword(text);
        setErrors((prev) => ({
          ...prev,
          password: result.errors.length > 0 ? result.errors : null,
        }));
      }
      // Re-validate confirm password if it exists
      if (form.confirmPassword && touched.confirmPassword) {
        const confirmResult = validateConfirmPassword(text, form.confirmPassword);
        setErrors((prev) => ({
          ...prev,
          confirmPassword: confirmResult.errors[0] || null,
        }));
      }
    },
    [touched.password, touched.confirmPassword, form.confirmPassword]
  );

  const handleConfirmPasswordChange = useCallback(
    (text: string) => {
      setForm((prev) => ({ ...prev, confirmPassword: text }));
      // Validate confirm password in real-time
      if (touched.confirmPassword || text.length > 0) {
        const result = validateConfirmPassword(form.password, text);
        setErrors((prev) => ({
          ...prev,
          confirmPassword: result.errors[0] || null,
        }));
      }
    },
    [form.password, touched.confirmPassword]
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

  const handleConfirmPasswordBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, confirmPassword: true }));
    validateConfirmField();
  }, [validateConfirmField]);

  // Navigation handlers
  const handleLoginPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(auth)/login');
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

  const confirmShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: confirmShake.value }],
  }));

  // Password visibility toggle
  const togglePasswordVisibility = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPassword((prev) => !prev);
  }, []);

  const toggleConfirmPasswordVisibility = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowConfirmPassword((prev) => !prev);
  }, []);

  // Submit handler with Supabase Auth integration
  const handleSignUp = useCallback(async () => {
    // Clear any previous general error
    setErrors((prev) => ({ ...prev, general: null }));

    // Mark all fields as touched to show all errors
    setTouched({ email: true, password: true, confirmPassword: true });

    // Validate all fields
    const emailValid = validateEmailField();
    const passwordValid = validatePasswordField();
    const confirmValid = validateConfirmField();

    if (!emailValid || !passwordValid || !confirmValid) {
      // Trigger shake animations for invalid fields (AC#6)
      if (!emailValid) triggerShake(emailShake);
      if (!passwordValid) triggerShake(passwordShake);
      if (!confirmValid) triggerShake(confirmShake);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);

    try {
      // Call Supabase Auth via authService
      const result = await authService.signUp({
        email: form.email,
        password: form.password,
      });

      if (result.error) {
        // Handle specific error types
        if (result.error.code === 'EMAIL_EXISTS') {
          setErrors((prev) => ({ ...prev, email: result.error!.message }));
        } else {
          setErrors((prev) => ({ ...prev, general: result.error!.message }));
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setIsLoading(false);
        return;
      }

      // Success - clear sensitive data from state (NFR-S6) and navigate
      setForm((prev) => ({ ...prev, password: '', confirmPassword: '' }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/(auth)/verify-email');
    } catch (err) {
      // Log error for debugging (no PII logged)
      Sentry.captureException(err, { tags: { feature: 'signup' } });
      setErrors((prev) => ({
        ...prev,
        general: 'Une erreur inattendue est survenue',
      }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }, [
    validateEmailField,
    validatePasswordField,
    validateConfirmField,
    router,
    form.email,
    form.password,
    triggerShake,
    emailShake,
    passwordShake,
    confirmShake,
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
                Créer un compte
              </Text>
              <Text className="mt-2 text-center text-base text-gray-600 dark:text-gray-400">
                Rejoignez Dressing Intelligent
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
                    className={`h-12 rounded-lg bg-gray-100 px-4 pr-12 text-gray-900 dark:bg-gray-800 dark:text-white ${
                      touched.password && errors.password ? 'border border-red-500' : ''
                    }`}
                    placeholder="Mot de passe"
                    placeholderTextColor={placeholderColor}
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
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
                {/* Password Strength Indicator */}
                <PasswordStrengthIndicator password={form.password} />
                {/* Password Errors */}
                {touched.password && errors.password && (
                  <View className="mt-1">
                    {errors.password.map((error, index) => (
                      <Text key={index} className="text-sm text-red-500">
                        • {error}
                      </Text>
                    ))}
                  </View>
                )}
              </AnimatedView>

              {/* Confirm Password Field */}
              <AnimatedView style={confirmShakeStyle} className="mt-4">
                <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirmer le mot de passe
                </Text>
                <View className="relative">
                  <TextInput
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
                    accessibilityRole="button"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
                <View className="mt-4 rounded-lg bg-red-100 p-3 dark:bg-red-900/30">
                  <Text className="text-center text-sm text-red-600 dark:text-red-400">
                    {errors.general}
                  </Text>
                </View>
              )}

              {/* Submit Button - Touch target min 56px */}
              <AnimatedPressable
                style={ctaAnimatedStyle}
                onPress={handleSignUp}
                onPressIn={handleCtaPressIn}
                onPressOut={handleCtaPressOut}
                disabled={!isFormValid() || isLoading}
                accessibilityRole="button"
                accessibilityLabel="Créer mon compte"
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
                    Créer mon compte
                  </Text>
                )}
              </AnimatedPressable>
            </View>

            {/* Login Link - Touch target min 44px */}
            <Pressable
              onPress={handleLoginPress}
              accessibilityRole="button"
              accessibilityLabel="Se connecter à un compte existant"
              className="mt-6 min-h-[44px] items-center justify-center">
              <Text className="text-base text-gray-600 dark:text-gray-400">
                Déjà un compte ?{' '}
                <Text className="font-semibold text-blue-600 dark:text-blue-400">Se connecter</Text>
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
