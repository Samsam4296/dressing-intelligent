/**
 * TrialScreen Component
 * Story 1.11: Démarrage Essai Gratuit
 *
 * Displays the trial offer after profile creation with options
 * to start a free trial or skip.
 *
 * AC#1: Bouton "Commencer 7 jours gratuits" + prix localisé + lien "Passer"
 * AC#2: Loading spinner pendant traitement
 * AC#4: Haptics.success, toast "Bienvenue ! Essai gratuit activé", redirection Home
 * AC#5: Passer → Haptics.light, redirection Home avec status 'none'
 * AC#6: Cancel/échec → Haptics.error, toast erreur français, reste sur écran
 * AC#7: Dark mode, touch targets 44x44, accessibility labels
 *
 * NFR-A1: Touch targets >= 44x44 points
 * NFR-P1: 60fps animations using Reanimated
 */

import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useStartTrial } from '../hooks/useStartTrial';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Default price display if product not available
const DEFAULT_PRICE = '4,99 €/mois';
const TRIAL_DAYS = 7;

/**
 * Trial screen shown after first profile creation
 */
export const TrialScreen: React.FC = () => {
  const {
    isPending,
    isInitializing,
    error,
    product,
    canRetry,
    handleStartTrial,
    handleSkip,
    handleRetry,
  } = useStartTrial();

  const ctaScale = useSharedValue(1);
  const skipScale = useSharedValue(1);

  // Get localized price or use default
  const displayPrice = product?.localizedPrice || DEFAULT_PRICE;

  // Animation handlers for CTA button
  const handleCtaPressIn = () => {
    if (!isPending && !isInitializing) {
      ctaScale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    }
  };

  const handleCtaPressOut = () => {
    ctaScale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handleSkipPressIn = () => {
    if (!isPending) {
      skipScale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    }
  };

  const handleSkipPressOut = () => {
    skipScale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));

  const skipAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: skipScale.value }],
  }));

  // Disable buttons when processing
  const isDisabled = isPending || isInitializing;

  return (
    <SafeAreaView
      className="flex-1 bg-white dark:bg-gray-900"
      testID="trial-screen">
      {/* Main Content Container */}
      <Animated.View
        entering={FadeIn.duration(500)}
        className="flex-1 items-center justify-center px-6">
        {/* Icon Section */}
        <View className="mb-8 items-center">
          <View className="mb-6 h-24 w-24 items-center justify-center rounded-3xl bg-green-500 dark:bg-green-400">
            <Ionicons name="gift" size={48} color="#FFFFFF" />
          </View>

          {/* Title */}
          <Text
            className="mb-4 text-center text-3xl font-bold text-gray-900 dark:text-white"
            accessibilityRole="header">
            Essayez gratuitement
          </Text>

          {/* Subtitle */}
          <Text className="px-4 text-center text-lg text-gray-600 dark:text-gray-300">
            Profitez de toutes les fonctionnalités pendant {TRIAL_DAYS} jours
          </Text>
        </View>

        {/* Benefits List */}
        <View className="mb-8 w-full max-w-sm">
          <BenefitItem icon="shirt-outline" text="Recommandations quotidiennes" />
          <BenefitItem icon="cloud-upload-outline" text="Garde-robe illimitée" />
          <BenefitItem icon="sunny-outline" text="Adaptation à la météo" />
          <BenefitItem icon="heart-outline" text="Favoris et historique" />
        </View>

        {/* Price Info */}
        <View className="mb-4 items-center">
          <Text className="text-base text-gray-500 dark:text-gray-400">
            Puis {displayPrice} après l&apos;essai
          </Text>
          <Text className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            Annulez à tout moment
          </Text>
        </View>

        {/* Error Display */}
        {error && (
          <View
            className="mb-4 w-full max-w-sm rounded-lg bg-red-50 p-3 dark:bg-red-900/20"
            accessibilityRole="alert">
            <Text className="text-center text-sm text-red-600 dark:text-red-400">
              {error}
            </Text>
            {canRetry && (
              <Pressable
                onPress={handleRetry}
                disabled={isInitializing}
                accessibilityRole="button"
                accessibilityLabel="Réessayer l'initialisation"
                testID="retry-button"
                className="mt-3 min-h-[44px] items-center justify-center">
                <Text className="text-base font-medium text-green-600 dark:text-green-400">
                  {isInitializing ? 'Chargement...' : 'Réessayer'}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </Animated.View>

      {/* Bottom Actions Section */}
      <View className="px-6 pb-8">
        {/* Primary CTA Button - AC#1, AC#2 */}
        <AnimatedPressable
          style={ctaAnimatedStyle}
          onPress={handleStartTrial}
          onPressIn={handleCtaPressIn}
          onPressOut={handleCtaPressOut}
          disabled={isDisabled}
          accessibilityRole="button"
          accessibilityLabel={`Commencer ${TRIAL_DAYS} jours gratuits`}
          accessibilityState={{ disabled: isDisabled }}
          testID="start-trial-button"
          className={`mb-4 min-h-[56px] flex-row items-center justify-center rounded-2xl ${
            isDisabled
              ? 'bg-green-400 dark:bg-green-600'
              : 'bg-green-600 dark:bg-green-500'
          }`}>
          {isPending || isInitializing ? (
            <ActivityIndicator
              color="#FFFFFF"
              size="small"
              testID="trial-loading-indicator"
            />
          ) : (
            <Text className="text-lg font-semibold text-white">
              Commencer {TRIAL_DAYS} jours gratuits
            </Text>
          )}
        </AnimatedPressable>

        {/* Skip Link - AC#1, AC#5 */}
        <AnimatedPressable
          style={skipAnimatedStyle}
          onPress={handleSkip}
          onPressIn={handleSkipPressIn}
          onPressOut={handleSkipPressOut}
          disabled={isPending}
          accessibilityRole="button"
          accessibilityLabel="Passer et continuer sans essai"
          accessibilityState={{ disabled: isPending }}
          testID="skip-trial-button"
          className="min-h-[44px] items-center justify-center">
          <Text
            className={`text-base ${
              isPending
                ? 'text-gray-400 dark:text-gray-600'
                : 'text-gray-600 dark:text-gray-400'
            }`}>
            Passer
          </Text>
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
};

/**
 * Benefit item component for the features list
 */
interface BenefitItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}

const BenefitItem: React.FC<BenefitItemProps> = ({ icon, text }) => (
  <View className="mb-3 flex-row items-center">
    <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
      <Ionicons name={icon} size={20} color="#22c55e" />
    </View>
    <Text className="flex-1 text-base text-gray-700 dark:text-gray-200">
      {text}
    </Text>
  </View>
);

export default TrialScreen;
