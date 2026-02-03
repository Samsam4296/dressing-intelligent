/**
 * Subscription Store
 * Story 1.11: Démarrage Essai Gratuit
 *
 * Zustand store for subscription state with persistence.
 * Follows the useProfileStore pattern.
 *
 * AC#3: Persiste status dans storage
 * AC#5: subscription_status = 'none' for skip
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage';
import type { SubscriptionStatus } from '../types/subscription';

// ============================================
// Types
// ============================================

interface SubscriptionState {
  /** Current subscription status */
  status: SubscriptionStatus;
  /** Product ID of the active subscription */
  productId: string | null;
  /** When the trial period ends (ISO string) */
  trialEndsAt: string | null;
  /** When the subscription expires (ISO string) */
  expiresAt: string | null;
  /** Whether auto-renewal is enabled */
  autoRenewing: boolean;
}

interface SubscriptionActions {
  /** Update subscription state */
  setSubscription: (sub: Partial<SubscriptionState>) => void;
  /** Clear subscription (logout) */
  clearSubscription: () => void;
  /** Check if subscription is active (trial or paid) */
  isActive: () => boolean;
  /** Check if user is in trial period */
  isTrial: () => boolean;
  /** Check if trial/subscription is expired */
  isExpired: () => boolean;
}

type SubscriptionStore = SubscriptionState & SubscriptionActions;

// ============================================
// Initial State
// ============================================

const initialState: SubscriptionState = {
  status: 'none',
  productId: null,
  trialEndsAt: null,
  expiresAt: null,
  autoRenewing: false,
};

// ============================================
// Store
// ============================================

/**
 * Subscription store with persistence
 *
 * @example
 * ```tsx
 * const status = useSubscriptionStore(s => s.status);
 * const setSubscription = useSubscriptionStore(s => s.setSubscription);
 *
 * // Update after successful purchase
 * setSubscription({
 *   status: 'trial',
 *   productId: 'dressing_monthly_trial',
 *   trialEndsAt: '2026-02-10T00:00:00Z',
 *   expiresAt: '2026-02-10T00:00:00Z',
 * });
 *
 * // Check subscription status
 * const isActive = useSubscriptionStore(s => s.isActive());
 * ```
 */
export const useSubscriptionStore = create<SubscriptionStore>()(
  persist(
    (set, get) => ({
      // State
      ...initialState,

      // Actions
      setSubscription: (sub) =>
        set((state) => ({
          ...state,
          ...sub,
        })),

      clearSubscription: () => set(initialState),

      isActive: () => {
        const { status, expiresAt } = get();

        // Not active if no subscription
        if (status === 'none' || status === 'cancelled' || status === 'expired') {
          return false;
        }

        // Check expiration
        if (expiresAt) {
          const expires = new Date(expiresAt);
          if (expires < new Date()) {
            return false;
          }
        }

        return status === 'trial' || status === 'active';
      },

      isTrial: () => {
        const { status, trialEndsAt } = get();

        if (status !== 'trial') {
          return false;
        }

        // Check if trial is still valid
        if (trialEndsAt) {
          const trialEnd = new Date(trialEndsAt);
          return trialEnd > new Date();
        }

        return false;
      },

      isExpired: () => {
        const { status, expiresAt } = get();

        // Explicitly expired
        if (status === 'expired') {
          return true;
        }

        // Check expiration date
        if (expiresAt) {
          const expires = new Date(expiresAt);
          return expires < new Date();
        }

        return false;
      },
    }),
    {
      name: 'subscription-storage',
      storage: createJSONStorage(() => zustandStorage),
      // Only persist these fields
      partialize: (state) => ({
        status: state.status,
        productId: state.productId,
        trialEndsAt: state.trialEndsAt,
        expiresAt: state.expiresAt,
        autoRenewing: state.autoRenewing,
      }),
    }
  )
);

// ============================================
// Selectors (for optimized re-renders)
// ============================================

/**
 * Select subscription status (primitive value - safe for memoization)
 */
export const selectSubscriptionStatus = (state: SubscriptionStore) => state.status;

/**
 * Select if subscription is active
 * Computed directly to avoid function call re-render issues
 */
export const selectIsSubscriptionActive = (state: SubscriptionStore): boolean => {
  const { status, expiresAt } = state;

  // Not active if no subscription
  if (status === 'none' || status === 'cancelled' || status === 'expired') {
    return false;
  }

  // Check expiration
  if (expiresAt) {
    const expires = new Date(expiresAt);
    if (expires < new Date()) {
      return false;
    }
  }

  return status === 'trial' || status === 'active';
};

/**
 * Select if user is in trial period
 * Computed directly to avoid function call re-render issues
 */
export const selectIsTrial = (state: SubscriptionStore): boolean => {
  const { status, trialEndsAt } = state;

  if (status !== 'trial') {
    return false;
  }

  // Check if trial is still valid
  if (trialEndsAt) {
    const trialEnd = new Date(trialEndsAt);
    return trialEnd > new Date();
  }

  return false;
};

/**
 * Select expiration date
 */
export const selectExpiresAt = (state: SubscriptionStore) => state.expiresAt;

/**
 * Select trial end date
 */
export const selectTrialEndsAt = (state: SubscriptionStore) => state.trialEndsAt;
