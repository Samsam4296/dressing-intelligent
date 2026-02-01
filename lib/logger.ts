/**
 * Logger - Centralized Logging with Sentry Integration
 *
 * Replaces console.log in production with Sentry-powered logging.
 * Provides structured logging with context tags for better debugging.
 *
 * @see Story 0-6-configuration-error-tracking (AC2, AC3)
 */

import * as Sentry from '@sentry/react-native';

/**
 * Context for structured logging
 */
export type LogContext = {
  /** Feature area (e.g., 'wardrobe', 'recommendations', 'auth') */
  feature?: string;
  /** Action being performed (e.g., 'addClothing', 'generateRecommendation') */
  action?: string;
  /** Current screen name */
  screen?: string;
  /** Additional contextual data */
  extra?: Record<string, unknown>;
};

/**
 * Severity levels for messages
 */
export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'fatal';

/**
 * Centralized logger that routes to Sentry in production
 * and console in development.
 *
 * @example
 * ```typescript
 * // Capture an error with context
 * logger.error(new Error('Failed to load'), {
 *   feature: 'wardrobe',
 *   action: 'loadClothing',
 *   extra: { clothingId: '123' }
 * });
 *
 * // Log informational message
 * logger.info('Profile switched successfully', {
 *   feature: 'profiles',
 *   action: 'switchProfile'
 * });
 *
 * // Set user context after authentication
 * logger.setUser('user-123', 'profile-456');
 *
 * // Clear user context on logout
 * logger.clearUser();
 * ```
 */
export const logger = {
  /**
   * Capture an exception with optional context.
   * Use for unexpected errors that should be tracked.
   */
  error(error: Error | unknown, context?: LogContext): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    if (__DEV__) {
      console.error('[Logger.error]', errorObj.message, context);
    }

    Sentry.captureException(errorObj, {
      tags: {
        feature: context?.feature,
        action: context?.action,
        screen: context?.screen,
      },
      extra: context?.extra,
    });
  },

  /**
   * Log a warning message.
   * Use for non-critical issues that should be monitored.
   */
  warn(message: string, context?: LogContext): void {
    if (__DEV__) {
      console.warn('[Logger.warn]', message, context);
    }

    Sentry.captureMessage(message, {
      level: 'warning',
      tags: {
        feature: context?.feature,
        action: context?.action,
        screen: context?.screen,
      },
      extra: context?.extra,
    });
  },

  /**
   * Log an informational message.
   * Use for significant events worth tracking.
   */
  info(message: string, context?: LogContext): void {
    if (__DEV__) {
      console.info('[Logger.info]', message, context);
    }

    Sentry.captureMessage(message, {
      level: 'info',
      tags: {
        feature: context?.feature,
        action: context?.action,
        screen: context?.screen,
      },
      extra: context?.extra,
    });
  },

  /**
   * Log a debug message (development only).
   * Does not send to Sentry in production.
   */
  debug(message: string, data?: unknown): void {
    if (__DEV__) {
      console.log('[Logger.debug]', message, data);
    }
    // Debug messages are not sent to Sentry
  },

  /**
   * Add a breadcrumb for debugging context.
   * Breadcrumbs appear in Sentry error reports.
   */
  breadcrumb(message: string, category: string, data?: Record<string, unknown>): void {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: 'info',
    });

    if (__DEV__) {
      console.log('[Breadcrumb]', category, message, data);
    }
  },

  /**
   * Set user context after authentication.
   * Only userId and profileId are sent (no PII per AC3).
   */
  setUser(userId: string, profileId?: string): void {
    // Only send userId (no email, name, or other PII)
    Sentry.setUser({
      id: userId,
    });

    if (profileId) {
      Sentry.setTag('profile_id', profileId);
    }

    if (__DEV__) {
      console.log('[Logger.setUser]', { userId, profileId });
    }
  },

  /**
   * Clear user context on logout.
   */
  clearUser(): void {
    Sentry.setUser(null);
    Sentry.setTag('profile_id', undefined);

    if (__DEV__) {
      console.log('[Logger.clearUser]');
    }
  },

  /**
   * Set additional context for all subsequent events.
   */
  setContext(name: string, data: Record<string, unknown>): void {
    Sentry.setContext(name, data);

    if (__DEV__) {
      console.log('[Logger.setContext]', name, data);
    }
  },

  /**
   * Set a tag for all subsequent events.
   */
  setTag(key: string, value: string | undefined): void {
    Sentry.setTag(key, value);

    if (__DEV__) {
      console.log('[Logger.setTag]', key, value);
    }
  },
};

/**
 * Convenience function to capture errors with feature context.
 * Matches the unified { data, error } pattern from project-context.md.
 *
 * @example
 * ```typescript
 * try {
 *   const result = await someOperation();
 *   return { data: result, error: null };
 * } catch (error) {
 *   captureError(error, 'wardrobe', 'addClothing');
 *   return { data: null, error: error as Error };
 * }
 * ```
 */
export function captureError(
  error: Error | unknown,
  feature: string,
  action: string,
  extra?: Record<string, unknown>
): void {
  logger.error(error, { feature, action, extra });
}

/**
 * Convenience function to capture messages with feature context.
 * Uses Sentry.captureMessage directly for proper severity handling.
 */
export function captureMessage(message: string, level: LogLevel, context?: LogContext): void {
  if (__DEV__) {
    const logFn = level === 'error' || level === 'fatal' ? console.error : console.log;
    logFn(`[Logger.${level}]`, message, context);
  }

  // Use Sentry.captureMessage directly to preserve proper message context
  // and severity level without wrapping in Error object
  Sentry.captureMessage(message, {
    level: level === 'fatal' ? 'fatal' : level,
    tags: {
      feature: context?.feature,
      action: context?.action,
      screen: context?.screen,
    },
    extra: context?.extra,
  });
}
