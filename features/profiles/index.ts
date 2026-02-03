/**
 * Profiles Feature - Barrel Exports
 * Story 1.5: Création Premier Profil
 * Story 1.6: Création Profils Additionnels
 * Story 1.7: Switch Entre Profils
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
  NameValidationResult,
} from './types/profile.types';
export { validateProfileName } from './types/profile.types';

// Types - Story 1.7: Switch
export type { SwitchResult, SwitchProfileResponse } from './services/switchProfileService';

// Services
export { profileService } from './services/profileService';
// Story 1.7: Switch profile service
export { switchProfileService } from './services/switchProfileService';

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
  // Story 1.7: Switch profile
  useSwitchProfile,
  getPendingSwitch,
  clearPendingSwitch,
} from './hooks/useProfiles';

// Hooks - Navigation Guards
export { useRequireNoProfile } from './hooks/useRequireNoProfile';
export { useRequireProfile } from './hooks/useRequireProfile';

// Hooks - Story 1.7: Offline Sync
export { useSyncPendingSwitch } from './hooks/useSyncPendingSwitch';
export { useValidateActiveProfile } from './hooks/useValidateActiveProfile';

// Hooks - Story 1.8: Edit Profile
export { useEditProfile } from './hooks/useEditProfile';

// Store - Zustand
export {
  useProfileStore,
  // Story 1.7: Convenience selectors
  useCurrentProfileId,
  useSetCurrentProfile,
} from './stores/useProfileStore';

// Components
export { AvatarPicker } from './components/AvatarPicker';
export { CreateProfileScreen } from './components/CreateProfileScreen';
// Story 1.6: Multi-profile management components
export { ProfilesList } from './components/ProfilesList';
export { ProfileBubble } from './components/ProfileBubble';
export { AddProfileModal } from './components/AddProfileModal';
// Story 1.7: Profile indicator in header
export { ProfileIndicator } from './components/ProfileIndicator';
// Story 1.8: Edit profile modal
export { EditProfileModal } from './components/EditProfileModal';
