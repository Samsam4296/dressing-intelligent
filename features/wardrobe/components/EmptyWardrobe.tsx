import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useRouter } from 'expo-router';

export function EmptyWardrobe() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center px-6" testID="wardrobe-empty">
      <Ionicons name="shirt-outline" size={80} color={isDark ? '#374151' : '#D1D5DB'} />
      <Text className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300">
        Votre garde-robe est vide
      </Text>
      <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
        Ajoutez votre premier vêtement
      </Text>
      <Pressable
        onPress={() => router.push('/(app)/wardrobe/camera')}
        className="mt-6 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-blue-500 px-6 py-3"
        accessibilityRole="button"
        accessibilityLabel="Ajouter un vêtement"
        testID="wardrobe-add-button">
        <Text className="font-semibold text-white">Ajouter un vêtement</Text>
      </Pressable>
    </View>
  );
}
