/**
 * EditClothingModal Component
 * Story 2.10: Modification Vêtement
 *
 * Modal for editing both category and color of a clothing item.
 * Reuses CategorySelector + ColorSelector from Stories 2.4/2.6.
 * Pattern based on EditCategoryModal (prevVisibleRef reset).
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { CategorySelector } from './CategorySelector';
import { ColorSelector } from './ColorSelector';
import type { ClothingCategory, ClothingColor, ClothingItem } from '../types/wardrobe.types';

interface EditClothingModalProps {
  visible: boolean;
  item: ClothingItem | null;
  onConfirm: (category: ClothingCategory, color: ClothingColor) => void;
  onClose: () => void;
  isLoading?: boolean;
}

/** Modal for editing clothing category and color */
export const EditClothingModal = memo(function EditClothingModal({
  visible,
  item,
  onConfirm,
  onClose,
  isLoading = false,
}: EditClothingModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [selectedCategory, setSelectedCategory] = useState<ClothingCategory | null>(null);
  const [selectedColor, setSelectedColor] = useState<ClothingColor | null>(null);
  const prevVisibleRef = useRef(false);

  const hasChanged =
    item != null && (selectedCategory !== item.category || selectedColor !== item.color);
  const isDisabled = !hasChanged || isLoading;

  // Reset selections when modal opens (visible changes false→true)
  useEffect(() => {
    if (visible && !prevVisibleRef.current && item) {
      setSelectedCategory(item.category);
      setSelectedColor(item.color);
    }
    prevVisibleRef.current = visible;
  }, [visible, item]);

  const handleConfirm = useCallback(() => {
    if (isDisabled || !selectedCategory || !selectedColor) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm(selectedCategory, selectedColor);
  }, [isDisabled, onConfirm, selectedCategory, selectedColor]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View className="flex-1 bg-gray-900 dark:bg-black" testID="edit-clothing-modal">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pb-4 pt-12">
          <Pressable
            onPress={onClose}
            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-gray-800"
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            disabled={isLoading}
            testID="close-button">
            <Ionicons name="close" size={24} color={isDark ? '#E5E7EB' : '#FFFFFF'} />
          </Pressable>

          <Text className="text-lg font-semibold text-white">Modifier vêtement</Text>

          <View className="min-w-[44px]" />
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16 }}>
          {/* Clothing Photo */}
          {item && (
            <View className="mb-6 items-center">
              <Image
                source={{ uri: item.signedUrl }}
                style={{ width: 200, height: 200, borderRadius: 12 }}
                contentFit="cover"
                transition={200}
                accessibilityLabel="Photo du vêtement"
                testID="clothing-image"
              />
            </View>
          )}

          {/* Category Section */}
          <Text className="mb-3 text-base font-semibold text-white">Catégorie</Text>
          <CategorySelector selectedCategory={selectedCategory} onSelect={setSelectedCategory} />

          {/* Color Section */}
          <Text className="mb-3 mt-6 text-base font-semibold text-white">Couleur</Text>
          <ColorSelector selectedColor={selectedColor} onSelect={setSelectedColor} />
        </ScrollView>

        {/* Actions */}
        <View className="px-6 pb-8 pt-4">
          <Pressable
            onPress={handleConfirm}
            disabled={isDisabled}
            className={`min-h-[56px] items-center justify-center rounded-xl py-4 ${
              isDisabled ? 'bg-gray-700 opacity-50' : 'bg-blue-600'
            }`}
            accessibilityRole="button"
            accessibilityLabel="Confirmer la modification"
            accessibilityState={{ disabled: isDisabled }}
            testID="confirm-button">
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
