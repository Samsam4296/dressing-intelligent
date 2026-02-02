/**
 * usePasswordReset Hook Tests
 * Story 1.4: Réinitialisation Mot de Passe
 *
 * Tests for password reset hook functionality.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePasswordReset } from '../usePasswordReset';
import { authService } from '../../services/authService';

// Mock authService
jest.mock('../../services/authService', () => ({
  authService: {
    requestPasswordReset: jest.fn(),
    confirmPasswordReset: jest.fn(),
  },
}));

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));

describe('usePasswordReset Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('returns correct initial state', () => {
      const { result } = renderHook(() => usePasswordReset());

      // Request state
      expect(result.current.requestState.isLoading).toBe(false);
      expect(result.current.requestState.isSuccess).toBe(false);
      expect(result.current.requestState.error).toBeNull();

      // Confirm state
      expect(result.current.confirmState.isLoading).toBe(false);
      expect(result.current.confirmState.isSuccess).toBe(false);
      expect(result.current.confirmState.error).toBeNull();
    });
  });

  describe('requestPasswordReset (AC#1)', () => {
    it('sets loading state when requesting', async () => {
      const mockRequest = authService.requestPasswordReset as jest.Mock;
      mockRequest.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: { message: 'Email envoyé' }, error: null }), 100)
          )
      );

      const { result } = renderHook(() => usePasswordReset());

      // Start request
      act(() => {
        result.current.requestPasswordReset('test@example.com');
      });

      // Should be loading
      expect(result.current.requestState.isLoading).toBe(true);

      // Wait for completion
      await waitFor(() => {
        expect(result.current.requestState.isLoading).toBe(false);
      });
    });

    it('sets success state on successful request', async () => {
      const mockRequest = authService.requestPasswordReset as jest.Mock;
      mockRequest.mockResolvedValue({ data: { message: 'Email envoyé' }, error: null });

      const { result } = renderHook(() => usePasswordReset());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.requestPasswordReset('test@example.com');
      });

      expect(success).toBe(true);
      expect(result.current.requestState.isSuccess).toBe(true);
      expect(result.current.requestState.error).toBeNull();
      expect(mockRequest).toHaveBeenCalledWith('test@example.com');
    });

    it('sets error state on failed request', async () => {
      const mockRequest = authService.requestPasswordReset as jest.Mock;
      mockRequest.mockResolvedValue({
        data: null,
        error: { code: 'USER_NOT_FOUND', message: 'Aucun compte trouvé' },
      });

      const { result } = renderHook(() => usePasswordReset());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.requestPasswordReset('unknown@example.com');
      });

      expect(success).toBe(false);
      expect(result.current.requestState.isSuccess).toBe(false);
      expect(result.current.requestState.error).toEqual({
        code: 'USER_NOT_FOUND',
        message: 'Aucun compte trouvé',
      });
    });

    it('handles unexpected errors gracefully', async () => {
      const mockRequest = authService.requestPasswordReset as jest.Mock;
      mockRequest.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => usePasswordReset());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.requestPasswordReset('test@example.com');
      });

      expect(success).toBe(false);
      expect(result.current.requestState.error?.code).toBe('UNEXPECTED_ERROR');
    });
  });

  describe('confirmPasswordReset (AC#3, AC#4)', () => {
    it('validates password before sending request', async () => {
      const mockConfirm = authService.confirmPasswordReset as jest.Mock;

      const { result } = renderHook(() => usePasswordReset());

      let success: boolean = true;
      await act(async () => {
        // Password too short
        success = await result.current.confirmPasswordReset('short');
      });

      expect(success).toBe(false);
      expect(result.current.confirmState.error?.code).toBe('WEAK_PASSWORD');
      // Should not call service with invalid password
      expect(mockConfirm).not.toHaveBeenCalled();
    });

    it('sets success state on valid password reset', async () => {
      const mockConfirm = authService.confirmPasswordReset as jest.Mock;
      mockConfirm.mockResolvedValue({
        data: { message: 'Mot de passe réinitialisé avec succès' },
        error: null,
      });

      const { result } = renderHook(() => usePasswordReset());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.confirmPasswordReset('ValidPass123');
      });

      expect(success).toBe(true);
      expect(result.current.confirmState.isSuccess).toBe(true);
      expect(result.current.confirmState.error).toBeNull();
      expect(mockConfirm).toHaveBeenCalledWith('ValidPass123');
    });

    it('sets error state on service error', async () => {
      const mockConfirm = authService.confirmPasswordReset as jest.Mock;
      mockConfirm.mockResolvedValue({
        data: null,
        error: { code: 'SESSION_MISSING', message: 'Session expirée' },
      });

      const { result } = renderHook(() => usePasswordReset());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.confirmPasswordReset('ValidPass123');
      });

      expect(success).toBe(false);
      expect(result.current.confirmState.error).toEqual({
        code: 'SESSION_MISSING',
        message: 'Session expirée',
      });
    });
  });

  describe('resetRequestState', () => {
    it('resets request state to initial values', async () => {
      const mockRequest = authService.requestPasswordReset as jest.Mock;
      mockRequest.mockResolvedValue({ data: { message: 'Email envoyé' }, error: null });

      const { result } = renderHook(() => usePasswordReset());

      // First, create a successful state
      await act(async () => {
        await result.current.requestPasswordReset('test@example.com');
      });

      expect(result.current.requestState.isSuccess).toBe(true);

      // Reset
      act(() => {
        result.current.resetRequestState();
      });

      expect(result.current.requestState.isLoading).toBe(false);
      expect(result.current.requestState.isSuccess).toBe(false);
      expect(result.current.requestState.error).toBeNull();
    });
  });

  describe('resetConfirmState', () => {
    it('resets confirm state to initial values', async () => {
      const mockConfirm = authService.confirmPasswordReset as jest.Mock;
      mockConfirm.mockResolvedValue({ data: { message: 'Success' }, error: null });

      const { result } = renderHook(() => usePasswordReset());

      // First, create a successful state
      await act(async () => {
        await result.current.confirmPasswordReset('ValidPass123');
      });

      expect(result.current.confirmState.isSuccess).toBe(true);

      // Reset
      act(() => {
        result.current.resetConfirmState();
      });

      expect(result.current.confirmState.isLoading).toBe(false);
      expect(result.current.confirmState.isSuccess).toBe(false);
      expect(result.current.confirmState.error).toBeNull();
    });
  });

  describe('getPasswordCriteria (AC#10)', () => {
    it('returns correct criteria for empty password', () => {
      const { result } = renderHook(() => usePasswordReset());

      const criteria = result.current.getPasswordCriteria('');

      expect(criteria.minLength).toBe(false);
      expect(criteria.hasUppercase).toBe(false);
      expect(criteria.hasLowercase).toBe(false);
      expect(criteria.hasNumber).toBe(false);
    });

    it('returns correct criteria for partial password', () => {
      const { result } = renderHook(() => usePasswordReset());

      const criteria = result.current.getPasswordCriteria('Test');

      expect(criteria.minLength).toBe(false);
      expect(criteria.hasUppercase).toBe(true);
      expect(criteria.hasLowercase).toBe(true);
      expect(criteria.hasNumber).toBe(false);
    });

    it('returns all true for valid password', () => {
      const { result } = renderHook(() => usePasswordReset());

      const criteria = result.current.getPasswordCriteria('Test1234');

      expect(criteria.minLength).toBe(true);
      expect(criteria.hasUppercase).toBe(true);
      expect(criteria.hasLowercase).toBe(true);
      expect(criteria.hasNumber).toBe(true);
    });
  });

  describe('validateNewPassword', () => {
    it('returns valid for correct password', () => {
      const { result } = renderHook(() => usePasswordReset());

      const validation = result.current.validateNewPassword('ValidPass1');

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('returns invalid for weak password', () => {
      const { result } = renderHook(() => usePasswordReset());

      const validation = result.current.validateNewPassword('weak');

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validatePasswordMatch', () => {
    it('returns valid for matching passwords', () => {
      const { result } = renderHook(() => usePasswordReset());

      const validation = result.current.validatePasswordMatch('Test1234', 'Test1234');

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('returns invalid for non-matching passwords', () => {
      const { result } = renderHook(() => usePasswordReset());

      const validation = result.current.validatePasswordMatch('Test1234', 'Different1');

      expect(validation.isValid).toBe(false);
      expect(validation.errors[0]).toContain('correspondent');
    });
  });
});
