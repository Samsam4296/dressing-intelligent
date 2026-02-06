/**
 * Sentry Configuration and Initialization
 *
 * Provides error tracking, performance monitoring, and logging for production.
 * Must be initialized BEFORE any React rendering.
 *
 * @see Story 0-6-configuration-error-tracking
 */

import * as Sentry from '@sentry/react-native';

/**
 * Initialize Sentry SDK with production-ready configuration.
 *
 * Features:
 * - Error tracking with sensitive data filtering
 * - Performance monitoring (20% sample rate)
 * - Environment separation (dev/staging/prod)
 * - Release tracking tied to app version
 *
 * @example
 * ```typescript
 * // In app/_layout.tsx (BEFORE any rendering)
 * import { initSentry } from '@/lib/sentry'
 * initSentry()
 * ```
 */
export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  const environment: string = process.env.EXPO_PUBLIC_ENV || 'development';
  const isDevelopment = environment === 'development';

  // Skip initialization if no DSN or in development
  if (!dsn || isDevelopment) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[Sentry] Skipped initialization (development mode)');
    }
    return;
  }

  Sentry.init({
    dsn,

    // Environment (dev/staging/prod)
    environment,

    // Performance monitoring (20% sample rate per AC5)
    tracesSampleRate: 0.2,

    // Release tracking tied to app version
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    release: `dressing-intelligent@${require('../app.json').expo.version}`,

    // Disabled in development
    enabled: !isDevelopment,

    // Debug mode only in development
    debug: __DEV__,

    // Filter sensitive data BEFORE sending to Sentry (AC3)
    beforeSend(event) {
      // Remove personal data from user context
      if (event.user) {
        delete event.user.email;
        delete event.user.username;
        delete event.user.name;
        delete event.user.ip_address;
      }

      // Filter breadcrumbs with sensitive data
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.filter((crumb) => {
          // Filter out breadcrumbs with passwords, tokens, or keys
          if (crumb.data) {
            const dataStr = JSON.stringify(crumb.data).toLowerCase();
            if (
              dataStr.includes('password') ||
              dataStr.includes('token') ||
              dataStr.includes('secret') ||
              dataStr.includes('api_key') ||
              dataStr.includes('apikey')
            ) {
              return false;
            }
          }
          return true;
        });
      }

      // Filter request headers that might contain auth tokens
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['authorization'];
        delete event.request.headers['Cookie'];
        delete event.request.headers['cookie'];
      }

      return event;
    },

    // Ignore certain errors that are expected or handled elsewhere
    ignoreErrors: [
      'Network request failed', // Retry handling exists
      'AbortError', // User cancelled
      'Failed to fetch', // Network issues handled by retry logic
      'Load failed', // Asset loading issues
    ],

    // Attach stack traces to all messages
    attachStacktrace: true,

    // Auto-instrument navigation (Expo Router compatible)
    enableAutoPerformanceTracing: true,
  });
}

/**
 * Check if Sentry is initialized and ready
 */
export function isSentryEnabled(): boolean {
  const env: string = process.env.EXPO_PUBLIC_ENV || 'development';
  return env !== 'development' && !!process.env.EXPO_PUBLIC_SENTRY_DSN;
}

// Re-export Sentry for direct access when needed
export { Sentry };
