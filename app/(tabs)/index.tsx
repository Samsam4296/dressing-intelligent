/**
 * Home Screen (Tabs Index)
 * Main screen after profile creation.
 *
 * This is a placeholder that will be expanded in Epic 3.
 * For now, it shows a simple welcome message with the current profile.
 */

import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActiveProfile } from '@/features/profiles';

export default function HomeScreen() {
  const { data: profile, isLoading } = useActiveProfile();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={['top']}>
      <View className="flex-1 items-center justify-center px-6">
        {isLoading ? (
          <Text className="text-gray-600 dark:text-gray-400">Chargement...</Text>
        ) : (
          <>
            <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Bonjour{profile?.display_name ? `, ${profile.display_name}` : ''} !
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-center">
              Bienvenue dans Dressing Intelligent.{'\n'}
              Les recommandations arrivent bientôt !
            </Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
