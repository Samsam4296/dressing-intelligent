// Barrel exports for wardrobe feature
// Story 2.1: Capture Photo Camera
// Story 2.2: Import depuis Galerie
// Story 2.3: Détourage automatique
// Story 2.4: Catégorisation automatique
// Story 2.5: Correction Catégorie
// Story 2.6: Sélection Couleur
// Story 2.7: Upload et Stockage Photo

// Services
export { cameraService } from './services/cameraService';
export type { PermissionResult } from './services/cameraService';
export { galleryService, isGalleryError, GalleryError } from './services/galleryService';
export type { GalleryImageResult, GalleryErrorCode } from './services/galleryService';
export { imageProcessingService } from './services/imageProcessingService';
export { categoryService } from './services/categoryService';
export { clothingService } from './services/clothingService';
export type { UpdateCategoryResult } from './services/clothingService';
export { UI_TO_DB_COLOR, DB_TO_UI_COLOR } from './services/clothingService';
export { storageService } from './services/storageService';

// Components
export { CameraOverlayGuide } from './components/CameraOverlayGuide';
export { CategorySelector } from './components/CategorySelector';
export { EditCategoryModal } from './components/EditCategoryModal';
export { ColorSelector } from './components/ColorSelector';

// Hooks
export { useUpdateCategoryMutation, wardrobeKeys } from './hooks/useUpdateCategoryMutation';
export { useSaveClothingMutation } from './hooks/useSaveClothingMutation';

// Screens
export { CameraScreen } from './screens/CameraScreen';
export { PhotoPreviewScreen } from './screens/PhotoPreviewScreen';
export { GalleryPickerScreen } from './screens/GalleryPickerScreen';
export { ProcessingScreen } from './screens/ProcessingScreen';
export { CategorizeScreen } from './screens/CategorizeScreen';
export { ColorSelectionScreen } from './screens/ColorSelectionScreen';
export { SaveScreen } from './screens/SaveScreen';

// Types (Story 2.3 + 2.4 + 2.5 + 2.6)
export { ProcessingError, isProcessingError } from './types/wardrobe.types';
export type { ProcessingResult, ProcessingErrorCode } from './types/wardrobe.types';
export type { ClothingCategory, CategorySelectionParams } from './types/wardrobe.types';
export { CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_ORDER } from './types/wardrobe.types';
export type { ClothingColor, ColorSelectionParams } from './types/wardrobe.types';
export { COLOR_LABELS, COLOR_HEX, COLOR_ORDER } from './types/wardrobe.types';
export type {
  SaveClothingInput,
  SaveClothingResult,
  SaveScreenParams,
} from './types/wardrobe.types';
