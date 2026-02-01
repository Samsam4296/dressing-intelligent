/**
 * authService Unit Tests
 * Story 1.2: Création de Compte
 *
 * Tests for the authentication service signUp method.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import * as Sentry from '@sentry/react-native';

// Mock dependencies
jest.mock('@/lib/supabase');
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
});
