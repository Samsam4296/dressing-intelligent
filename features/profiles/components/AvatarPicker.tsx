/**
 * AvatarPicker Component
 * Story 1.5: Création Premier Profil
 *
 * AC#3: Choose from gallery OR take photo
 * AC#4: Default avatar if no selection
 * AC#9: Touch targets 44x44 minimum
 *
 * Image handling:
 * - Subtask 6.5: Validate format (JPEG/PNG) and size max 10MB
 * - Subtask 6.6: Compress with expo-image-manipulator (max 500KB, 800x800px)
 * - Subtask 6.7: Preview with circular crop
 */

import { useState } from 'react';
import { View, Pressable, Image, Text, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { logger } from '@/lib/logger';

// ============================================
// Types
// ============================================

interface AvatarPickerProps {
  /** Current avatar URI (local or remote) */
  avatarUri: string | null;
  /** Callback when avatar is selected (returns compressed URI) */
  onAvatarSelected: (uri: string) => void;
  /** Whether avatar is being uploaded */
  isLoading?: boolean;
  /** Size of avatar preview (default 96) */
  size?: number;
}

// ============================================
// Constants
// ============================================

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const COMPRESSED_SIZE_PX = 800;
const COMPRESSION_QUALITY = 0.7; // For ~500KB output

// ============================================
// Helper Functions
// ============================================

/**
 * Compress image to max 800x800px at 70% quality
 * Subtask 6.6: Max 500KB, 800x800px before upload
 */
const compressImage = async (uri: string): Promise<string> => {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: COMPRESSED_SIZE_PX, height: COMPRESSED_SIZE_PX } }],
    {
      compress: COMPRESSION_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );
  return result.uri;
};

/**
 * Show permission denied alert with Settings link
 * Subtask 6.4: Handle permission denied
 */
const showPermissionDeniedAlert = (type: 'camera' | 'gallery') => {
  const title = type === 'camera' ? 'Accès caméra requis' : 'Accès galerie requis';
  const message =
    type === 'camera'
      ? "L'accès à la caméra est nécessaire pour prendre une photo de profil."
      : "L'accès à la galerie est nécessaire pour choisir une photo de profil.";

  Alert.alert(title, message, [
    { text: 'Annuler', style: 'cancel' },
    {
      text: 'Ouvrir Paramètres',
      onPress: () => Linking.openSettings(),
    },
  ]);
};

/**
 * Validate image file (format and size)
 * Subtask 6.5: JPEG/PNG, max 10MB
 */
const validateImage = (asset: ImagePicker.ImagePickerAsset): boolean => {
  // Check file size if available
  if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE_BYTES) {
    Alert.alert(
      'Image trop volumineuse',
      `L'image doit faire moins de ${MAX_FILE_SIZE_MB}MB. Essayez de choisir une image plus petite.`
    );
    return false;
  }

  // Check format (if mimeType available)
  if (asset.mimeType) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(asset.mimeType.toLowerCase())) {
      Alert.alert('Format non supporté', "Veuillez choisir une image JPEG, PNG ou WebP.");
      return false;
    }
  }

  return true;
};

// ============================================
// Component
// ============================================

export const AvatarPicker = ({
  avatarUri,
  onAvatarSelected,
  isLoading = false,
  size = 96,
}: AvatarPickerProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [isCompressing, setIsCompressing] = useState(false);

  /**
   * Process and select image after picking
   */
  const processAndSelectImage = async (uri: string) => {
    setIsCompressing(true);
    try {
      const compressedUri = await compressImage(uri);
      // Light haptic feedback on selection (AC#12)
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onAvatarSelected(compressedUri);
    } catch (error) {
      logger.error(error, { feature: 'profiles', action: 'compressImage' });
      Alert.alert('Erreur', "Impossible de traiter l'image. Veuillez réessayer.");
    } finally {
      setIsCompressing(false);
    }
  };

  /**
   * Pick from gallery
   * Subtask 6.2: expo-image-picker gallery
   */
  const pickFromGallery = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showPermissionDeniedAlert('gallery');
      return;
    }

    // Launch picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (validateImage(asset)) {
        await processAndSelectImage(asset.uri);
      }
    }
  };

  /**
   * Take photo with camera
   * Subtask 6.3: expo-camera permissions
   */
  const takePhoto = async () => {
    // Request permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showPermissionDeniedAlert('camera');
      return;
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (validateImage(asset)) {
        await processAndSelectImage(asset.uri);
      }
    }
  };

  // Show loading state
  const showLoading = isLoading || isCompressing;

  return (
    <View className="items-center">
      {/* Avatar Preview (Subtask 6.7: circular crop) */}
      <View
        className="rounded-full bg-gray-200 dark:bg-gray-700 items-center justify-center overflow-hidden"
        style={{ width: size, height: size }}
        testID="avatar-preview"
      >
        {showLoading ? (
          <ActivityIndicator size="large" color={isDark ? '#60A5FA' : '#3B82F6'} />
        ) : avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
            className="w-full h-full"
            testID="avatar-image"
          />
        ) : (
          // Subtask 6.8: Default avatar if no selection
          <Ionicons
            name="person"
            size={size * 0.5}
            color={isDark ? '#9CA3AF' : '#6B7280'}
            testID="avatar-placeholder"
          />
        )}
      </View>

      {/* Action Buttons (AC#9: Touch targets 44x44) */}
      <View className="flex-row mt-4 gap-4">
        {/* Gallery Button */}
        <Pressable
          className="min-h-[44px] min-w-[44px] px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg flex-row items-center active:opacity-70"
          onPress={pickFromGallery}
          disabled={showLoading}
          accessibilityRole="button"
          accessibilityLabel="Choisir depuis la galerie"
          testID="gallery-button"
        >
          <Ionicons
            name="images-outline"
            size={20}
            color={isDark ? '#9CA3AF' : '#6B7280'}
          />
          <Text className="ml-2 text-gray-700 dark:text-gray-300 text-sm font-medium">
            Galerie
          </Text>
        </Pressable>

        {/* Camera Button */}
        <Pressable
          className="min-h-[44px] min-w-[44px] px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg flex-row items-center active:opacity-70"
          onPress={takePhoto}
          disabled={showLoading}
          accessibilityRole="button"
          accessibilityLabel="Prendre une photo"
          testID="camera-button"
        >
          <Ionicons
            name="camera-outline"
            size={20}
            color={isDark ? '#9CA3AF' : '#6B7280'}
          />
          <Text className="ml-2 text-gray-700 dark:text-gray-300 text-sm font-medium">
            Photo
          </Text>
        </Pressable>
      </View>
    </View>
  );
};
