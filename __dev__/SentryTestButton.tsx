/**
 * SentryTestButton - Development-Only Error Testing Component
 *
 * Provides buttons to test Sentry error capture functionality.
 * Only renders in development mode (__DEV__).
 *
 * @see Story 0-6-configuration-error-tracking (AC2)
 */

import React from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { logger } from '@/lib/logger';
import { measureOperation, OPERATIONS } from '@/lib/performance';

/**
 * Test button component for Sentry functionality.
 *
 * Usage: Add to any screen during development to test error capture.
 *
 * @example
 * ```tsx
 * import { SentryTestButton } from '@/__dev__/SentryTestButton';
 *
 * // In your component
 * <SentryTestButton />
 * ```
 */
export function SentryTestButton(): React.ReactElement | null {
  // Only render in development
  if (!__DEV__) {
    return null;
  }

  const handleTestError = () => {
    try {
      throw new Error('Test Error from SentryTestButton');
    } catch (error) {
      logger.error(error, {
        feature: 'dev-tools',
        action: 'test-error',
        screen: 'SentryTestButton',
      });
      Alert.alert(
        'Error Captured',
        'A test error has been sent to Sentry (if enabled).\n\nCheck your Sentry dashboard.'
      );
    }
  };

  const handleTestMessage = () => {
    logger.info('Test message from SentryTestButton', {
      feature: 'dev-tools',
      action: 'test-message',
      screen: 'SentryTestButton',
    });
    Alert.alert('Message Sent', 'A test message has been sent to Sentry (if enabled).');
  };

  const handleTestCrash = () => {
    Alert.alert(
      'Trigger Native Crash?',
      'This will cause an unhandled exception. The app may crash.\n\nContinue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Crash',
          style: 'destructive',
          onPress: () => {
            // Throw unhandled error to test native crash capture
            Sentry.nativeCrash();
          },
        },
      ]
    );
  };

  const handleTestPerformance = async () => {
    try {
      const { durationMs } = await measureOperation(
        OPERATIONS.RECOMMENDATION_GENERATION,
        async () => {
          // Simulate a 1.5s operation (under 2s threshold)
          await new Promise((resolve) => setTimeout(resolve, 1500));
          return { recommendations: [] };
        },
        { test: 'true' }
      );

      Alert.alert(
        'Performance Test Complete',
        `Operation took ${durationMs.toFixed(0)}ms\n\nThreshold: 2000ms\nStatus: ${durationMs < 2000 ? 'PASS' : 'FAIL (exceeded threshold)'}`
      );
    } catch (error) {
      Alert.alert('Performance Test Failed', String(error));
    }
  };

  const handleTestUserContext = () => {
    // Set test user context
    logger.setUser('test-user-123', 'test-profile-456');

    // Send a test message with user context
    logger.info('Test message with user context', {
      feature: 'dev-tools',
      action: 'test-user-context',
    });

    Alert.alert(
      'User Context Set',
      'User context has been set:\n\n- userId: test-user-123\n- profileId: test-profile-456\n\nA test message was sent with this context.'
    );
  };

  const handleClearUserContext = () => {
    logger.clearUser();
    Alert.alert('User Context Cleared', 'User context has been cleared.');
  };

  return (
    <View className="m-4 rounded-lg border border-yellow-400 bg-yellow-50 p-4">
      <Text className="mb-4 text-center text-lg font-bold text-yellow-800">Sentry Dev Tools</Text>

      <View className="gap-2">
        <TestButton label="Test Error Capture" onPress={handleTestError} color="red" />

        <TestButton label="Test Message" onPress={handleTestMessage} color="blue" />

        <TestButton label="Test Performance" onPress={handleTestPerformance} color="green" />

        <TestButton label="Set User Context" onPress={handleTestUserContext} color="purple" />

        <TestButton label="Clear User Context" onPress={handleClearUserContext} color="gray" />

        <TestButton label="Native Crash (Dangerous!)" onPress={handleTestCrash} color="orange" />
      </View>

      <Text className="mt-4 text-center text-xs text-yellow-600">
        Dev only - This component is hidden in production
      </Text>
    </View>
  );
}

type TestButtonProps = {
  label: string;
  onPress: () => void;
  color: 'red' | 'blue' | 'green' | 'purple' | 'gray' | 'orange';
};

function TestButton({ label, onPress, color }: TestButtonProps): React.ReactElement {
  const colorClasses = {
    red: 'bg-red-500 active:bg-red-600',
    blue: 'bg-blue-500 active:bg-blue-600',
    green: 'bg-green-500 active:bg-green-600',
    purple: 'bg-purple-500 active:bg-purple-600',
    gray: 'bg-gray-500 active:bg-gray-600',
    orange: 'bg-orange-500 active:bg-orange-600',
  };

  return (
    <Pressable onPress={onPress} className={`rounded-md px-4 py-2 ${colorClasses[color]}`}>
      <Text className="text-center font-medium text-white">{label}</Text>
    </Pressable>
  );
}

export default SentryTestButton;
