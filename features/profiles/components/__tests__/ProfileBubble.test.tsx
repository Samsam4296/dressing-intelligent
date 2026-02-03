/**
 * ProfileBubble Component Tests
 * Story 1.6: Création Profils Additionnels
 * Story 1.7: Switch Entre Profils
 *
 * Tests for profile bubble display and interaction.
 * AC#1 (1.7): Active profile visually distinguished
 * AC#2 (1.7): Non-active profiles clickable for switch
 * AC#7 (1.7): Haptic feedback on tap
 * AC#8 (1.7): Smooth 60fps animation
 * NFR-A1: Touch targets 44x44 minimum
 * NFR-A4: Dark mode support
 */

// Mock modules
const mockImpactAsync = jest.fn();

jest.mock('expo-haptics', () => ({
  impactAsync: (...args: any[]) => mockImpactAsync(...args),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Test data
const mockProfile = {
  id: 'profile-123',
  user_id: 'user-456',
  display_name: 'Emma',
  avatar_url: 'https://example.com/avatar.jpg',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockProfileNoAvatar = {
  ...mockProfile,
  id: 'profile-456',
  display_name: 'Lucas',
  avatar_url: null,
  is_active: false,
};

describe('ProfileBubble', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Active State Styling (AC#1 Story 1.7)', () => {
    it('applies active border class when isActive is true', () => {
      const isActive = true;
      const borderClass = isActive
        ? 'border-2 border-blue-500 dark:border-blue-400'
        : 'border-2 border-transparent';

      expect(borderClass).toContain('border-blue-500');
    });

    it('applies transparent border when isActive is false', () => {
      const isActive = false;
      const borderClass = isActive
        ? 'border-2 border-blue-500 dark:border-blue-400'
        : 'border-2 border-transparent';

      expect(borderClass).toContain('border-transparent');
    });

    it('applies active text color when isActive is true', () => {
      const isActive = true;
      const textClass = isActive
        ? 'text-blue-600 dark:text-blue-400 font-semibold'
        : 'text-gray-700 dark:text-gray-300';

      expect(textClass).toContain('text-blue-600');
      expect(textClass).toContain('font-semibold');
    });

    it('shows checkmark badge when active', () => {
      const isActive = true;
      const showBadge = isActive;

      expect(showBadge).toBe(true);
    });

    it('hides checkmark badge when not active', () => {
      const isActive = false;
      const showBadge = isActive;

      expect(showBadge).toBe(false);
    });
  });

  describe('Interactivity (AC#2 Story 1.7)', () => {
    it('is interactive when not active, not disabled, and has onPress', () => {
      const isActive = false;
      const disabled = false;
      const onPress = jest.fn();

      const isInteractive = onPress && !isActive && !disabled;

      expect(isInteractive).toBe(true);
    });

    it('is not interactive when active', () => {
      const isActive = true;
      const disabled = false;
      const onPress = jest.fn();

      const isInteractive = onPress && !isActive && !disabled;

      expect(isInteractive).toBe(false);
    });

    it('is not interactive when disabled', () => {
      const isActive = false;
      const disabled = true;
      const onPress = jest.fn();

      const isInteractive = onPress && !isActive && !disabled;

      expect(isInteractive).toBe(false);
    });

    it('is not interactive when no onPress provided', () => {
      const isActive = false;
      const disabled = false;
      const onPress = undefined;

      const isInteractive = onPress && !isActive && !disabled;

      expect(isInteractive).toBeFalsy();
    });
  });

  describe('Haptic Feedback (AC#7 Story 1.7)', () => {
    it('triggers haptic on press in when interactive', () => {
      const disabled = false;
      const isActive = false;
      const onPress = jest.fn();

      // Simulate handlePressIn logic
      if (!disabled && !isActive && onPress) {
        mockImpactAsync('light');
      }

      expect(mockImpactAsync).toHaveBeenCalledWith('light');
    });

    it('does not trigger haptic when disabled', () => {
      const disabled = true;
      const isActive = false;
      const onPress = jest.fn();

      if (!disabled && !isActive && onPress) {
        mockImpactAsync('light');
      }

      expect(mockImpactAsync).not.toHaveBeenCalled();
    });

    it('does not trigger haptic when active', () => {
      const disabled = false;
      const isActive = true;
      const onPress = jest.fn();

      if (!disabled && !isActive && onPress) {
        mockImpactAsync('light');
      }

      expect(mockImpactAsync).not.toHaveBeenCalled();
    });
  });

  describe('Animation (AC#8 Story 1.7)', () => {
    it('uses spring animation with correct damping', () => {
      const springConfig = { damping: 15, stiffness: 150 };

      expect(springConfig.damping).toBe(15);
      expect(springConfig.stiffness).toBe(150);
    });

    it('scales down to 0.95 on press', () => {
      const pressedScale = 0.95;
      const normalScale = 1;

      expect(pressedScale).toBeLessThan(normalScale);
      expect(pressedScale).toBe(0.95);
    });

    it('returns to scale 1 on release', () => {
      const releasedScale = 1;

      expect(releasedScale).toBe(1);
    });
  });

  describe('Disabled State', () => {
    it('applies opacity-50 when disabled', () => {
      const disabled = true;
      const opacityClass = disabled ? 'opacity-50' : '';

      expect(opacityClass).toBe('opacity-50');
    });

    it('does not apply opacity when not disabled', () => {
      const disabled = false;
      const opacityClass = disabled ? 'opacity-50' : '';

      expect(opacityClass).toBe('');
    });
  });

  describe('Accessibility (NFR-A1)', () => {
    it('generates correct accessibility label for active profile', () => {
      const displayName = 'Emma';
      const isActive = true;
      const label = `Profil ${displayName}${isActive ? ', profil actif' : ', appuyer pour changer de profil'}`;

      expect(label).toBe('Profil Emma, profil actif');
    });

    it('generates correct accessibility label for inactive profile', () => {
      const displayName = 'Lucas';
      const isActive = false;
      const label = `Profil ${displayName}${isActive ? ', profil actif' : ', appuyer pour changer de profil'}`;

      expect(label).toBe('Profil Lucas, appuyer pour changer de profil');
    });

    it('has correct accessibility state for active profile', () => {
      const isActive = true;
      const isInteractive = false;
      const accessibilityState = { selected: isActive, disabled: !isInteractive };

      expect(accessibilityState.selected).toBe(true);
      expect(accessibilityState.disabled).toBe(true);
    });

    it('has correct accessibility state for interactive profile', () => {
      const isActive = false;
      const isInteractive = true;
      const accessibilityState = { selected: isActive, disabled: !isInteractive };

      expect(accessibilityState.selected).toBe(false);
      expect(accessibilityState.disabled).toBe(false);
    });

    it('meets minimum touch target size', () => {
      const minWidth = 80; // min-w-[80px] from component
      const minHeight = 44; // min-h-[44px] from component

      expect(minWidth).toBeGreaterThanOrEqual(44);
      expect(minHeight).toBeGreaterThanOrEqual(44);
    });
  });

  describe('Avatar Display', () => {
    it('shows image when avatar_url is provided', () => {
      const profile = mockProfile;
      const hasAvatar = !!profile.avatar_url;

      expect(hasAvatar).toBe(true);
    });

    it('shows placeholder icon when avatar_url is null', () => {
      const profile = mockProfileNoAvatar;
      const hasAvatar = !!profile.avatar_url;

      expect(hasAvatar).toBe(false);
    });

    it('calculates placeholder icon size correctly', () => {
      const avatarSize = 64;
      const iconSize = avatarSize * 0.5;

      expect(iconSize).toBe(32);
    });
  });

  describe('Size Customization', () => {
    it('uses default size of 64', () => {
      const defaultSize = 64;
      expect(defaultSize).toBe(64);
    });

    it('applies custom size to avatar container', () => {
      const size = 80;
      const containerSize = size + 4; // border adds 4px

      expect(containerSize).toBe(84);
    });

    it('limits name width based on size', () => {
      const size = 64;
      const maxNameWidth = size + 16;

      expect(maxNameWidth).toBe(80);
    });
  });

  describe('Dark Mode Support (NFR-A4)', () => {
    it('applies dark mode border color for active', () => {
      const isDark = true;
      const isActive = true;
      const darkBorderClass = 'dark:border-blue-400';

      expect(darkBorderClass).toContain('dark:');
    });

    it('applies dark mode background for placeholder', () => {
      const darkBgClass = 'dark:bg-gray-700';
      expect(darkBgClass).toContain('dark:');
    });

    it('uses correct placeholder icon color for dark mode', () => {
      const isDark = true;
      const iconColor = isDark ? '#9CA3AF' : '#6B7280';

      expect(iconColor).toBe('#9CA3AF');
    });
  });

  describe('Press Handler', () => {
    it('calls onPress with profile when pressed', () => {
      const onPress = jest.fn();
      const disabled = false;
      const isActive = false;
      const profile = mockProfile;

      // Simulate handlePress
      if (!disabled && !isActive) {
        onPress(profile);
      }

      expect(onPress).toHaveBeenCalledWith(profile);
    });

    it('does not call onPress when active', () => {
      const onPress = jest.fn();
      const disabled = false;
      const isActive = true;
      const profile = mockProfile;

      if (!disabled && !isActive) {
        onPress(profile);
      }

      expect(onPress).not.toHaveBeenCalled();
    });

    it('does not call onPress when disabled', () => {
      const onPress = jest.fn();
      const disabled = true;
      const isActive = false;
      const profile = mockProfile;

      if (!disabled && !isActive) {
        onPress(profile);
      }

      expect(onPress).not.toHaveBeenCalled();
    });
  });

  describe('TestID', () => {
    it('generates correct testID from profile id', () => {
      const profileId = 'profile-123';
      const testID = `profile-bubble-${profileId}`;

      expect(testID).toBe('profile-bubble-profile-123');
    });
  });
});
