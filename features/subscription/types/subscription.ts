/**
 * Subscription Types
 * Story 1.11: Démarrage Essai Gratuit
 *
 * Type definitions for subscription-related operations.
 */

/**
 * Subscription status enum
 */
export type SubscriptionStatus = 'none' | 'trial' | 'active' | 'expired' | 'cancelled';

/**
 * Platform for IAP
 */
export type Platform = 'ios' | 'android';

/**
 * Subscription data stored locally and in database
 */
export interface Subscription {
  id?: string;
  user_id?: string;
  status: SubscriptionStatus;
  product_id: string | null;
  platform?: Platform;
  original_transaction_id?: string;
  trial_ends_at: string | null;
  expires_at: string | null;
  auto_renewing?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * IAP Product information
 */
export interface IAPProduct {
  productId: string;
  localizedPrice: string;
  price: string;
  currency: string;
  title: string;
  description: string;
  introductoryPrice?: string;
  subscriptionPeriod?: string;
  freeTrialPeriod?: string;
}

/**
 * Receipt validation request
 */
export interface ValidateReceiptRequest {
  receipt: string;
  platform: Platform;
  productId: string;
}

/**
 * Receipt validation response
 */
export interface ValidateReceiptResponse {
  success: boolean;
  subscription?: Subscription;
  error?: string;
}

/**
 * IAP Error with code and message
 */
export interface IAPError {
  code: string;
  message: string;
}

/**
 * Generic API response type (following project pattern)
 */
export interface ApiResponse<T> {
  data: T | null;
  error: IAPError | null;
}
