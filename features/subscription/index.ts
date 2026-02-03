/**
 * Subscription Feature Barrel Exports
 * Story 1.11: Démarrage Essai Gratuit
 *
 * Centralized exports for the subscription feature.
 */

// Components
export { TrialScreen } from './components/TrialScreen';

// Hooks
export { useStartTrial } from './hooks/useStartTrial';

// Stores
export {
  useSubscriptionStore,
  selectSubscriptionStatus,
  selectIsSubscriptionActive,
  selectIsTrial,
  selectExpiresAt,
  selectTrialEndsAt,
} from './stores/subscriptionStore';

// Services
export { iapService, PRODUCT_ID } from './services/iapService';

// Types
export type {
  SubscriptionStatus,
  Platform,
  Subscription,
  IAPProduct,
  IAPError,
  ApiResponse,
} from './types/subscription';
