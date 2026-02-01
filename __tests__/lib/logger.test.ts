/**
 * Logger Tests
 *
 * Tests for the centralized logging system with Sentry integration.
 * @see Story 0-6-configuration-error-tracking
 */

import * as Sentry from '@sentry/react-native';
import { logger, captureError, captureMessage } from '@/lib/logger';

// Mock Sentry is set up in jest.setup.js

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logger.error', () => {
    it('captures an Error object with context', () => {
      const error = new Error('Test error');
      const context = { feature: 'test', action: 'testAction' };

      logger.error(error, context);

      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        tags: {
          feature: 'test',
          action: 'testAction',
          screen: undefined,
        },
        extra: undefined,
      });
    });

    it('converts non-Error to Error object', () => {
      logger.error('string error', { feature: 'test' });

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'string error',
        }),
        expect.any(Object)
      );
    });

    it('handles undefined context', () => {
      const error = new Error('Test error');

      logger.error(error);

      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        tags: {
          feature: undefined,
          action: undefined,
          screen: undefined,
        },
        extra: undefined,
      });
    });
  });

  describe('logger.warn', () => {
    it('captures warning message with context', () => {
      logger.warn('Warning message', { feature: 'auth', action: 'login' });

      expect(Sentry.captureMessage).toHaveBeenCalledWith('Warning message', {
        level: 'warning',
        tags: {
          feature: 'auth',
          action: 'login',
          screen: undefined,
        },
        extra: undefined,
      });
    });
  });

  describe('logger.info', () => {
    it('captures info message with context', () => {
      logger.info('Info message', { feature: 'profile', screen: 'home' });

      expect(Sentry.captureMessage).toHaveBeenCalledWith('Info message', {
        level: 'info',
        tags: {
          feature: 'profile',
          action: undefined,
          screen: 'home',
        },
        extra: undefined,
      });
    });
  });

  describe('logger.debug', () => {
    it('does not send to Sentry', () => {
      logger.debug('Debug message', { some: 'data' });

      expect(Sentry.captureMessage).not.toHaveBeenCalled();
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });
  });

  describe('logger.breadcrumb', () => {
    it('adds breadcrumb to Sentry', () => {
      logger.breadcrumb('User clicked button', 'ui', { buttonId: 'submit' });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'User clicked button',
        category: 'ui',
        data: { buttonId: 'submit' },
        level: 'info',
      });
    });
  });

  describe('logger.setUser', () => {
    it('sets user with only userId', () => {
      logger.setUser('user-123');

      expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'user-123' });
      expect(Sentry.setTag).not.toHaveBeenCalled();
    });

    it('sets user and profile tag when profileId provided', () => {
      logger.setUser('user-123', 'profile-456');

      expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'user-123' });
      expect(Sentry.setTag).toHaveBeenCalledWith('profile_id', 'profile-456');
    });
  });

  describe('logger.clearUser', () => {
    it('clears user and profile tag', () => {
      logger.clearUser();

      expect(Sentry.setUser).toHaveBeenCalledWith(null);
      expect(Sentry.setTag).toHaveBeenCalledWith('profile_id', undefined);
    });
  });

  describe('logger.setContext', () => {
    it('sets context on Sentry', () => {
      logger.setContext('session', { startTime: 123456 });

      expect(Sentry.setContext).toHaveBeenCalledWith('session', { startTime: 123456 });
    });
  });

  describe('logger.setTag', () => {
    it('sets tag on Sentry', () => {
      logger.setTag('version', '1.0.0');

      expect(Sentry.setTag).toHaveBeenCalledWith('version', '1.0.0');
    });
  });
});

describe('captureError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('captures error with feature and action context', () => {
    const error = new Error('API failed');

    captureError(error, 'wardrobe', 'addClothing', { clothingId: '123' });

    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      tags: {
        feature: 'wardrobe',
        action: 'addClothing',
        screen: undefined,
      },
      extra: { clothingId: '123' },
    });
  });
});

describe('captureMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('captures error level message', () => {
    captureMessage('Critical failure', 'error', { feature: 'test' });

    expect(Sentry.captureMessage).toHaveBeenCalledWith('Critical failure', {
      level: 'error',
      tags: {
        feature: 'test',
        action: undefined,
        screen: undefined,
      },
      extra: undefined,
    });
  });

  it('captures fatal level message', () => {
    captureMessage('Fatal error', 'fatal', { feature: 'test' });

    expect(Sentry.captureMessage).toHaveBeenCalledWith('Fatal error', {
      level: 'fatal',
      tags: {
        feature: 'test',
        action: undefined,
        screen: undefined,
      },
      extra: undefined,
    });
  });

  it('captures warning level message', () => {
    captureMessage('Warning', 'warning', { feature: 'test' });

    expect(Sentry.captureMessage).toHaveBeenCalledWith('Warning', {
      level: 'warning',
      tags: expect.any(Object),
      extra: undefined,
    });
  });

  it('captures info level message', () => {
    captureMessage('Info', 'info', { feature: 'test' });

    expect(Sentry.captureMessage).toHaveBeenCalledWith('Info', {
      level: 'info',
      tags: expect.any(Object),
      extra: undefined,
    });
  });
});
