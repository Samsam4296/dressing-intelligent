// Barrel exports for wardrobe feature
// Story 2.1: Capture Photo Camera
// Story 2.2: Import depuis Galerie
// Story 2.3: Détourage automatique

// Services
export { cameraService } from './services/cameraService';
export type { PermissionResult } from './services/cameraService';
export { galleryService, isGalleryError, GalleryError } from './services/galleryService';
export type { GalleryImageResult, GalleryErrorCode } from './services/galleryService';
export { imageProcessingService } from './services/imageProcessingService';

// Components
export { CameraOverlayGuide } from './components/CameraOverlayGuide';

// Screens
export { CameraScreen } from './screens/CameraScreen';
export { PhotoPreviewScreen } from './screens/PhotoPreviewScreen';
export { GalleryPickerScreen } from './screens/GalleryPickerScreen';
export { ProcessingScreen } from './screens/ProcessingScreen';

// Types (Story 2.3)
export { ProcessingError, isProcessingError } from './types/wardrobe.types';
export type { ProcessingResult, ProcessingErrorCode } from './types/wardrobe.types';
