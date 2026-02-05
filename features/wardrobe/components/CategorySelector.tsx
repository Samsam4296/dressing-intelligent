/**
 * CategorySelector Component
 * Story 2.4: Catégorisation automatique
 *
 * A 2x3 grid of category buttons for selecting clothing type.
 * Supports AI suggestions with visual badge and haptic feedback.
 */

import { View, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { ClothingCategory } from '../types/wardrobe.types';
import { CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_ORDER } from '../types/wardrobe.types';

// ============================================
// Types
// ============================================

interface CategorySelectorProps {
  /** Currently selected category */
  selectedCategory: ClothingCategory | null;
  /** AI-suggested category (for badge display) */
  suggestedCategory?: ClothingCategory | null;
  /** Whether to show AI badge on suggested category */
  showAiBadge?: boolean;
  /** Callback when category is selected */
  onSelect: (category: ClothingCategory) => void;
}

// ============================================
// Component
// ============================================

export const CategorySelector = ({
  selectedCategory,
  suggestedCategory,
  showAiBadge = false,
  onSelect,
}: CategorySelectorProps) => {
  const handlePress = (category: ClothingCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(category);
  };

  return (
    <View className="flex-row flex-wrap justify-center gap-3 px-4">
      {CATEGORY_ORDER.map((category) => {
        const isSelected = selectedCategory === category;
        const isSuggested = suggestedCategory === category;
        const showBadge = isSuggested && showAiBadge && !isSelected;

        return (
          <Pressable
            key={category}
            onPress={() => handlePress(category)}
            className={`
              min-h-[80px] w-[45%] items-center justify-center rounded-xl border-2 py-4
              ${
                isSelected
                  ? 'border-blue-600 bg-blue-600'
                  : 'border-gray-600 bg-gray-800 dark:border-gray-700 dark:bg-gray-900'
              }
            `}
            accessibilityRole="button"
            accessibilityLabel={`Catégorie ${CATEGORY_LABELS[category]}${
              isSuggested && showAiBadge ? ', suggéré par IA' : ''
            }`}
            accessibilityState={{ selected: isSelected }}
            testID={`category-${category}`}>
            {/* AI Badge */}
            {showBadge && (
              <View
                className="absolute -right-2 -top-2 rounded-full bg-purple-600 px-2 py-0.5"
                testID="ai-badge">
                <Text className="text-xs font-bold text-white">IA</Text>
              </View>
            )}

            <Ionicons
              name={CATEGORY_ICONS[category] as keyof typeof Ionicons.glyphMap}
              size={28}
              color={isSelected ? 'white' : '#9CA3AF'}
            />
            <Text className={`mt-2 font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>
              {CATEGORY_LABELS[category]}
            </Text>

            {/* Selected checkmark */}
            {isSelected && (
              <View className="absolute right-2 top-2">
                <Ionicons name="checkmark-circle" size={20} color="white" />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
};
