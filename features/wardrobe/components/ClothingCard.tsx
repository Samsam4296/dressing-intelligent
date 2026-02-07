import { View } from 'react-native';
import { Image } from 'expo-image';
import { useColorScheme } from 'nativewind';
import { CATEGORY_LABELS, COLOR_LABELS, COLOR_HEX } from '../types/wardrobe.types';
import type { ClothingItem } from '../types/wardrobe.types';

interface ClothingCardProps {
  item: ClothingItem;
  size: number;
}

export function ClothingCard({ item, size }: ClothingCardProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colorHex = COLOR_HEX[item.color];

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityRole="image"
      testID={`clothing-card-${item.id}`}>
      <Image
        source={{ uri: item.signedUrl }}
        style={{ width: size, height: size, borderRadius: 8 }}
        contentFit="cover"
        transition={200}
        recyclingKey={item.id}
        cachePolicy="memory-disk"
        accessibilityLabel={`${CATEGORY_LABELS[item.category]} ${COLOR_LABELS[item.color]}`}
      />
      {colorHex && (
        <View
          style={{
            position: 'absolute',
            bottom: 6,
            right: 6,
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: colorHex,
            borderWidth: 1.5,
            borderColor: isDark ? '#374151' : '#FFFFFF',
          }}
          testID={`color-badge-${item.id}`}
        />
      )}
    </View>
  );
}
