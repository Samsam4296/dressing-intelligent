// Barrel exports for auth feature

// Types
export * from './types/auth.types';

// Hooks
export { useAuth } from './hooks/useAuth';
export {
  useFormValidation,
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  getPasswordStrength,
  PASSWORD_RULES,
} from './hooks/useFormValidation';
export { usePasswordReset } from './hooks/usePasswordReset';
export type { PasswordCriteria } from './hooks/usePasswordReset';
export { useShakeAnimation } from './hooks/useShakeAnimation';

// Services
export { authService } from './services/authService';

// Components
export { WelcomeScreen } from './components/WelcomeScreen';
export { SignupScreen } from './components/SignupScreen';
export { VerifyEmailScreen } from './components/VerifyEmailScreen';
export { LoginScreen } from './components/LoginScreen';
export { ForgotPasswordScreen } from './components/ForgotPasswordScreen';
export { ResetPasswordScreen } from './components/ResetPasswordScreen';
