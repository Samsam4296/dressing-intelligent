/**
 * Performance Monitoring Tests
 *
 * Tests for the performance monitoring helpers with Sentry integration.
 * @see Story 0-6-configuration-error-tracking (AC5)
 */

import * as Sentry from '@sentry/react-native';
import {
  measureOperation,
  measureSync,
  withChildSpan,
  recordTiming,
  OPERATIONS,
} from '@/lib/performance';

// Mock Sentry is set up in jest.setup.js

// Mock performance.now for consistent timing
const mockPerformanceNow = jest.spyOn(performance, 'now');

describe('Performance Monitoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);
  });

  describe('OPERATIONS', () => {
    it('defines expected operation names', () => {
      expect(OPERATIONS.RECOMMENDATION_GENERATION).toBe('recommendation_generation');
      expect(OPERATIONS.PROFILE_SWITCH).toBe('profile_switch');
      expect(OPERATIONS.PHOTO_UPLOAD).toBe('photo_upload');
      expect(OPERATIONS.BACKGROUND_REMOVAL).toBe('background_removal');
      expect(OPERATIONS.CLOTHING_CATEGORIZATION).toBe('clothing_categorization');
      expect(OPERATIONS.WEATHER_FETCH).toBe('weather_fetch');
      expect(OPERATIONS.WARDROBE_SYNC).toBe('wardrobe_sync');
    });
  });

  describe('measureOperation', () => {
    it('measures async operation and returns result with duration', async () => {
      const mockResult = { data: 'test' };
      const operation = jest.fn().mockResolvedValue(mockResult);

      const { result, durationMs, success } = await measureOperation('test_operation', operation, {
        test_tag: 'value',
      });

      expect(result).toEqual(mockResult);
      expect(durationMs).toBe(100);
      expect(success).toBe(true);
      expect(operation).toHaveBeenCalled();
      expect(Sentry.startSpan).toHaveBeenCalledWith(
        {
          name: 'test_operation',
          op: 'task',
          attributes: { test_tag: 'value' },
        },
        expect.any(Function)
      );
      expect(Sentry.setMeasurement).toHaveBeenCalledWith('duration_ms', 100, 'millisecond');
    });

    it('captures exception on operation failure', async () => {
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(measureOperation('failing_op', operation)).rejects.toThrow('Operation failed');

      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        tags: {
          operation: 'failing_op',
        },
        extra: {
          duration_ms: expect.any(Number),
        },
      });
    });

    it('uses predefined OPERATIONS constants', async () => {
      const operation = jest.fn().mockResolvedValue({});

      await measureOperation(OPERATIONS.RECOMMENDATION_GENERATION, operation);

      expect(Sentry.startSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'recommendation_generation',
        }),
        expect.any(Function)
      );
    });
  });

  describe('measureSync', () => {
    it('measures synchronous operation', () => {
      const mockResult = { value: 42 };
      const operation = jest.fn().mockReturnValue(mockResult);

      const { result, durationMs, success } = measureSync('sync_op', operation);

      expect(result).toEqual(mockResult);
      expect(durationMs).toBe(100);
      expect(success).toBe(true);
      expect(Sentry.startInactiveSpan).toHaveBeenCalledWith({
        name: 'sync_op',
        op: 'function',
        attributes: undefined,
      });
    });

    it('captures exception on sync operation failure', () => {
      const error = new Error('Sync failed');
      const operation = jest.fn().mockImplementation(() => {
        throw error;
      });

      expect(() => measureSync('failing_sync', operation)).toThrow('Sync failed');

      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        tags: {
          operation: 'failing_sync',
        },
        extra: {
          duration_ms: expect.any(Number),
        },
      });
    });
  });

  describe('withChildSpan', () => {
    it('creates child span for sub-operation', async () => {
      const mockResult = 'child result';
      const operation = jest.fn().mockResolvedValue(mockResult);

      const result = await withChildSpan('child_op', operation, { step: '1' });

      expect(result).toBe(mockResult);
      expect(Sentry.startSpan).toHaveBeenCalledWith(
        {
          name: 'child_op',
          op: 'function',
          attributes: { step: '1' },
        },
        expect.any(Function)
      );
    });
  });

  describe('recordTiming', () => {
    it('records external timing measurement', () => {
      recordTiming('external_api', 250, { endpoint: '/users' });

      expect(Sentry.startInactiveSpan).toHaveBeenCalledWith({
        name: 'external_api',
        op: 'metric',
        attributes: {
          endpoint: '/users',
          recorded_timing: 'true',
        },
      });
      expect(Sentry.setMeasurement).toHaveBeenCalledWith('external_api', 250, 'millisecond');
    });
  });
});
