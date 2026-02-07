import { useCallback } from 'react';
import { FlatList, View, Text, Pressable, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useRouter } from 'expo-router';
import { ClothingCard } from './ClothingCard';
import { CATEGORY_ICONS, type ClothingCategory, type ClothingItem } from '../types/wardrobe.types';

const GAP = 4;
const PADDING = 12;

/** Singular/plural forms for count display — French pluralization */
const CATEGORY_COUNT_LABEL: Record<ClothingCategory, [singular: string, plural: string]> = {
  haut: ['haut', 'hauts'],
  bas: ['bas', 'bas'],
  robe: ['robe', 'robes'],
  veste: ['veste', 'vestes'],
  chaussures: ['chaussures', 'chaussures'],
  accessoire: ['accessoire', 'accessoires'],
};

function getCountLabel(count: number, filter: ClothingCategory | null): string {
  if (!filter) return `${count} vêtement${count > 1 ? 's' : ''}`;
  const [singular, plural] = CATEGORY_COUNT_LABEL[filter];
  return `${count} ${count > 1 ? plural : singular}`;
}

interface WardrobeGridProps {
  clothes: ClothingItem[];
  activeFilter: ClothingCategory | null;
  isRefetching: boolean;
  onRefresh: () => void;
}

export function WardrobeGrid({
  clothes,
  activeFilter,
  isRefetching,
  onRefresh,
}: WardrobeGridProps) {
  const { width: screenWidth } = useWindowDimensions();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const cardSize = Math.floor((screenWidth - PADDING * 2 - GAP * 2) / 3);
  const CARD_HEIGHT = cardSize + GAP;

  const renderItem = useCallback(
    ({ item }: { item: ClothingItem }) => (
      <ClothingCard item={item} size={cardSize} isDark={isDark} />
    ),
    [cardSize, isDark]
  );

  return (
    <FlatList
      data={clothes}
      renderItem={renderItem}
      numColumns={3}
      getItemLayout={(_, index) => ({
        length: CARD_HEIGHT,
        offset: CARD_HEIGHT * Math.floor(index / 3),
        index,
      })}
      removeClippedSubviews
      maxToRenderPerBatch={12}
      windowSize={5}
      initialNumToRender={12}
      keyExtractor={(item) => item.id}
      refreshing={isRefetching}
      onRefresh={onRefresh}
      ListHeaderComponent={
        <Text className="mb-2 text-sm text-gray-500 dark:text-gray-400" testID="wardrobe-count">
          {getCountLabel(clothes.length, activeFilter)}
        </Text>
      }
      ListEmptyComponent={
        activeFilter ? (
          <View className="flex-1 items-center justify-center px-6 py-12" testID="filtered-empty">
            <Ionicons
              name={CATEGORY_ICONS[activeFilter] as keyof typeof Ionicons.glyphMap}
              size={48}
              color={isDark ? '#4B5563' : '#D1D5DB'}
            />
            <Text className="mt-3 text-center text-gray-500 dark:text-gray-400">
              Aucun {CATEGORY_COUNT_LABEL[activeFilter][0]} dans votre garde-robe
            </Text>
            <Pressable
              onPress={() => router.push('/(app)/wardrobe/camera')}
              className="mt-4 min-h-[44px] rounded-lg bg-blue-500 px-6 py-3"
              accessibilityRole="button"
              accessibilityLabel="Ajouter un vêtement"
              testID="filtered-empty-add-button">
              <Text className="font-semibold text-white">Ajouter un vêtement</Text>
            </Pressable>
          </View>
        ) : null
      }
      columnWrapperStyle={{ gap: GAP }}
      contentContainerStyle={{ paddingHorizontal: PADDING, gap: GAP }}
      testID="wardrobe-grid"
    />
  );
}
