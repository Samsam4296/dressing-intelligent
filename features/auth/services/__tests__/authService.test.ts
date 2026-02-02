/**
 * authService Unit Tests
 * Story 1.2: Création de Compte
 * Story 1.3: Connexion Utilisateur
 *
 * Tests for the authentication service signUp, signIn, and signOut methods.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import * as Sentry from '@sentry/react-native';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/storage');
jest.mock('@sentry/react-native');

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
  });

  describe('signUp', () => {
    it('returns user data on successful signup', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        confirmed_at: null,
      };

      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const { authService } = require('../authService');
      const result = await authService.signUp({
        email: 'test@example.com',
        password: 'TestPassword123',
      });

      expect(result.data).toEqual(mockUser);
      expect(result.error).toBeNull();
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'TestPassword123',
        options: {
          emailRedirectTo: 'dressingintelligent://verify-email',
          data: {
            display_name: undefined,
          },
        },
      });
    });

    it('returns CONFIG_ERROR when Supabase is not configured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);

      const { authService } = require('../authService');
      const result = await authService.signUp({
        email: 'test@example.com',
        password: 'TestPassword123',
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('CONFIG_ERROR');
      expect(result.error?.message).toContain('authentification');
      expect(Sentry.captureMessage).toHaveBeenCalled();
    });

    it('returns EMAIL_EXISTS error when email is already registered', async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'User already registered', status: 400 },
      });

      const { authService } = require('../authService');
      const result = await authService.signUp({
        email: 'existing@example.com',
        password: 'TestPassword123',
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('EMAIL_EXISTS');
      expect(result.error?.message).toContain('déjà utilisée');
      expect(Sentry.captureException).toHaveBeenCalled();
    });

    it('returns NETWORK_ERROR on network failure', async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'Network request failed', status: 0 },
      });

      const { authService } = require('../authService');
      const result = await authService.signUp({
        email: 'test@example.com',
        password: 'TestPassword123',
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('NETWORK_ERROR');
      expect(result.error?.message).toContain('connexion');
    });

    it('returns RATE_LIMITED error on too many attempts', async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'Rate limit exceeded', status: 429 },
      });

      const { authService } = require('../authService');
      const result = await authService.signUp({
        email: 'test@example.com',
        password: 'TestPassword123',
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('RATE_LIMITED');
      expect(result.error?.message).toContain('Trop de tentatives');
    });

    it('returns UNEXPECTED_ERROR on exception', async () => {
      (supabase.auth.signUp as jest.Mock).mockRejectedValue(new Error('Unexpected error'));

      const { authService } = require('../authService');
      const result = await authService.signUp({
        email: 'test@example.com',
        password: 'TestPassword123',
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('UNEXPECTED_ERROR');
      expect(Sentry.captureException).toHaveBeenCalled();
    });

    it('passes display name to Supabase when provided', async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: { id: 'test-id' } },
        error: null,
      });

      const { authService } = require('../authService');
      await authService.signUp({
        email: 'test@example.com',
        password: 'TestPassword123',
        displayName: 'Test User',
      });

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'TestPassword123',
        options: {
          emailRedirectTo: 'dressingintelligent://verify-email',
          data: {
            display_name: 'Test User',
          },
        },
      });
    });

    it('adds breadcrumb for users awaiting verification', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        confirmed_at: null, // Not verified yet
      };

      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const { authService } = require('../authService');
      await authService.signUp({
        email: 'test@example.com',
        password: 'TestPassword123',
      });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'auth',
        message: 'User signed up - awaiting email verification',
        level: 'info',
      });
    });
  });

  /**
   * Story 1.3: Connexion Utilisateur - signIn tests
   */
  describe('signIn', () => {
    const mockSession = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_at: Date.now() + 3600000,
    };
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
    };

    it('returns session data on successful signin (AC#1)', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      const { authService } = require('../authService');
      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'TestPassword123',
      });

      expect(result.data).toEqual(mockSession);
      expect(result.error).toBeNull();
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'TestPassword123',
      });
    });

    it('stores session in MMKV on successful signin (AC#3)', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      const { authService } = require('../authService');
      await authService.signIn({
        email: 'test@example.com',
        password: 'TestPassword123',
      });

      expect(storage.set).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_STATE, expect.any(String));
    });

    it('returns CONFIG_ERROR when Supabase is not configured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);

      const { authService } = require('../authService');
      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'TestPassword123',
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('CONFIG_ERROR');
      expect(result.error?.message).toContain('authentification');
    });

    it('returns INVALID_CREDENTIALS error on wrong password (AC#5)', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid login credentials', status: 400 },
      });

      const { authService } = require('../authService');
      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'WrongPassword',
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
      expect(result.error?.message).toContain('incorrect');
      expect(Sentry.captureException).toHaveBeenCalled();
    });

    it('returns EMAIL_NOT_CONFIRMED error for unverified users', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Email not confirmed', status: 400 },
      });

      const { authService } = require('../authService');
      const result = await authService.signIn({
        email: 'unverified@example.com',
        password: 'TestPassword123',
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('EMAIL_NOT_CONFIRMED');
      expect(result.error?.message).toContain('confirmer');
    });

    it('returns RATE_LIMITED error on too many attempts (AC#4)', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Too many requests', status: 429 },
      });

      const { authService } = require('../authService');
      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'TestPassword123',
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('RATE_LIMITED');
      expect(result.error?.message).toContain('Trop de tentatives');
    });

    it('returns NETWORK_ERROR on network failure', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Network request failed', status: 0 },
      });

      const { authService } = require('../authService');
      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'TestPassword123',
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('NETWORK_ERROR');
      expect(result.error?.message).toContain('connexion');
    });

    it('returns UNEXPECTED_ERROR on exception', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );

      const { authService } = require('../authService');
      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'TestPassword123',
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('UNEXPECTED_ERROR');
      expect(Sentry.captureException).toHaveBeenCalled();
    });

    it('adds breadcrumb on successful signin', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      const { authService } = require('../authService');
      await authService.signIn({
        email: 'test@example.com',
        password: 'TestPassword123',
      });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'auth',
        message: 'User signed in successfully',
        level: 'info',
      });
    });
  });

  /**
   * Story 1.3: Connexion Utilisateur - signOut tests
   */
  describe('signOut', () => {
    it('returns null data on successful signout', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      const { authService } = require('../authService');
      const result = await authService.signOut();

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('clears auth state from MMKV on signout', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      const { authService } = require('../authService');
      await authService.signOut();

      expect(storage.delete).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_STATE);
    });

    it('returns CONFIG_ERROR when Supabase is not configured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);

      const { authService } = require('../authService');
      const result = await authService.signOut();

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('CONFIG_ERROR');
    });

    it('returns SIGNOUT_ERROR on Supabase error', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: { message: 'Failed to sign out' },
      });

      const { authService } = require('../authService');
      const result = await authService.signOut();

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('SIGNOUT_ERROR');
      expect(Sentry.captureException).toHaveBeenCalled();
    });

    it('returns UNEXPECTED_ERROR on exception', async () => {
      (supabase.auth.signOut as jest.Mock).mockRejectedValue(new Error('Unexpected error'));

      const { authService } = require('../authService');
      const result = await authService.signOut();

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('UNEXPECTED_ERROR');
      expect(Sentry.captureException).toHaveBeenCalled();
    });

    it('adds breadcrumb on successful signout', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      const { authService } = require('../authService');
      await authService.signOut();

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'auth',
        message: 'User signed out successfully',
        level: 'info',
      });
    });
  });
});
