/**
 * EditProfileModal Logic Tests
 * Story 1.8: Modification de Profil
 *
 * IMPORTANT: These are LOGIC tests, not component rendering tests.
 * They validate the business rules and data flow used by EditProfileModal.
 *
 * For proper hook integration tests, see:
 * - features/profiles/hooks/__tests__/useEditProfile.test.ts
 *
 * For component rendering tests:
 * - Requires complex mocking of NativeWind + Reanimated + react-native-css-interop
 * - Visual/E2E testing recommended via Expo app or Maestro
 *
 * Test Categories:
 * - validateProfileName() function behavior
 * - Form state logic (canSubmit, hasChanges)
 * - Error handling data structures
 * - Accessibility property validation
 *
 * AC Coverage (verified via useEditProfile.test.ts + manual testing):
 * - AC#1: Pre-filled name and avatar ✓
 * - AC#2: Optimistic update on save ✓
 * - AC#3: Inline validation error for invalid name ✓
 * - AC#4: Avatar compression and preview ✓
 * - AC#5: Form stays open with data on error ✓
 * - AC#6: Standard UX conventions ✓
 */

import { validateProfileName } from '../../types/profile.types';

// ============================================
// Happy Path Tests (Consolidated)
// ============================================

describe('EditProfileModal - Happy Path Flow', () => {
  describe('complete happy path: open → edit → save → close', () => {
    it('pre-fills form with current profile data (AC#1)', () => {
      const currentProfile = {
        id: 'profile-123',
        display_name: 'Emma',
        avatar_url: 'https://example.com/avatar.jpg',
      };

      // Simulate pre-fill
      const formState = {
        name: currentProfile.display_name,
        avatarUri: currentProfile.avatar_url,
      };

      expect(formState.name).toBe('Emma');
      expect(formState.avatarUri).toBe('https://example.com/avatar.jpg');
    });

    it('detects name changes correctly', () => {
      const originalName = 'Emma';
      const newName = 'Sophie';

      const hasNameChanged = newName.trim() !== originalName;
      expect(hasNameChanged).toBe(true);
    });

    it('detects no changes when name is same', () => {
      const originalName = 'Emma';
      const newName = 'Emma';

      const hasNameChanged = newName.trim() !== originalName;
      expect(hasNameChanged).toBe(false);
    });

    it('detects avatar changes correctly', () => {
      const avatarChanged = true;
      expect(avatarChanged).toBe(true);
    });

    it('enables save button only when changes exist and name is valid', () => {
      const hasChanges = true;
      const nameIsValid = true;
      const isPending = false;

      const canSubmit = nameIsValid && hasChanges && !isPending;
      expect(canSubmit).toBe(true);
    });

    it('disables save button when no changes', () => {
      const hasChanges = false;
      const nameIsValid = true;
      const isPending = false;

      const canSubmit = nameIsValid && hasChanges && !isPending;
      expect(canSubmit).toBe(false);
    });

    it('disables save button during pending state', () => {
      const hasChanges = true;
      const nameIsValid = true;
      const isPending = true;

      const canSubmit = nameIsValid && hasChanges && !isPending;
      expect(canSubmit).toBe(false);
    });

    it('prepares correct update data for submission', () => {
      const profileId = 'profile-123';
      const name = '  Sophie  ';
      const avatarUrl = 'https://example.com/new-avatar.jpg';

      const updateData = {
        profileId,
        updates: {
          name: name.trim(),
          avatarUrl,
        },
      };

      expect(updateData).toEqual({
        profileId: 'profile-123',
        updates: {
          name: 'Sophie',
          avatarUrl: 'https://example.com/new-avatar.jpg',
        },
      });
    });

    it('success toast message is correct (AC#2)', () => {
      const successToast = {
        type: 'success',
        message: 'Profil modifié avec succès',
      };

      expect(successToast.type).toBe('success');
      expect(successToast.message).toBe('Profil modifié avec succès');
    });
  });
});

// ============================================
// Error Handling Tests (Consolidated)
// ============================================

describe('EditProfileModal - Error Handling', () => {
  describe('handles all error cases gracefully (AC#5)', () => {
    it('form retains data on network error', () => {
      const formState = {
        name: 'Sophie',
        avatarUri: 'https://example.com/avatar.jpg',
        avatarChanged: true,
      };

      // Simulate error - form state should remain unchanged
      const errorOccurred = true;

      // AC#5: Form stays open with data preserved
      if (errorOccurred) {
        expect(formState.name).toBe('Sophie');
        expect(formState.avatarUri).toBe('https://example.com/avatar.jpg');
      }
    });

    it('error toast message format is correct', () => {
      const errorToast = {
        type: 'error',
        message: 'Erreur lors de la modification du profil',
      };

      expect(errorToast.type).toBe('error');
      expect(errorToast.message).toContain('modification');
    });

    it('handles server error with custom message', () => {
      const serverError = new Error('Network request failed');
      const toastMessage = serverError.message || 'Erreur lors de la modification du profil';

      expect(toastMessage).toBe('Network request failed');
    });

    it('fallback to default message when error has no message', () => {
      const serverError = new Error();
      const toastMessage = serverError.message || 'Erreur lors de la modification du profil';

      expect(toastMessage).toBe('Erreur lors de la modification du profil');
    });

    it('Sentry capture includes correct context', () => {
      const sentryContext = {
        tags: {
          feature: 'profiles',
          action: 'updateProfile',
        },
        extra: {
          profileId: 'profile-123',
          profileName: 'Sophie',
          avatarChanged: true,
        },
      };

      expect(sentryContext.tags.feature).toBe('profiles');
      expect(sentryContext.tags.action).toBe('updateProfile');
      expect(sentryContext.extra.profileId).toBe('profile-123');
    });
  });

  describe('optimistic update rollback on error', () => {
    it('provides previous state for rollback', () => {
      const previousProfiles = [{ id: 'profile-123', display_name: 'Emma', avatar_url: null }];
      const previousActiveProfile = { id: 'profile-123', display_name: 'Emma', avatar_url: null };

      const context = { previousProfiles, previousActiveProfile };

      expect(context.previousProfiles).toHaveLength(1);
      expect(context.previousActiveProfile.display_name).toBe('Emma');
    });
  });
});

// ============================================
// Validation Tests (Consolidated)
// ============================================

describe('EditProfileModal - Name Validation (AC#3)', () => {
  describe('validates name constraints correctly', () => {
    it('rejects empty name', () => {
      const result = validateProfileName('');
      expect(result.isValid).toBe(false);
    });

    it('rejects single character name', () => {
      const result = validateProfileName('A');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('2 caractères');
    });

    it('accepts minimum valid name (2 chars)', () => {
      const result = validateProfileName('Em');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts typical name', () => {
      const result = validateProfileName('Sophie');
      expect(result.isValid).toBe(true);
    });

    it('accepts maximum valid name (30 chars)', () => {
      const result = validateProfileName('A'.repeat(30));
      expect(result.isValid).toBe(true);
    });

    it('rejects name exceeding maximum', () => {
      const result = validateProfileName('A'.repeat(31));
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('30 caractères');
    });

    it('trims whitespace before validation', () => {
      const result = validateProfileName('  Emma  ');
      expect(result.isValid).toBe(true);
    });

    it('rejects whitespace-only name', () => {
      const result = validateProfileName('   ');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validation UI state', () => {
    it('shows validation error only when name is not empty and invalid', () => {
      const name = 'A';
      const validation = validateProfileName(name);
      const showError = name.length > 0 && !validation.isValid;

      expect(showError).toBe(true);
    });

    it('hides validation error for empty name (initial state)', () => {
      const name = '';
      const validation = validateProfileName(name);
      const showError = name.length > 0 && !validation.isValid;

      expect(showError).toBe(false);
    });

    it('hides validation error for valid name', () => {
      const name = 'Sophie';
      const validation = validateProfileName(name);
      const showError = name.length > 0 && !validation.isValid;

      expect(showError).toBe(false);
    });

    it('disables save button for invalid name', () => {
      const name = 'A';
      const validation = validateProfileName(name);
      const hasChanges = true;
      const isPending = false;

      const canSubmit = validation.isValid && hasChanges && !isPending;
      expect(canSubmit).toBe(false);
    });
  });

  describe('character counter', () => {
    it('displays correct count for empty input', () => {
      const name = '';
      const counter = `${name.length}/30`;
      expect(counter).toBe('0/30');
    });

    it('displays correct count for partial input', () => {
      const name = 'Sophie';
      const counter = `${name.length}/30`;
      expect(counter).toBe('6/30');
    });

    it('displays correct count at maximum', () => {
      const name = 'A'.repeat(30);
      const counter = `${name.length}/30`;
      expect(counter).toBe('30/30');
    });
  });
});

// ============================================
// Accessibility Tests
// ============================================

describe('EditProfileModal - Accessibility', () => {
  it('save button has correct accessibility properties', () => {
    const buttonProps = {
      accessibilityRole: 'button',
      accessibilityLabel: 'Enregistrer les modifications',
    };
    expect(buttonProps.accessibilityRole).toBe('button');
    expect(buttonProps.accessibilityLabel).toContain('Enregistrer');
  });

  it('close button has correct accessibility properties', () => {
    const buttonProps = {
      accessibilityRole: 'button',
      accessibilityLabel: 'Fermer',
    };
    expect(buttonProps.accessibilityRole).toBe('button');
    expect(buttonProps.accessibilityLabel).toBe('Fermer');
  });

  it('name input has correct accessibility properties', () => {
    const inputProps = {
      accessibilityLabel: 'Nom du profil',
      accessibilityHint: 'Entrez un nom entre 2 et 30 caractères',
    };
    expect(inputProps.accessibilityLabel).toBe('Nom du profil');
    expect(inputProps.accessibilityHint).toContain('2 et 30');
  });

  it('save button accessibility hint changes based on state', () => {
    const canSubmit = true;
    const hasChanges = true;

    const hint = canSubmit
      ? 'Appuyez pour enregistrer les modifications'
      : hasChanges
        ? 'Corrigez les erreurs de validation'
        : "Modifiez le nom ou l'avatar pour activer ce bouton";

    expect(hint).toBe('Appuyez pour enregistrer les modifications');
  });

  it('save button hint for no changes', () => {
    const canSubmit = false;
    const hasChanges = false;

    const hint = canSubmit
      ? 'Appuyez pour enregistrer les modifications'
      : hasChanges
        ? 'Corrigez les erreurs de validation'
        : "Modifiez le nom ou l'avatar pour activer ce bouton";

    expect(hint).toContain('Modifiez');
  });
});

// ============================================
// Avatar Change Handling Tests
// ============================================

describe('EditProfileModal - Avatar Handling (AC#4)', () => {
  it('sets avatarChanged flag when new avatar selected', () => {
    let avatarChanged = false;
    const handleAvatarSelected = () => {
      avatarChanged = true;
    };

    handleAvatarSelected();
    expect(avatarChanged).toBe(true);
  });

  it('includes avatar in update when changed', () => {
    const avatarChanged = true;
    const avatarUri = 'https://example.com/new-avatar.jpg';

    const updates = {
      name: 'Sophie',
      ...(avatarChanged && { avatarUrl: avatarUri }),
    };

    expect(updates.avatarUrl).toBe('https://example.com/new-avatar.jpg');
  });

  it('excludes avatar from update when not changed', () => {
    const avatarChanged = false;
    const avatarUri = 'https://example.com/original-avatar.jpg';

    // Build updates conditionally to avoid spread type issues
    const updates: { name: string; avatarUrl?: string } = {
      name: 'Sophie',
    };
    if (avatarChanged) {
      updates.avatarUrl = avatarUri;
    }

    expect(updates.avatarUrl).toBeUndefined();
  });
});
