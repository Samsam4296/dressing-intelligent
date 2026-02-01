/**
 * Performance Monitoring - Custom Spans and Measurements
 *
 * Provides helpers for measuring operation performance with Sentry.
 * Uses Sentry 6.x API with startSpan and setMeasurement.
 *
 * @see Story 0-6-configuration-error-tracking (AC5)
 *
 * NFR Thresholds:
 * - NFR-P1: Recommendation generation < 2s
 * - NFR-P4: Profile switch < 0.5s
 */

import * as Sentry from '@sentry/react-native';

/**
 * Tags for performance spans
 */
export type PerformanceTags = Record<string, string>;

/**
 * Result from a performance measurement
 */
export type MeasurementResult<T> = {
  result: T;
  durationMs: number;
  success: boolean;
};

/**
 * Predefined operation names for consistency
 */
export const OPERATIONS = {
  /** Recommendation generation (NFR-P1: < 2000ms) */
  RECOMMENDATION_GENERATION: 'recommendation_generation',
  /** Profile switching (NFR-P4: < 500ms) */
  PROFILE_SWITCH: 'profile_switch',
  /** Photo upload and processing */
  PHOTO_UPLOAD: 'photo_upload',
  /** Background removal processing */
  BACKGROUND_REMOVAL: 'background_removal',
  /** Clothing categorization */
  CLOTHING_CATEGORIZATION: 'clothing_categorization',
  /** Weather data fetch */
  WEATHER_FETCH: 'weather_fetch',
  /** Wardrobe sync */
  WARDROBE_SYNC: 'wardrobe_sync',
} as const;

export type OperationName = (typeof OPERATIONS)[keyof typeof OPERATIONS];

/**
 * NFR thresholds in milliseconds
 */
const NFR_THRESHOLDS: Partial<Record<OperationName, number>> = {
  [OPERATIONS.RECOMMENDATION_GENERATION]: 2000, // NFR-P1
  [OPERATIONS.PROFILE_SWITCH]: 500, // NFR-P4
};

/**
 * Measure an async operation's performance and report to Sentry.
 *
 * Creates a Sentry span, executes the operation, and records:
 * - Duration in milliseconds
 * - Success/failure status
 * - Custom attributes for filtering
 *
 * @example
 * ```typescript
 * // Measure recommendation generation
 * const { result, durationMs } = await measureOperation(
 *   OPERATIONS.RECOMMENDATION_GENERATION,
 *   async () => generateRecommendations(profileId, weatherData),
 *   { profile_id: profileId }
 * );
 *
 * // Measure profile switch
 * const { result } = await measureOperation(
 *   OPERATIONS.PROFILE_SWITCH,
 *   async () => switchToProfile(newProfileId)
 * );
 * ```
 */
export async function measureOperation<T>(
  operationName: OperationName | string,
  operation: () => Promise<T>,
  attributes?: PerformanceTags
): Promise<MeasurementResult<T>> {
  const startTime = performance.now();

  return Sentry.startSpan(
    {
      name: operationName,
      op: 'task',
      attributes,
    },
    async (span) => {
      try {
        const result = await operation();
        const durationMs = performance.now() - startTime;

        // Record duration as measurement
        Sentry.setMeasurement('duration_ms', durationMs, 'millisecond');

        // Check against NFR threshold if defined
        const threshold = NFR_THRESHOLDS[operationName as OperationName];
        if (threshold && durationMs > threshold) {
          span?.setAttribute('exceeded_threshold', true);
          span?.setAttribute('threshold_ms', threshold);

          if (__DEV__) {
            console.warn(
              `[Performance] ${operationName} exceeded threshold: ${durationMs.toFixed(0)}ms > ${threshold}ms`
            );
          }
        }

        return { result, durationMs, success: true };
      } catch (error) {
        const durationMs = performance.now() - startTime;

        Sentry.captureException(error, {
          tags: {
            operation: operationName,
            ...attributes,
          },
          extra: {
            duration_ms: durationMs,
          },
        });

        throw error;
      }
    }
  );
}

/**
 * Create a child span for sub-operations.
 *
 * @example
 * ```typescript
 * await Sentry.startSpan({ name: 'upload_clothing' }, async () => {
 *   await withChildSpan('capture_photo', async () => {
 *     await capturePhoto();
 *   });
 *
 *   await withChildSpan('remove_background', async () => {
 *     await removeBackground();
 *   });
 * });
 * ```
 */
export async function withChildSpan<T>(
  spanName: string,
  operation: () => Promise<T>,
  attributes?: PerformanceTags
): Promise<T> {
  return Sentry.startSpan(
    {
      name: spanName,
      op: 'function',
      attributes,
    },
    async () => {
      return operation();
    }
  );
}

/**
 * Measure a synchronous operation's performance.
 * For async operations, use measureOperation instead.
 *
 * @example
 * ```typescript
 * const { result, durationMs } = measureSync(
 *   'parse_clothing_data',
 *   () => parseClothingData(rawData)
 * );
 * ```
 */
export function measureSync<T>(
  operationName: string,
  operation: () => T,
  attributes?: PerformanceTags
): MeasurementResult<T> {
  const startTime = performance.now();

  try {
    // Use startInactiveSpan for synchronous operations
    const span = Sentry.startInactiveSpan({
      name: operationName,
      op: 'function',
      attributes,
    });

    const result = operation();
    const durationMs = performance.now() - startTime;

    Sentry.setMeasurement('duration_ms', durationMs, 'millisecond');
    span?.end();

    return { result, durationMs, success: true };
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        operation: operationName,
        ...attributes,
      },
      extra: {
        duration_ms: performance.now() - startTime,
      },
    });

    throw error;
  }
}

/**
 * Record a custom timing metric.
 * Useful when you've already measured timing externally.
 *
 * @example
 * ```typescript
 * const start = Date.now();
 * await externalOperation();
 * recordTiming('external_api_call', Date.now() - start);
 * ```
 */
export function recordTiming(
  metricName: string,
  durationMs: number,
  attributes?: PerformanceTags
): void {
  const span = Sentry.startInactiveSpan({
    name: metricName,
    op: 'metric',
    attributes: {
      ...attributes,
      recorded_timing: 'true',
    },
  });

  Sentry.setMeasurement(metricName, durationMs, 'millisecond');
  span?.end();

  if (__DEV__) {
    console.log(`[Performance] ${metricName}: ${durationMs.toFixed(0)}ms`);
  }
}

/**
 * Start a manual span for complex multi-step operations.
 * Uses Sentry.startSpan which automatically handles finishing.
 *
 * @example
 * ```typescript
 * await startManualSpan('onboarding_flow', async () => {
 *   await step1();
 *   await step2();
 *   await step3();
 * }, { step_count: '3' });
 * ```
 */
export async function startManualSpan<T>(
  name: string,
  operation: () => Promise<T>,
  attributes?: PerformanceTags
): Promise<T> {
  return Sentry.startSpan(
    {
      name,
      op: 'task',
      attributes,
    },
    async () => {
      return operation();
    }
  );
}
