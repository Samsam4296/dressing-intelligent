/**
 * Lib - Shared Utilities and Configuration
 */

// Supabase client
export { supabase } from './supabase';

// Storage (MMKV)
export { storage, zustandStorage, storageHelpers, STORAGE_KEYS } from './storage';

// TanStack Query
export { queryClient, queryKeys, invalidateQueries } from './query-client';

// Constants
export * from './constants';

// Utilities
export { cn, formatDate, formatTime, capitalize, truncate, sleep, randomId } from './utils';

// Theme
export { useTheme, type ThemeMode, type UseThemeReturn } from './useTheme';

// Sentry (Error Tracking & Performance)
export { initSentry, isSentryEnabled, Sentry } from './sentry';

// Logger (Replaces console.log in production)
export { logger, captureError, captureMessage, type LogContext, type LogLevel } from './logger';

// Performance Monitoring
export {
  measureOperation,
  measureSync,
  withChildSpan,
  startManualSpan,
  recordTiming,
  OPERATIONS,
  type OperationName,
  type PerformanceTags,
  type MeasurementResult,
} from './performance';
