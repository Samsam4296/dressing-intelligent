/**
 * Forgot Password Screen Route (Placeholder)
 * Story 1.4: Réinitialisation Mot de Passe
 *
 * Placeholder for password reset functionality.
 * To be implemented in Story 1.4.
 */

import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function ForgotPasswordPage() {
  const router = useRouter();

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="mb-4 text-center text-2xl font-bold text-gray-900 dark:text-white">
          Mot de passe oublié
        </Text>
        <Text className="mb-8 px-8 text-center text-gray-600 dark:text-gray-400">
          Cette fonctionnalité sera implémentée dans la Story 1.4
        </Text>

        {/* Back button - Touch target min 44px */}
        <Pressable
          onPress={handleBackPress}
          accessibilityRole="button"
          accessibilityLabel="Retour à la connexion"
          className="min-h-[44px] rounded-lg bg-blue-600 px-6 py-3 dark:bg-blue-500">
          <Text className="font-semibold text-white">Retour à la connexion</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
