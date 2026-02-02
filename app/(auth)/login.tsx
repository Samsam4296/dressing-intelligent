/**
 * Login Screen Route
 * Story 1.3: Connexion Utilisateur
 *
 * Route wrapper for LoginScreen component.
 * Handles Expo Router integration for the login flow.
 *
 * AC#1: Authenticate with valid credentials → redirect to main screen
 * AC#8: "Forgot password?" link navigation
 * AC#9: "Create account" link navigation
 */

import { LoginScreen } from '@/features/auth';

export default function LoginPage() {
  return <LoginScreen />;
}
