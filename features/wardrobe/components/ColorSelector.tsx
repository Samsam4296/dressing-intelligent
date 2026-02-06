/**
 * ColorSelector Component
 * Story 2.6: Sélection Couleur
 *
 * A 5-column grid of color circles for selecting clothing color.
 * Supports haptic feedback and accessibility states.
 */

import { memo, useCallback } from 'react';
import { View, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { ClothingColor } from '../types/wardrobe.types';
import { COLOR_LABELS, COLOR_HEX, COLOR_ORDER } from '../types/wardrobe.types';

interface ColorSelectorProps {
  selectedColor: ClothingColor | null;
  onSelect: (color: ClothingColor) => void;
}

/** Light colors that need a distinct selection border */
const LIGHT_COLORS = new Set<ClothingColor>(['blanc', 'beige']);

/** Stable style for 5-column grid items (avoids re-creating objects per render) */
const ITEM_STYLE = { width: '20%' } as const;

/** Stable style for selected checkmark overlay */
const CHECKMARK_OVERLAY_STYLE = { backgroundColor: 'rgba(0,0,0,0.3)' } as const;

/**
 * Renders the multicolor circle as 4 colored quadrants.
 * Avoids dependency on expo-linear-gradient.
 */
const MulticolorCircle = () => (
  <View className="h-10 w-10 overflow-hidden rounded-full">
    <View className="flex-1 flex-row">
      <View className="flex-1 bg-red-500" />
      <View className="flex-1 bg-blue-500" />
    </View>
    <View className="flex-1 flex-row">
      <View className="flex-1 bg-green-500" />
      <View className="flex-1 bg-yellow-500" />
    </View>
  </View>
);

export const ColorSelector = memo(function ColorSelector({
  selectedColor,
  onSelect,
}: ColorSelectorProps) {
  const handlePress = useCallback(
    (color: ClothingColor) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelect(color);
    },
    [onSelect]
  );

  return (
    <View className="flex-row flex-wrap justify-center gap-y-4 px-2">
      {COLOR_ORDER.map((color) => {
        const isSelected = selectedColor === color;
        const isMulticolor = color === 'multicolore';
        const isLight = LIGHT_COLORS.has(color);
        const hexColor = COLOR_HEX[color];

        const selectedBorder = isLight ? 'border-blue-400' : 'border-white';

        return (
          <Pressable
            key={color}
            onPress={() => handlePress(color)}
            accessible={true}
            className="items-center"
            style={ITEM_STYLE}
            accessibilityRole="button"
            accessibilityLabel={`Couleur ${COLOR_LABELS[color]}`}
            accessibilityState={{ selected: isSelected }}
            testID={`color-${color}`}>
            {/* Color Circle */}
            <View
              className={`h-11 w-11 items-center justify-center rounded-full border-2 ${
                isSelected ? selectedBorder : 'border-gray-600'
              }`}>
              {isMulticolor ? (
                <MulticolorCircle />
              ) : (
                <View
                  className="h-9 w-9 rounded-full"
                  style={hexColor ? { backgroundColor: hexColor } : undefined}
                />
              )}

              {/* Selected checkmark overlay */}
              {isSelected && (
                <View
                  className="absolute inset-0 items-center justify-center rounded-full"
                  style={CHECKMARK_OVERLAY_STYLE}
                  testID={`color-check-${color}`}>
                  <Ionicons name="checkmark" size={20} color="white" />
                </View>
              )}
            </View>

            {/* Color label */}
            <Text
              className={`mt-1 text-xs ${
                isSelected ? 'font-semibold text-white' : 'text-gray-400'
              }`}>
              {COLOR_LABELS[color]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});
