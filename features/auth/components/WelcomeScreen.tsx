/**
 * WelcomeScreen Component
 * Story 1.1: Écran de Bienvenue
 *
 * First screen shown to new users with branding, value proposition,
 * and navigation to signup/login flows.
 *
 * AC#1: Branding and value proposition visible
 * AC#2: Prominent "Créer un compte" CTA button
 * AC#3: "Déjà un compte ? Se connecter" secondary link
 * AC#4: 60fps animations (implemented in Task 3)
 * AC#5: Touch targets >= 44x44 points
 * AC#6: Dark mode support (implemented in Task 4)
 * AC#7: Contrast ratio >= 4.5:1
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const WelcomeScreen: React.FC = () => {
  const router = useRouter();
  const ctaScale = useSharedValue(1);

  const handleSignupPress = () => {
    router.push('/(auth)/signup');
  };

  const handleLoginPress = () => {
    router.push('/(auth)/login');
  };

  const handleCtaPressIn = () => {
    ctaScale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  };

  const handleCtaPressOut = () => {
    ctaScale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      {/* Main Content Container */}
      <Animated.View
        entering={FadeIn.duration(500)}
        className="flex-1 items-center justify-center px-6">
        {/* Logo/Branding Section */}
        <View className="mb-8 items-center">
          {/* Logo placeholder - can be replaced with actual logo image */}
          <View className="mb-6 h-24 w-24 items-center justify-center rounded-3xl bg-blue-500 dark:bg-blue-400">
            <Text className="text-4xl text-white">👔</Text>
          </View>

          {/* App Name */}
          <Text className="mb-4 text-center text-3xl font-bold text-gray-900 dark:text-white">
            Dressing Intelligent
          </Text>

          {/* Value Proposition */}
          <Text className="px-4 text-center text-lg text-gray-600 dark:text-gray-300">
            Vos tenues du jour en 5 secondes
          </Text>
        </View>
      </Animated.View>

      {/* Bottom Actions Section */}
      <View className="px-6 pb-8">
        {/* Primary CTA Button - AC#2, AC#5 (touch target >= 44x44) */}
        <AnimatedPressable
          style={ctaAnimatedStyle}
          onPress={handleSignupPress}
          onPressIn={handleCtaPressIn}
          onPressOut={handleCtaPressOut}
          accessibilityRole="button"
          accessibilityLabel="Créer un compte"
          className="mb-4 min-h-[56px] items-center justify-center rounded-2xl bg-blue-600 dark:bg-blue-500">
          <Text className="text-lg font-semibold text-white">Créer un compte</Text>
        </AnimatedPressable>

        {/* Secondary Action - AC#3, AC#5 (touch target >= 44x44) */}
        <Pressable
          onPress={handleLoginPress}
          accessibilityRole="button"
          accessibilityLabel="Se connecter à un compte existant"
          className="min-h-[44px] items-center justify-center">
          <Text className="text-base text-gray-600 dark:text-gray-400">
            Déjà un compte ?{' '}
            <Text className="font-semibold text-blue-600 dark:text-blue-400">Se connecter</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};
