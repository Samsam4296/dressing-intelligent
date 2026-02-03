/**
 * useShakeAnimation Hook
 * Code Review Fix #3: Extracted reusable shake animation pattern
 *
 * Provides shake animation for form validation feedback.
 * Used by ForgotPasswordScreen, ResetPasswordScreen, LoginScreen, SignupScreen.
 */

import { useCallback } from 'react';
import type { ViewStyle } from 'react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  type SharedValue,
  type AnimatedStyle,
} from 'react-native-reanimated';

interface UseShakeAnimationReturn {
  /** Shared value for shake offset (use in useAnimatedStyle) */
  shakeValue: SharedValue<number>;
  /** Animated style with translateX transform (typed for ViewStyle) */
  shakeStyle: AnimatedStyle<ViewStyle>;
  /** Trigger shake animation */
  triggerShake: () => void;
}

/**
 * Hook for reusable shake animation on form validation errors
 *
 * @example
 * ```tsx
 * const { shakeStyle, triggerShake } = useShakeAnimation();
 *
 * const handleError = () => {
 *   triggerShake();
 *   Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
 * };
 *
 * return (
 *   <Animated.View style={shakeStyle}>
 *     <TextInput ... />
 *   </Animated.View>
 * );
 * ```
 */
export const useShakeAnimation = (): UseShakeAnimationReturn => {
  const shakeValue = useSharedValue(0);

  const shakeStyle = useAnimatedStyle<ViewStyle>(() => ({
    transform: [{ translateX: shakeValue.value }],
  }));

  const triggerShake = useCallback(() => {
    shakeValue.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-4, { duration: 50 }),
      withTiming(4, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  }, [shakeValue]);

  return {
    shakeValue,
    shakeStyle,
    triggerShake,
  };
};
