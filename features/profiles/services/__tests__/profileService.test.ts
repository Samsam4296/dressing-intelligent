/**
 * profileService Unit Tests
 * Story 1.5: Création Premier Profil
 *
 * Tests for profile CRUD operations and avatar upload.
 */

// Mock modules - factories must NOT reference external variables (jest hoisting)
jest.mock('@sentry/react-native');
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  captureError: jest.fn(),
}));

// Use getter pattern to allow mocks to be configured
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  },
  isSupabaseConfigured: jest.fn(),
}));

// Mock fetch for avatar upload
global.fetch = jest.fn();

// Import after mocks are set up
import { profileService } from '../profileService';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Type assertion for mocked module
const mockSupabase = jest.mocked(supabase);
const mockIsSupabaseConfigured = jest.mocked(isSupabaseConfigured);

describe('profileService', () => {
  const mockUser = { id: 'user-123' };
  const mockProfile = {
    id: 'profile-123',
    user_id: 'user-123',
    display_name: 'Emma',
    avatar_url: null,
    is_active: true,
    created_at: '2026-02-02T10:00:00Z',
    updated_at: '2026-02-02T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSupabaseConfigured.mockReturnValue(true);

    // Default mock for auth.getUser
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    } as any);
  });

  describe('createProfile', () => {
    it('creates a profile successfully (AC#5)', async () => {
      // For count query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
      } as any);

      // For insert query
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }),
        }),
      } as any);

      const result = await profileService.createProfile({ name: 'Emma' });

      expect(result.data).toEqual(mockProfile);
      expect(result.error).toBeNull();
    });

    it('sets is_active=true for first profile (AC#6)', async () => {
      // Mock count = 0 (first profile)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
      } as any);

      const insertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { ...mockProfile, is_active: true }, error: null }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        insert: insertMock,
      } as any);

      await profileService.createProfile({ name: 'Emma' });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: true })
      );
    });

    it('sets is_active=false for second profile', async () => {
      // Mock count = 1 (second profile)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ count: 1, error: null }),
      } as any);

      const insertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { ...mockProfile, is_active: false }, error: null }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        insert: insertMock,
      } as any);

      await profileService.createProfile({ name: 'Lucas' });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false })
      );
    });

    it('returns CONFIG_ERROR when Supabase is not configured', async () => {
      mockIsSupabaseConfigured.mockReturnValue(false);

      const result = await profileService.createProfile({ name: 'Emma' });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('CONFIG_ERROR');
      expect(result.error?.message).toContain('configuré');
    });

    it('returns AUTH_ERROR when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      } as any);

      const result = await profileService.createProfile({ name: 'Emma' });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('AUTH_ERROR');
      expect(result.error?.message).toContain('authentifié');
    });

    it('returns MAX_PROFILES error when user has 3 profiles (FR4)', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ count: 3, error: null }),
      } as any);

      const result = await profileService.createProfile({ name: 'Emma' });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('MAX_PROFILES');
      expect(result.error?.message).toContain('maximum');
    });

    it('returns VALIDATION_ERROR on name length constraint violation', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
      } as any);

      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'check_display_name_length' },
            }),
          }),
        }),
      } as any);

      const result = await profileService.createProfile({ name: 'A' });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns DUPLICATE_NAME error when name already exists', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
      } as any);

      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'duplicate key value violates unique constraint' },
            }),
          }),
        }),
      } as any);

      const result = await profileService.createProfile({ name: 'Emma' });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('DUPLICATE_NAME');
    });

    it('returns NETWORK_ERROR on network failure', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: null,
          error: { message: 'network request failed' },
        }),
      } as any);

      const result = await profileService.createProfile({ name: 'Emma' });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('NETWORK_ERROR');
    });
  });

  describe('getProfiles', () => {
    it('returns all profiles for current user (AC#5: RLS)', async () => {
      const profiles = [mockProfile, { ...mockProfile, id: 'profile-456', display_name: 'Lucas' }];

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: profiles, error: null }),
        }),
      } as any);

      const result = await profileService.getProfiles();

      expect(result.data).toEqual(profiles);
      expect(result.error).toBeNull();
    });

    it('returns empty array when user has no profiles', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      } as any);

      const result = await profileService.getProfiles();

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('returns CONFIG_ERROR when Supabase is not configured', async () => {
      mockIsSupabaseConfigured.mockReturnValue(false);

      const result = await profileService.getProfiles();

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('CONFIG_ERROR');
    });
  });

  describe('getActiveProfile', () => {
    it('returns the active profile', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }),
        }),
      } as any);

      const result = await profileService.getActiveProfile();

      expect(result.data).toEqual(mockProfile);
      expect(result.error).toBeNull();
    });

    it('returns null data when no active profile exists (new user)', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'no rows returned' },
            }),
          }),
        }),
      } as any);

      const result = await profileService.getActiveProfile();

      // No active profile is NOT an error for new users
      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });

    it('returns CONFIG_ERROR when Supabase is not configured', async () => {
      mockIsSupabaseConfigured.mockReturnValue(false);

      const result = await profileService.getActiveProfile();

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('CONFIG_ERROR');
    });
  });

  describe('setActiveProfile', () => {
    it('sets a profile as active (AC#6: single active)', async () => {
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      const result = await profileService.setActiveProfile('profile-123');

      expect(result.error).toBeNull();
    });

    it('returns CONFIG_ERROR when Supabase is not configured', async () => {
      mockIsSupabaseConfigured.mockReturnValue(false);

      const result = await profileService.setActiveProfile('profile-123');

      expect(result.error?.code).toBe('CONFIG_ERROR');
    });
  });

  describe('updateProfile', () => {
    it('updates profile name successfully', async () => {
      const updatedProfile = { ...mockProfile, display_name: 'Sophie' };

      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: updatedProfile, error: null }),
            }),
          }),
        }),
      } as any);

      const result = await profileService.updateProfile('profile-123', { name: 'Sophie' });

      expect(result.data?.display_name).toBe('Sophie');
      expect(result.error).toBeNull();
    });

    it('updates profile avatar URL', async () => {
      const updatedProfile = { ...mockProfile, avatar_url: 'https://example.com/avatar.jpg' };

      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: updatedProfile, error: null }),
            }),
          }),
        }),
      } as any);

      const result = await profileService.updateProfile('profile-123', {
        avatarUrl: 'https://example.com/avatar.jpg',
      });

      expect(result.data?.avatar_url).toBe('https://example.com/avatar.jpg');
      expect(result.error).toBeNull();
    });

    it('returns CONFIG_ERROR when Supabase is not configured', async () => {
      mockIsSupabaseConfigured.mockReturnValue(false);

      const result = await profileService.updateProfile('profile-123', { name: 'Test' });

      expect(result.error?.code).toBe('CONFIG_ERROR');
    });
  });

  describe('deleteProfile', () => {
    it('deletes a profile and avatar successfully', async () => {
      // Mock auth.getUser
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      } as any);

      // Mock storage.remove for avatar deletion
      mockSupabase.storage.from.mockReturnValueOnce({
        remove: jest.fn().mockResolvedValue({ error: null }),
      } as any);

      // Mock profile deletion
      mockSupabase.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      const result = await profileService.deleteProfile('profile-123');

      expect(result.error).toBeNull();
      // Verify avatar deletion was attempted
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('avatars');
    });

    it('returns CONFIG_ERROR when Supabase is not configured', async () => {
      mockIsSupabaseConfigured.mockReturnValue(false);

      const result = await profileService.deleteProfile('profile-123');

      expect(result.error?.code).toBe('CONFIG_ERROR');
    });

    it('deletes profile even if avatar does not exist', async () => {
      // Mock auth.getUser
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      } as any);

      // Mock storage.remove returning error (avatar doesn't exist)
      mockSupabase.storage.from.mockReturnValueOnce({
        remove: jest.fn().mockResolvedValue({ error: { message: 'Not found' } }),
      } as any);

      // Mock profile deletion still succeeds
      mockSupabase.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      const result = await profileService.deleteProfile('profile-123');

      // Should still succeed - avatar deletion is best effort
      expect(result.error).toBeNull();
    });
  });

  describe('uploadAvatar', () => {
    const mockSignedUrl = 'https://supabase.co/storage/avatars/user-123/profile-123.jpg?token=xyz';

    beforeEach(() => {
      // Mock fetch for blob conversion
      (global.fetch as jest.Mock).mockResolvedValue({
        blob: jest.fn().mockResolvedValue(new Blob(['test'], { type: 'image/jpeg' })),
      });
    });

    it('uploads avatar and returns signed URL (AC#3, AC#7)', async () => {
      mockSupabase.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: mockSignedUrl },
          error: null,
        }),
      } as any);

      const result = await profileService.uploadAvatar('profile-123', 'file:///image.jpg');

      expect(result.data?.signedUrl).toBe(mockSignedUrl);
      expect(result.data?.storagePath).toBe('user-123/profile-123.jpg');
      expect(result.error).toBeNull();
    });

    it('uses correct path format: user_id/profile_id.jpg (NFR-S5)', async () => {
      const uploadMock = jest.fn().mockResolvedValue({ error: null });

      mockSupabase.storage.from.mockReturnValue({
        upload: uploadMock,
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: mockSignedUrl },
          error: null,
        }),
      } as any);

      await profileService.uploadAvatar('profile-123', 'file:///image.jpg');

      expect(uploadMock).toHaveBeenCalledWith(
        'user-123/profile-123.jpg',
        expect.any(Blob),
        expect.objectContaining({ contentType: 'image/jpeg', upsert: true })
      );
    });

    it('returns AUTH_ERROR when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);

      const result = await profileService.uploadAvatar('profile-123', 'file:///image.jpg');

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('AUTH_ERROR');
    });

    it('returns UPLOAD_ERROR on storage failure', async () => {
      mockSupabase.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: { message: 'Upload failed' } }),
      } as any);

      const result = await profileService.uploadAvatar('profile-123', 'file:///image.jpg');

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('UPLOAD_ERROR');
    });

    it('returns CONFIG_ERROR when Supabase is not configured', async () => {
      mockIsSupabaseConfigured.mockReturnValue(false);

      const result = await profileService.uploadAvatar('profile-123', 'file:///image.jpg');

      expect(result.error?.code).toBe('CONFIG_ERROR');
    });
  });

  describe('refreshAvatarUrl', () => {
    it('returns a fresh signed URL', async () => {
      const newSignedUrl = 'https://supabase.co/storage/avatars/user-123/profile-123.jpg?token=new';

      mockSupabase.storage.from.mockReturnValue({
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: newSignedUrl },
          error: null,
        }),
      } as any);

      const result = await profileService.refreshAvatarUrl('user-123/profile-123.jpg');

      expect(result.data).toBe(newSignedUrl);
      expect(result.error).toBeNull();
    });

    it('returns FETCH_ERROR on signed URL failure', async () => {
      mockSupabase.storage.from.mockReturnValue({
        createSignedUrl: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Failed to create signed URL' },
        }),
      } as any);

      const result = await profileService.refreshAvatarUrl('user-123/profile-123.jpg');

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('FETCH_ERROR');
    });

    it('returns CONFIG_ERROR when Supabase is not configured', async () => {
      mockIsSupabaseConfigured.mockReturnValue(false);

      const result = await profileService.refreshAvatarUrl('user-123/profile-123.jpg');

      expect(result.error?.code).toBe('CONFIG_ERROR');
    });
  });
});
