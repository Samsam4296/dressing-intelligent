/**
 * useStartTrial Hook
 * Story 1.11: Démarrage Essai Gratuit
 *
 * Custom hook that manages all state and logic for TrialScreen.
 * Handles IAP initialization, purchase flow, and validation.
 *
 * AC#1: Display trial CTA + localized price + skip link
 * AC#2: Open native store sheet
 * AC#3: Validate receipt server-side
 * AC#4: Success → Haptics + toast + redirect Home
 * AC#5: Skip → Haptics.light + status 'none' + redirect Home
 * AC#6: Cancel/error → Haptics.error + toast + stay on screen
 *
 * Follows the useDeleteAccount.ts pattern.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Sentry from '@sentry/react-native';
import { useRouter } from 'expo-router';
import type { SubscriptionPurchase, PurchaseError } from 'react-native-iap';
import { showToast } from '@/shared/components/Toast';
import { iapService, PRODUCT_ID } from '../services/iapService';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import type { IAPProduct } from '../types/subscription';

// ============================================
// Types
// ============================================

interface UseStartTrialReturn {
  // State
  isPending: boolean;
  isInitializing: boolean;
  error: string | null;
  product: IAPProduct | null;
  /** True if initialization failed and can be retried */
  canRetry: boolean;

  // Actions
  handleStartTrial: () => Promise<void>;
  handleSkip: () => void;
  /** Retry IAP initialization after failure */
  handleRetry: () => Promise<void>;
}

// ============================================
// Hook
// ============================================

/**
 * Hook for managing TrialScreen state and logic
 *
 * @example
 * ```tsx
 * const {
 *   isPending,
 *   isInitializing,
 *   error,
 *   product,
 *   handleStartTrial,
 *   handleSkip,
 * } = useStartTrial();
 * ```
 */
export const useStartTrial = (): UseStartTrialReturn => {
  // State
  const [isPending, setIsPending] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<IAPProduct | null>(null);
  const [canRetry, setCanRetry] = useState(false);

  // Refs
  const purchaseListenerCleanup = useRef<(() => void) | null>(null);
  const isMounted = useRef(true);
  // Track processed transactions to prevent race condition (listener + direct return)
  const processedTransactions = useRef<Set<string>>(new Set());

  // Hooks
  const router = useRouter();
  const setSubscription = useSubscriptionStore((s) => s.setSubscription);

  /**
   * Process successful purchase
   * Uses transaction ID tracking to prevent duplicate processing (race condition fix)
   */
  const processPurchase = useCallback(
    async (purchase: SubscriptionPurchase) => {
      if (!isMounted.current) return;

      // Get transaction ID for deduplication
      const transactionId = purchase.transactionId || purchase.purchaseToken || '';

      // Check if already processed (race condition: listener + direct return)
      if (processedTransactions.current.has(transactionId)) {
        console.log('Transaction already processed, skipping:', transactionId);
        return;
      }

      // Mark as being processed
      processedTransactions.current.add(transactionId);

      setIsPending(true);
      setError(null);

      try {
        // Get receipt from purchase
        const receipt =
          Platform.OS === 'ios'
            ? purchase.transactionReceipt || ''
            : JSON.stringify({
                purchaseToken: purchase.purchaseToken,
                orderId: purchase.transactionId,
                packageName: purchase.packageNameAndroid,
                productId: purchase.productId,
                purchaseTime: purchase.transactionDate,
                // Android specific fields
                autoRenewing: true,
                isFreeTrial: true,
              });

        if (!receipt) {
          throw new Error('No receipt found');
        }

        // Validate receipt server-side (AC#3)
        const { data: subscription, error: validationError } = await iapService.validateReceipt(
          receipt,
          purchase.productId
        );

        if (validationError || !subscription) {
          throw new Error(validationError?.message || 'Validation failed');
        }

        // Finish transaction only AFTER successful validation
        const { error: finishError } = await iapService.finishTransaction(purchase);

        if (finishError) {
          // Log but don't fail - validation was successful
          Sentry.captureException(new Error(finishError.message), {
            tags: { feature: 'subscription', action: 'finishTransaction' },
          });
        }

        // Update local store (AC#3 - persist status)
        setSubscription({
          status: subscription.status,
          productId: subscription.product_id,
          trialEndsAt: subscription.trial_ends_at,
          expiresAt: subscription.expires_at,
          autoRenewing: subscription.auto_renewing ?? true,
        });

        // Success feedback (AC#4)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast({
          type: 'success',
          message: 'Bienvenue ! Essai gratuit activé',
        });

        Sentry.addBreadcrumb({
          category: 'subscription',
          message: 'Trial started successfully',
          level: 'info',
          data: { productId: purchase.productId, status: subscription.status },
        });

        // Redirect to Home (AC#4)
        router.replace('/(tabs)');
      } catch (err) {
        if (!isMounted.current) return;

        // Error feedback (AC#6)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la validation';
        setError(errorMessage);

        showToast({
          type: 'error',
          message: errorMessage,
        });

        Sentry.captureException(err, {
          tags: { feature: 'subscription', action: 'processPurchase' },
        });
      } finally {
        if (isMounted.current) {
          setIsPending(false);
        }
      }
    },
    [router, setSubscription]
  );

  /**
   * Handle purchase error from listener
   */
  const handlePurchaseError = useCallback((purchaseError: PurchaseError) => {
    if (!isMounted.current) return;

    // User cancelled - not an error, just ignore
    if (purchaseError.code === 'E_USER_CANCELLED' || purchaseError.message?.includes('cancel')) {
      setIsPending(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // Actual error (AC#6)
    setIsPending(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    const errorMessage = purchaseError.message || "Erreur lors de l'achat";
    setError(errorMessage);

    showToast({
      type: 'error',
      message: errorMessage,
    });
  }, []);

  /**
   * Initialize IAP connection and fetch product
   * Extracted as callback for retry functionality
   */
  const initializeIAP = useCallback(async () => {
    if (!isMounted.current) return;

    setIsInitializing(true);
    setError(null);
    setCanRetry(false);

    try {
      // Initialize IAP connection
      const { error: initError } = await iapService.initConnection();

      if (initError) {
        if (isMounted.current) {
          setError(initError.message);
          setCanRetry(true); // Allow retry on init failure
          setIsInitializing(false);
        }
        return;
      }

      // Fetch product info (AC#1 - localized price)
      const { data: products, error: productError } = await iapService.getProducts();

      if (productError || !products || products.length === 0) {
        if (isMounted.current) {
          // Don't show error, just use fallback price
          Sentry.captureMessage('Failed to fetch product info', {
            level: 'warning',
            tags: { feature: 'subscription', action: 'getProducts' },
          });
          setIsInitializing(false);
        }
        return;
      }

      if (isMounted.current) {
        setProduct(products[0]);
        setCanRetry(false); // Success, no need to retry
      }

      // Setup purchase listeners
      purchaseListenerCleanup.current = iapService.setupPurchaseListeners(
        processPurchase,
        handlePurchaseError
      );
    } catch (err) {
      Sentry.captureException(err, {
        tags: { feature: 'subscription', action: 'initializeIAP' },
      });

      if (isMounted.current) {
        setError('Les achats intégrés ne sont pas disponibles');
        setCanRetry(true); // Allow retry on exception
      }
    } finally {
      if (isMounted.current) {
        setIsInitializing(false);
      }
    }
  }, [processPurchase, handlePurchaseError]);

  /**
   * Retry initialization after failure
   */
  const handleRetry = useCallback(async () => {
    // Clean up previous connection attempt
    if (purchaseListenerCleanup.current) {
      purchaseListenerCleanup.current();
      purchaseListenerCleanup.current = null;
    }
    await iapService.endConnection();

    // Retry initialization
    await initializeIAP();
  }, [initializeIAP]);

  /**
   * Initial IAP setup on mount
   */
  useEffect(() => {
    initializeIAP();

    // Cleanup on unmount
    return () => {
      isMounted.current = false;

      if (purchaseListenerCleanup.current) {
        purchaseListenerCleanup.current();
      }

      iapService.endConnection();
    };
  }, [initializeIAP]);

  /**
   * Handle start trial button press (AC#2)
   */
  const handleStartTrial = useCallback(async () => {
    if (isPending) return;

    setIsPending(true);
    setError(null);

    try {
      // Request subscription purchase (AC#2 - opens native store sheet)
      const { data: purchase, error: purchaseError } =
        await iapService.requestSubscription(PRODUCT_ID);

      if (purchaseError) {
        // User cancelled
        if (purchaseError.code === 'USER_CANCELLED') {
          setIsPending(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }

        // Other error (AC#6)
        throw new Error(purchaseError.message);
      }

      // If purchase returned directly (some implementations), process it
      if (purchase) {
        await processPurchase(purchase);
      }
      // Otherwise, the purchase listener will handle it
    } catch (err) {
      if (!isMounted.current) return;

      // Error feedback (AC#6)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'achat";
      setError(errorMessage);

      showToast({
        type: 'error',
        message: errorMessage,
      });

      Sentry.captureException(err, {
        tags: { feature: 'subscription', action: 'handleStartTrial' },
      });

      setIsPending(false);
    }
  }, [isPending, processPurchase]);

  /**
   * Handle skip button press (AC#5)
   */
  const handleSkip = useCallback(() => {
    // Light haptic feedback (AC#5)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Set subscription status to 'none' (AC#5)
    setSubscription({ status: 'none' });

    Sentry.addBreadcrumb({
      category: 'subscription',
      message: 'User skipped trial',
      level: 'info',
    });

    // Redirect to Home (AC#5)
    router.replace('/(tabs)');
  }, [router, setSubscription]);

  return {
    // State
    isPending,
    isInitializing,
    error,
    product,
    canRetry,

    // Actions
    handleStartTrial,
    handleSkip,
    handleRetry,
  };
};
