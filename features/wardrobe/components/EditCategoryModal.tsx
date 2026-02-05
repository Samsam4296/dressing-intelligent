/**
 * EditCategoryModal Component
 * Story 2.5: Correction Catégorie
 *
 * Modal for editing the category of a clothing item.
 * Reuses CategorySelector from Story 2.4.
 */

import { memo, useCallback, useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CategorySelector } from './CategorySelector';
import type { ClothingCategory } from '../types/wardrobe.types';

interface EditCategoryModalProps {
  visible: boolean;
  currentCategory: ClothingCategory;
  onConfirm: (category: ClothingCategory) => void;
  onClose: () => void;
  isLoading?: boolean;
}

/** Modal for editing clothing category */
export const EditCategoryModal = memo(function EditCategoryModal({
  visible,
  currentCategory,
  onConfirm,
  onClose,
  isLoading = false,
}: EditCategoryModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [selectedCategory, setSelectedCategory] = useState<ClothingCategory>(currentCategory);

  const hasChanged = selectedCategory !== currentCategory;
  const isDisabled = !hasChanged || isLoading;

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedCategory(currentCategory);
    }
  }, [visible, currentCategory]);

  // P2-05: Stabilized callback with useCallback
  const handleConfirm = useCallback(() => {
    if (isDisabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm(selectedCategory);
  }, [isDisabled, onConfirm, selectedCategory]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        className="flex-1 bg-gray-900 dark:bg-black"
        testID="edit-category-modal"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pb-4 pt-12">
          <Pressable
            onPress={onClose}
            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-gray-800"
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            disabled={isLoading}
            testID="close-button"
          >
            {/* P3-03: Theme-aware icon color */}
            <Ionicons name="close" size={24} color={isDark ? '#E5E7EB' : '#FFFFFF'} />
          </Pressable>

          <Text className="text-lg font-semibold text-white">
            Modifier catégorie
          </Text>

          <View className="min-w-[44px]" />
        </View>

        {/* Category Selection */}
        <View className="flex-1 justify-center px-4">
          <CategorySelector
            selectedCategory={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </View>

        {/* Actions */}
        <View className="px-6 pb-8">
          <Pressable
            onPress={handleConfirm}
            disabled={isDisabled}
            className={`min-h-[56px] items-center justify-center rounded-xl py-4 ${
              isDisabled ? 'bg-gray-700 opacity-50' : 'bg-blue-600'
            }`}
            accessibilityRole="button"
            accessibilityLabel="Confirmer la modification"
            accessibilityState={{ disabled: isDisabled }}
            testID="confirm-button"
          >
            {isLoading ? (
              <ActivityIndicator color="white" testID="loading-indicator" />
            ) : (
              <Text className="font-semibold text-white">
                {hasChanged ? 'Confirmer' : 'Aucune modification'}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
});
