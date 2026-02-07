import { memo } from 'react';
import { View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { CATEGORY_LABELS, COLOR_LABELS, COLOR_HEX } from '../types/wardrobe.types';
import type { ClothingItem } from '../types/wardrobe.types';

/** Multicolore quadrant colors for the multi-segment badge */
const MULTI_COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#EAB308'];

interface ColorBadgeProps {
  itemId: string;
  color: ClothingItem['color'];
  isDark: boolean;
}

/** Renders the color indicator badge (solid circle or multicolor quadrant) */
function ColorBadge({ itemId, color, isDark }: ColorBadgeProps) {
  const borderColor = isDark ? '#374151' : '#FFFFFF';
  const baseStyle = {
    position: 'absolute' as const,
    bottom: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor,
  };

  if (color === 'multicolore') {
    return (
      <View style={{ ...baseStyle, overflow: 'hidden' }} testID={`color-badge-${itemId}`}>
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
    );
  }

  const colorHex = COLOR_HEX[color];
  if (!colorHex) return null;

  return (
    <View style={{ ...baseStyle, backgroundColor: colorHex }} testID={`color-badge-${itemId}`} />
  );
}

interface ClothingCardProps {
  item: ClothingItem;
  size: number;
  isDark: boolean;
  onPress?: () => void;
}

export const ClothingCard = memo(
  function ClothingCard({ item, size, isDark, onPress }: ClothingCardProps) {
    return (
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={{ width: size, height: size }}
        accessibilityRole={onPress ? 'button' : 'image'}
        accessibilityLabel={`${CATEGORY_LABELS[item.category]} ${COLOR_LABELS[item.color]}`}
        testID={`clothing-card-${item.id}`}>
        <Image
          source={{ uri: item.signedUrl }}
          style={{ width: size, height: size, borderRadius: 8 }}
          contentFit="cover"
          transition={200}
          recyclingKey={item.id}
          cachePolicy="memory-disk"
        />
        <ColorBadge itemId={item.id} color={item.color} isDark={isDark} />
      </Pressable>
    );
  },
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.category === next.item.category &&
    prev.item.color === next.item.color &&
    prev.item.signedUrl === next.item.signedUrl &&
    prev.size === next.size &&
    prev.isDark === next.isDark &&
    prev.onPress === next.onPress
);
