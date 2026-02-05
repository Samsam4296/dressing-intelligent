/**
 * IAP Service
 * Story 1.11: Démarrage Essai Gratuit
 *
 * API calls for In-App Purchase operations.
 * Follows the authService.ts pattern with { data, error } responses.
 *
 * AC#2: Store natif s'ouvre, feuille paiement affiche offre trial
 * AC#3: Edge Function valide côté serveur (NFR-I4)
 *
 * CRITICAL: Sentry logging per project-context.md
 */

import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';
import {
  initConnection,
  endConnection,
  getSubscriptions,
  requestSubscription,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Subscription as IAPSubscription,
  type SubscriptionPurchase,
  type PurchaseError,
} from 'react-native-iap';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type {
  ApiResponse,
  IAPProduct,
  Subscription,
  Platform as SubscriptionPlatform,
} from '../types/subscription';

// Product ID configured in App Store Connect / Google Play Console
export const PRODUCT_ID = 'dressing_monthly_trial';

/**
 * Map IAP error codes to user-friendly French messages
 */
const mapIAPError = (error: {
  message: string;
  code?: string;
}): { code: string; message: string } => {
  const message = error.message.toLowerCase();

  // User cancelled purchase
  if (
    message.includes('cancelled') ||
    message.includes('canceled') ||
    message.includes('user cancel')
  ) {
    return { code: 'USER_CANCELLED', message: 'Achat annulé' };
  }

  // Network errors
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Erreur de connexion. Vérifiez votre connexion internet.',
    };
  }

  // IAP not available
  if (
    message.includes('not available') ||
    message.includes('unavailable') ||
    message.includes('not supported')
  ) {
    return { code: 'IAP_UNAVAILABLE', message: 'Les achats intégrés ne sont pas disponibles.' };
  }

  // Product not found
  if (message.includes('product not found') || message.includes('item unavailable')) {
    return { code: 'PRODUCT_NOT_FOUND', message: 'Produit non disponible.' };
  }

  // Pending purchase
  if (message.includes('pending')) {
    return {
      code: 'PURCHASE_PENDING',
      message: 'Achat en attente. Vérifiez votre méthode de paiement.',
    };
  }

  // Payment failed
  if (message.includes('payment') || message.includes('billing')) {
    return {
      code: 'PAYMENT_FAILED',
      message: 'Échec du paiement. Vérifiez votre méthode de paiement.',
    };
  }

  // Validation failed
  if (message.includes('validation') || message.includes('verify') || message.includes('receipt')) {
    return { code: 'VALIDATION_FAILED', message: 'Erreur de validation. Veuillez réessayer.' };
  }

  // Default error
  return { code: 'IAP_ERROR', message: "Une erreur est survenue lors de l'achat" };
};

/**
 * Get current platform as SubscriptionPlatform type
 */
const getCurrentPlatform = (): SubscriptionPlatform => {
  return Platform.OS === 'ios' ? 'ios' : 'android';
};

/**
 * In-App Purchase Service
 */
export const iapService = {
  /**
   * Initialize IAP connection
   * Must be called before any other IAP operation
   */
  async initConnection(): Promise<ApiResponse<boolean>> {
    try {
      await initConnection();

      Sentry.addBreadcrumb({
        category: 'iap',
        message: 'IAP connection initialized',
        level: 'info',
      });

      return { data: true, error: null };
    } catch (err) {
      Sentry.captureException(err, {
        tags: { feature: 'subscription', action: 'initConnection' },
      });

      return { data: false, error: mapIAPError(err as Error) };
    }
  },

  /**
   * End IAP connection
   * Should be called when component unmounts
   */
  async endConnection(): Promise<void> {
    try {
      await endConnection();

      Sentry.addBreadcrumb({
        category: 'iap',
        message: 'IAP connection ended',
        level: 'info',
      });
    } catch (err) {
      // Silent fail - connection cleanup
      Sentry.captureException(err, {
        tags: { feature: 'subscription', action: 'endConnection' },
        level: 'warning',
      });
    }
  },

  /**
   * Get subscription products with localized pricing
   * AC#1: Display localized price after trial
   */
  async getProducts(): Promise<ApiResponse<IAPProduct[]>> {
    try {
      const subscriptions = await getSubscriptions({ skus: [PRODUCT_ID] });

      if (!subscriptions || subscriptions.length === 0) {
        return {
          data: null,
          error: { code: 'PRODUCT_NOT_FOUND', message: 'Produit non disponible.' },
        };
      }

      // Note: react-native-iap v12+ has different type definitions than runtime values
      // Using type assertion as actual structure depends on iOS/Android store responses
      // This code requires Apple/Google developer accounts to test properly
      const products: IAPProduct[] = subscriptions.map((sub) => {
        // Cast to any to access platform-specific properties that may exist at runtime
        const subscription = sub as IAPSubscription & Record<string, unknown>;

        return {
          productId: subscription.productId,
          localizedPrice: (subscription.localizedPrice as string) || '',
          price: (subscription.price as string) || '',
          currency: (subscription.currency as string) || '',
          title: subscription.title || '',
          description: subscription.description || '',
          introductoryPrice: (subscription.introductoryPrice as string) || undefined,
          subscriptionPeriod:
            (subscription.subscriptionPeriodUnitIOS as string) ||
            (subscription.subscriptionPeriodAndroid as string) ||
            undefined,
          freeTrialPeriod:
            (subscription.introductoryPricePeriodIOS as string) ||
            (subscription.freeTrialPeriodAndroid as string) ||
            undefined,
        };
      });

      Sentry.addBreadcrumb({
        category: 'iap',
        message: `Fetched ${products.length} products`,
        level: 'info',
      });

      return { data: products, error: null };
    } catch (err) {
      Sentry.captureException(err, {
        tags: { feature: 'subscription', action: 'getProducts' },
      });

      return { data: null, error: mapIAPError(err as Error) };
    }
  },

  /**
   * Request subscription purchase
   * AC#2: Opens native store sheet
   */
  async requestSubscription(productId: string): Promise<ApiResponse<SubscriptionPurchase>> {
    try {
      // Request subscription - this opens the native payment sheet
      const purchase = await requestSubscription({
        sku: productId,
        subscriptionOffers: [
          {
            sku: productId,
            offerToken: '', // For Android, may need to be set from product info
          },
        ],
      });

      if (!purchase) {
        return {
          data: null,
          error: { code: 'PURCHASE_FAILED', message: 'Achat échoué' },
        };
      }

      Sentry.addBreadcrumb({
        category: 'iap',
        message: 'Subscription purchase initiated',
        level: 'info',
        data: { productId },
      });

      return { data: purchase as SubscriptionPurchase, error: null };
    } catch (err) {
      const error = err as PurchaseError;

      Sentry.captureException(err, {
        tags: { feature: 'subscription', action: 'requestSubscription' },
        extra: { productId, errorCode: error.code },
      });

      return { data: null, error: mapIAPError(error) };
    }
  },

  /**
   * Validate receipt with Edge Function (server-side validation)
   * AC#3: Edge Function valide côté serveur (NFR-I4)
   * CRITICAL: Always validate receipts server-side before granting access
   */
  async validateReceipt(receipt: string, productId: string): Promise<ApiResponse<Subscription>> {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      const configError = {
        code: 'CONFIG_ERROR',
        message: "Le service n'est pas configuré",
      };
      Sentry.captureMessage('Supabase not configured for receipt validation', {
        level: 'warning',
        tags: { feature: 'subscription', action: 'validateReceipt' },
      });
      return { data: null, error: configError };
    }

    try {
      // Get current session for authorization
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        return {
          data: null,
          error: { code: 'AUTH_ERROR', message: 'Session invalide. Veuillez vous reconnecter.' },
        };
      }

      const platform = getCurrentPlatform();

      // Call Edge Function to validate receipt
      const { data, error: functionError } = await supabase.functions.invoke('validate-receipt', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          receipt,
          platform,
          productId,
        },
      });

      if (functionError) {
        Sentry.captureException(functionError, {
          tags: { feature: 'subscription', action: 'validateReceipt', step: 'edgeFunction' },
        });

        return {
          data: null,
          error: mapIAPError({ message: functionError.message }),
        };
      }

      // Check response for errors
      if (data?.error) {
        return {
          data: null,
          error: mapIAPError({ message: data.error }),
        };
      }

      Sentry.addBreadcrumb({
        category: 'iap',
        message: 'Receipt validated successfully',
        level: 'info',
        data: { productId, platform },
      });

      return { data: data.subscription as Subscription, error: null };
    } catch (err) {
      Sentry.captureException(err, {
        tags: { feature: 'subscription', action: 'validateReceipt' },
      });

      return {
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Erreur de validation. Veuillez réessayer.',
        },
      };
    }
  },

  /**
   * Finish transaction after successful validation
   * CRITICAL: Must call this after validateReceipt succeeds
   */
  async finishTransaction(purchase: SubscriptionPurchase): Promise<ApiResponse<boolean>> {
    try {
      await finishTransaction({
        purchase,
        isConsumable: false,
      });

      Sentry.addBreadcrumb({
        category: 'iap',
        message: 'Transaction finished',
        level: 'info',
      });

      return { data: true, error: null };
    } catch (err) {
      Sentry.captureException(err, {
        tags: { feature: 'subscription', action: 'finishTransaction' },
      });

      // Don't fail silently - this is important for preventing duplicate charges
      return { data: false, error: mapIAPError(err as Error) };
    }
  },

  /**
   * Setup purchase listeners
   * Returns cleanup function to remove listeners
   */
  setupPurchaseListeners(
    onPurchaseUpdate: (purchase: SubscriptionPurchase) => void,
    onPurchaseError: (error: PurchaseError) => void
  ): () => void {
    const purchaseUpdateSubscription = purchaseUpdatedListener((purchase) => {
      Sentry.addBreadcrumb({
        category: 'iap',
        message: 'Purchase update received',
        level: 'info',
      });
      onPurchaseUpdate(purchase as SubscriptionPurchase);
    });

    const purchaseErrorSubscription = purchaseErrorListener((error) => {
      Sentry.captureException(error, {
        tags: { feature: 'subscription', action: 'purchaseListener' },
      });
      onPurchaseError(error);
    });

    // Return cleanup function
    return () => {
      purchaseUpdateSubscription.remove();
      purchaseErrorSubscription.remove();
    };
  },
};
