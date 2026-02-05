// Barrel exports for wardrobe feature
// Story 2.1: Capture Photo Camera
// Story 2.2: Import depuis Galerie

// Services
export { cameraService } from './services/cameraService';
export type { PermissionResult } from './services/cameraService';
export { galleryService, isGalleryError, GalleryError } from './services/galleryService';
export type { GalleryImageResult, GalleryErrorCode } from './services/galleryService';

// Components
export { CameraOverlayGuide } from './components/CameraOverlayGuide';

// Screens
export { CameraScreen } from './screens/CameraScreen';
export { PhotoPreviewScreen } from './screens/PhotoPreviewScreen';
export { GalleryPickerScreen } from './screens/GalleryPickerScreen';
