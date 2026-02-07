import { FlatList, Text, useWindowDimensions } from 'react-native';
import { ClothingCard } from './ClothingCard';
import type { ClothingItem } from '../types/wardrobe.types';

const GAP = 4;
const PADDING = 12;

interface WardrobeGridProps {
  clothes: ClothingItem[];
  isRefetching: boolean;
  onRefresh: () => void;
}

export function WardrobeGrid({ clothes, isRefetching, onRefresh }: WardrobeGridProps) {
  const { width: screenWidth } = useWindowDimensions();
  const cardSize = Math.floor((screenWidth - PADDING * 2 - GAP * 2) / 3);
  const CARD_HEIGHT = cardSize + GAP;

  return (
    <FlatList
      data={clothes}
      renderItem={({ item }) => <ClothingCard item={item} size={cardSize} />}
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
          {clothes.length} vêtement{clothes.length > 1 ? 's' : ''}
        </Text>
      }
      columnWrapperStyle={{ gap: GAP }}
      contentContainerStyle={{ paddingHorizontal: PADDING, gap: GAP }}
      testID="wardrobe-grid"
    />
  );
}
