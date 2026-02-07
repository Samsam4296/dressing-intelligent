import { memo } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { CATEGORY_LABELS, COLOR_LABELS, COLOR_HEX } from '../types/wardrobe.types';
import type { ClothingItem } from '../types/wardrobe.types';

/** Multicolore quadrant colors for the multi-segment badge */
const MULTI_COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#EAB308'];

interface ClothingCardProps {
  item: ClothingItem;
  size: number;
  isDark: boolean;
}

export const ClothingCard = memo(
  function ClothingCard({ item, size, isDark }: ClothingCardProps) {
    const colorHex = COLOR_HEX[item.color];
    const isMulticolor = item.color === 'multicolore';

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
        {isMulticolor ? (
          <View
            style={{
              position: 'absolute',
              bottom: 6,
              right: 6,
              width: 16,
              height: 16,
              borderRadius: 8,
              overflow: 'hidden',
              borderWidth: 1.5,
              borderColor: isDark ? '#374151' : '#FFFFFF',
            }}
            testID={`color-badge-${item.id}`}>
            {MULTI_COLORS.map((c, i) => (
              <View
                key={c}
                style={{
                  position: 'absolute',
                  top: i < 2 ? 0 : '50%',
                  left: i % 2 === 0 ? 0 : '50%',
                  width: '50%',
                  height: '50%',
                  backgroundColor: c,
                }}
              />
            ))}
          </View>
        ) : colorHex ? (
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
        ) : null}
      </View>
    );
  },
  (prev, next) =>
    prev.item.id === next.item.id && prev.size === next.size && prev.isDark === next.isDark
);
