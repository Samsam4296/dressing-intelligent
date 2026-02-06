/**
 * Error Boundary Component
 * Catches unhandled JavaScript errors in the component tree.
 *
 * Must be a class component (React limitation for error boundaries).
 * Reports errors to Sentry and shows a fallback UI.
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import * as Sentry from '@sentry/react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      tags: { feature: 'error-boundary' },
      extra: { componentStack: errorInfo.componentStack },
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-gray-900">
          <Text className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
            Une erreur est survenue
          </Text>
          <Text className="mb-6 text-center text-base text-gray-600 dark:text-gray-400">
            L'application a rencontré un problème inattendu.
          </Text>
          <Pressable
            className="min-h-[44px] min-w-[44px] rounded-xl bg-blue-600 px-6 py-3"
            onPress={this.handleReset}
            accessibilityRole="button"
            accessibilityLabel="Réessayer">
            <Text className="text-base font-semibold text-white">Réessayer</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
