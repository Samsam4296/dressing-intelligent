import { useState, useMemo } from 'react';
import { ActivityIndicator, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useCurrentProfileId } from '@/features/profiles';
import { useClothes, WardrobeGrid, EmptyWardrobe, CategoryFilterBar } from '@/features/wardrobe';
import type { ClothingCategory } from '@/features/wardrobe';

function WardrobeContent() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const profileId = useCurrentProfileId();
  const { data: clothes, isLoading, isError, refetch, isRefetching } = useClothes(profileId);
  const [selectedCategory, setSelectedCategory] = useState<ClothingCategory | null>(null);

  const filteredClothes = useMemo(
    () => (selectedCategory ? clothes?.filter((c) => c.category === selectedCategory) : clothes),
    [clothes, selectedCategory]
  );

  if (isLoading) {
    return (
      <ActivityIndicator
        size="large"
        color={isDark ? '#60A5FA' : '#3B82F6'}
        style={{ flex: 1 }}
        testID="wardrobe-loading"
      />
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center px-6" testID="wardrobe-error">
        <Ionicons name="cloud-offline-outline" size={48} color={isDark ? '#6B7280' : '#9CA3AF'} />
        <Text className="mt-4 text-center text-gray-600 dark:text-gray-400">
          Impossible de charger la garde-robe
        </Text>
        <Pressable
          onPress={() => refetch()}
          className="mt-4 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-blue-500 px-6 py-3"
          accessibilityRole="button"
          accessibilityLabel="Réessayer le chargement"
          testID="wardrobe-retry-button">
          <Text className="font-semibold text-white">Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  if (!clothes || clothes.length === 0) {
    return <EmptyWardrobe />;
  }

  return (
    <>
      <CategoryFilterBar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />
      <WardrobeGrid
        clothes={filteredClothes ?? []}
        activeFilter={selectedCategory}
        isRefetching={isRefetching}
        onRefresh={refetch}
      />
    </>
  );
}

export default function WardrobeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={['top']}>
      <WardrobeContent />
    </SafeAreaView>
  );
}
