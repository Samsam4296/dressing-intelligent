/**
 * Profiles Feature - Barrel Exports
 * Story 1.5: Création Premier Profil
 * Story 1.6: Création Profils Additionnels
 *
 * Exports all public APIs for the profiles feature.
 */

// Types
export type {
  Profile,
  CreateProfileRequest,
  UpdateProfileRequest,
  ProfileResponse,
  ProfileError,
} from './types/profile.types';
export { validateProfileName } from './types/profile.types';

// Services
export { profileService } from './services/profileService';

// Hooks - TanStack Query
export {
  profileKeys,
  useProfiles,
  useActiveProfile,
  useCreateProfile,
  useUpdateProfile,
  useSetActiveProfile,
  useDeleteProfile,
  useUploadAvatar,
} from './hooks/useProfiles';

// Hooks - Navigation Guards
export { useRequireNoProfile } from './hooks/useRequireNoProfile';
export { useRequireProfile } from './hooks/useRequireProfile';

// Store - Zustand
export { useProfileStore } from './stores/useProfileStore';

// Components
export { AvatarPicker } from './components/AvatarPicker';
export { CreateProfileScreen } from './components/CreateProfileScreen';
// Story 1.6: Multi-profile management components
export { ProfilesList } from './components/ProfilesList';
export { ProfileBubble } from './components/ProfileBubble';
export { AddProfileModal } from './components/AddProfileModal';
