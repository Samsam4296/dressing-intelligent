import { ScrollView, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import * as Haptics from 'expo-haptics';
import {
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  type ClothingCategory,
} from '../types/wardrobe.types';

interface CategoryFilterBarProps {
  selectedCategory: ClothingCategory | null;
  onSelectCategory: (category: ClothingCategory | null) => void;
}

export function CategoryFilterBar({ selectedCategory, onSelectCategory }: CategoryFilterBarProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  function handlePress(category: ClothingCategory | null): void {
    const next = category === selectedCategory ? null : category;
    // Skip haptics when tapping already-active "Tous" (no visual change)
    if (next !== selectedCategory) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectCategory(next);
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
      className="mb-2"
      testID="category-filter-bar">
      <FilterChip
        active={!selectedCategory}
        label="Tous"
        onPress={() => handlePress(null)}
        isDark={isDark}
        testID="filter-chip-all"
      />
      {CATEGORY_ORDER.map((cat) => (
        <FilterChip
          key={cat}
          active={selectedCategory === cat}
          label={CATEGORY_LABELS[cat]}
          icon={CATEGORY_ICONS[cat]}
          onPress={() => handlePress(cat)}
          isDark={isDark}
          testID={`filter-chip-${cat}`}
        />
      ))}
    </ScrollView>
  );
}

interface FilterChipProps {
  active: boolean;
  label: string;
  icon?: string;
  onPress: () => void;
  isDark: boolean;
  testID: string;
}

function getIconColor(active: boolean, isDark: boolean): string {
  if (active) return 'white';
  if (isDark) return '#9CA3AF';
  return '#374151';
}

function FilterChip({ active, label, icon, onPress, isDark, testID }: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`min-h-[44px] min-w-[44px] flex-row items-center rounded-full px-4 py-2 ${
        active ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-800'
      }`}
      accessibilityRole="button"
      accessibilityLabel={`Filtrer par ${label}`}
      accessibilityState={{ selected: active }}
      testID={testID}>
      {icon && (
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={16}
          color={getIconColor(active, isDark)}
        />
      )}
      <Text
        className={`${icon ? 'ml-1.5' : ''} text-sm font-medium ${
          active ? 'text-white' : 'text-gray-700 dark:text-gray-300'
        }`}>
        {label}
      </Text>
    </Pressable>
  );
}
