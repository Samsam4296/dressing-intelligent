/**
 * Root Index - Entry Point
 *
 * This screen is never shown - _layout.tsx handles all redirects
 * based on authentication state.
 */

import { View } from 'react-native';

export default function Index() {
  // _layout.tsx handles redirection based on auth state
  // This component renders nothing while redirect happens
  return <View />;
}
