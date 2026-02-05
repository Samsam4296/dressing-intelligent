/**
 * Test Edit Category Screen
 * Story 2.5: Correction Catégorie
 *
 * ⚠️ TEMPORARY TEST SCREEN - Delete after validation or keep for Story 2.10
 *
 * End-to-end test screen for EditCategoryModal and useUpdateCategoryMutation.
 */

import { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Stack } from 'expo-router';
import { EditCategoryModal } from '@/features/wardrobe/components/EditCategoryModal';
import { useUpdateCategoryMutation } from '@/features/wardrobe/hooks/useUpdateCategoryMutation';
import { CATEGORY_LABELS } from '@/features/wardrobe/types/wardrobe.types';
import type { ClothingCategory } from '@/features/wardrobe/types/wardrobe.types';

// Valid UUID format for testing (replace with real ID from Supabase)
const DEFAULT_TEST_UUID = '00000000-0000-0000-0000-000000000000';

export default function TestEditCategoryScreen() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<ClothingCategory>('haut');
  const [clothingId, setClothingId] = useState(DEFAULT_TEST_UUID);
  const { mutate: updateCategory, isPending } = useUpdateCategoryMutation();

  const handleConfirm = (newCategory: ClothingCategory) => {
    updateCategory(
      { clothingId, category: newCategory },
      {
        onSuccess: () => {
          setCurrentCategory(newCategory);
          setIsModalVisible(false);
        },
      }
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Test Edit Category',
          headerStyle: { backgroundColor: '#111827' },
          headerTintColor: '#fff',
        }}
      />

      <View className="flex-1 items-center justify-center bg-gray-900 p-6">
        <Text className="mb-2 text-sm text-gray-400">Story 2.5 - Test Screen</Text>

        <Text className="mb-4 text-lg text-white">
          Catégorie actuelle:{' '}
          <Text className="font-bold text-blue-400">{CATEGORY_LABELS[currentCategory]}</Text>
        </Text>

        <View className="mb-4 w-full px-4">
          <Text className="mb-1 text-xs text-gray-400">Clothing ID (UUID)</Text>
          <TextInput
            className="rounded-lg bg-gray-800 px-3 py-2 text-white"
            value={clothingId}
            onChangeText={setClothingId}
            placeholder="UUID from Supabase"
            placeholderTextColor="#6B7280"
          />
        </View>

        <Pressable
          onPress={() => setIsModalVisible(true)}
          className="min-h-[44px] min-w-[200px] items-center justify-center rounded-lg bg-blue-600 px-6 py-3"
          accessibilityRole="button"
          accessibilityLabel="Modifier la catégorie"
          testID="open-modal-button">
          <Text className="font-semibold text-white">Modifier catégorie</Text>
        </Pressable>

        <Text className="mt-8 px-4 text-center text-xs text-gray-500">
          ⚠️ Entrez un UUID valide de Supabase pour tester la mise à jour.
        </Text>

        <EditCategoryModal
          visible={isModalVisible}
          currentCategory={currentCategory}
          onConfirm={handleConfirm}
          onClose={() => setIsModalVisible(false)}
          isLoading={isPending}
        />
      </View>
    </>
  );
}
