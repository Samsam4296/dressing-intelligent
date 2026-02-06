/**
 * iapService Unit Tests
 * Story 1.11: Démarrage Essai Gratuit
 *
 * Consolidated tests (per CLAUDE.md):
 * 1. Happy path: initConnection, getProducts, requestSubscription, validateReceipt, finishTransaction
 * 2. Error handling: all methods return { data, error } pattern on failure
 * 3. Purchase listeners setup + cleanup
 */

import { Platform } from 'react-native';

// ============================================
// Mocks
// ============================================

const mockInitConnection = jest.fn();
const mockEndConnection = jest.fn();
const mockGetSubscriptions = jest.fn();
const mockRequestSubscription = jest.fn();
const mockFinishTransaction = jest.fn();
const mockPurchaseUpdatedListener = jest.fn();
const mockPurchaseErrorListener = jest.fn();

jest.mock('react-native-iap', () => ({
  initConnection: () => mockInitConnection(),
  endConnection: () => mockEndConnection(),
  getSubscriptions: (params: { skus: string[] }) => mockGetSubscriptions(params),
  requestSubscription: (params: unknown) => mockRequestSubscription(params),
  finishTransaction: (params: unknown) => mockFinishTransaction(params),
  purchaseUpdatedListener: (cb: () => void) => mockPurchaseUpdatedListener(cb),
  purchaseErrorListener: (cb: () => void) => mockPurchaseErrorListener(cb),
}));

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

const mockGetSession = jest.fn();
const mockInvoke = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => mockGetSession() },
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
  isSupabaseConfigured: () => true,
}));

// Import after mocks
import { iapService, PRODUCT_ID } from '../services/iapService';

// ============================================
// Test Data
// ============================================

const mockSubscriptionProduct = {
  productId: 'dressing_monthly_trial',
  localizedPrice: '4,99 €',
  price: '4.99',
  currency: 'EUR',
  title: 'Dressing Monthly',
  description: '7 jours gratuits',
};

const mockPurchase = {
  transactionId: 'tx_123',
  transactionReceipt: 'receipt_base64',
  productId: 'dressing_monthly_trial',
};

// ============================================
// Tests
// ============================================

describe('iapService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy path flow', () => {
    it('initConnection returns { data: true } on success', async () => {
      mockInitConnection.mockResolvedValue(undefined);

      const result = await iapService.initConnection();

      expect(result).toEqual({ data: true, error: null });
      expect(mockInitConnection).toHaveBeenCalled();
    });

    it('endConnection completes without throwing', async () => {
      mockEndConnection.mockResolvedValue(undefined);

      await expect(iapService.endConnection()).resolves.toBeUndefined();
      expect(mockEndConnection).toHaveBeenCalled();
    });

    it('getProducts maps subscription data to IAPProduct[]', async () => {
      mockGetSubscriptions.mockResolvedValue([mockSubscriptionProduct]);

      const result = await iapService.getProducts();

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].productId).toBe('dressing_monthly_trial');
      expect(mockGetSubscriptions).toHaveBeenCalledWith({ skus: [PRODUCT_ID] });
    });

    it('requestSubscription calls IAP with correct params', async () => {
      mockRequestSubscription.mockResolvedValue(mockPurchase);

      const result = await iapService.requestSubscription('dressing_monthly_trial');

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockPurchase);
      expect(mockRequestSubscription).toHaveBeenCalledWith({
        sku: 'dressing_monthly_trial',
        subscriptionOffers: [{ sku: 'dressing_monthly_trial', offerToken: '' }],
      });
    });

    it('validateReceipt calls Edge Function with session token', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'jwt_token_123' } },
      });
      mockInvoke.mockResolvedValue({
        data: { subscription: { status: 'trial', product_id: 'dressing_monthly_trial' } },
        error: null,
      });

      const result = await iapService.validateReceipt('receipt_base64', 'dressing_monthly_trial');

      expect(result.error).toBeNull();
      expect(result.data).toEqual({ status: 'trial', product_id: 'dressing_monthly_trial' });
      expect(mockInvoke).toHaveBeenCalledWith('validate-receipt', {
        headers: { Authorization: 'Bearer jwt_token_123' },
        body: {
          receipt: 'receipt_base64',
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          productId: 'dressing_monthly_trial',
        },
      });
    });

    it('finishTransaction completes purchase lifecycle', async () => {
      mockFinishTransaction.mockResolvedValue(undefined);

      const result = await iapService.finishTransaction(mockPurchase as any);

      expect(result).toEqual({ data: true, error: null });
      expect(mockFinishTransaction).toHaveBeenCalledWith({
        purchase: mockPurchase,
        isConsumable: false,
      });
    });
  });

  describe('Error handling', () => {
    it('initConnection returns error on failure', async () => {
      mockInitConnection.mockRejectedValue(new Error('IAP not available'));

      const result = await iapService.initConnection();

      expect(result.data).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('IAP_UNAVAILABLE');
    });

    it('getProducts returns error when no subscriptions found', async () => {
      mockGetSubscriptions.mockResolvedValue([]);

      const result = await iapService.getProducts();

      expect(result.data).toBeNull();
      expect(result.error!.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('getProducts returns error on network failure', async () => {
      mockGetSubscriptions.mockRejectedValue(new Error('network error'));

      const result = await iapService.getProducts();

      expect(result.data).toBeNull();
      expect(result.error!.code).toBe('NETWORK_ERROR');
    });

    it('requestSubscription returns user cancelled error', async () => {
      mockRequestSubscription.mockRejectedValue(new Error('user cancelled purchase'));

      const result = await iapService.requestSubscription('dressing_monthly_trial');

      expect(result.data).toBeNull();
      expect(result.error!.code).toBe('USER_CANCELLED');
    });

    it('requestSubscription returns error on null purchase', async () => {
      mockRequestSubscription.mockResolvedValue(null);

      const result = await iapService.requestSubscription('dressing_monthly_trial');

      expect(result.data).toBeNull();
      expect(result.error!.code).toBe('PURCHASE_FAILED');
    });

    it('validateReceipt returns error when no session', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      const result = await iapService.validateReceipt('receipt', 'product');

      expect(result.data).toBeNull();
      expect(result.error!.code).toBe('AUTH_ERROR');
    });

    it('validateReceipt returns error when Edge Function fails', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
      });
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'validation failed' },
      });

      const result = await iapService.validateReceipt('receipt', 'product');

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('validateReceipt returns error when response contains error field', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
      });
      mockInvoke.mockResolvedValue({
        data: { error: 'receipt invalid' },
        error: null,
      });

      const result = await iapService.validateReceipt('receipt', 'product');

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('finishTransaction returns error on failure', async () => {
      mockFinishTransaction.mockRejectedValue(new Error('payment processing error'));

      const result = await iapService.finishTransaction(mockPurchase as any);

      expect(result.data).toBe(false);
      expect(result.error!.code).toBe('PAYMENT_FAILED');
    });

    it('endConnection fails silently', async () => {
      mockEndConnection.mockRejectedValue(new Error('cleanup error'));

      await expect(iapService.endConnection()).resolves.toBeUndefined();
    });
  });

  describe('Purchase listeners', () => {
    it('setupPurchaseListeners registers both listeners and returns cleanup', () => {
      const mockRemoveUpdate = jest.fn();
      const mockRemoveError = jest.fn();
      mockPurchaseUpdatedListener.mockReturnValue({ remove: mockRemoveUpdate });
      mockPurchaseErrorListener.mockReturnValue({ remove: mockRemoveError });

      const onUpdate = jest.fn();
      const onError = jest.fn();

      const cleanup = iapService.setupPurchaseListeners(onUpdate, onError);

      expect(mockPurchaseUpdatedListener).toHaveBeenCalled();
      expect(mockPurchaseErrorListener).toHaveBeenCalled();
      expect(typeof cleanup).toBe('function');

      // Verify cleanup removes both listeners
      cleanup();
      expect(mockRemoveUpdate).toHaveBeenCalled();
      expect(mockRemoveError).toHaveBeenCalled();
    });

    it('purchase update listener forwards to callback', () => {
      mockPurchaseUpdatedListener.mockImplementation((cb: (purchase: unknown) => void) => {
        cb(mockPurchase);
        return { remove: jest.fn() };
      });
      mockPurchaseErrorListener.mockReturnValue({ remove: jest.fn() });

      const onUpdate = jest.fn();
      const onError = jest.fn();

      iapService.setupPurchaseListeners(onUpdate, onError);

      expect(onUpdate).toHaveBeenCalledWith(mockPurchase);
    });

    it('purchase error listener forwards to callback', () => {
      mockPurchaseUpdatedListener.mockReturnValue({ remove: jest.fn() });
      const purchaseError = { code: 'E_IAP', message: 'Purchase failed' };
      mockPurchaseErrorListener.mockImplementation((cb: (error: unknown) => void) => {
        cb(purchaseError);
        return { remove: jest.fn() };
      });

      const onUpdate = jest.fn();
      const onError = jest.fn();

      iapService.setupPurchaseListeners(onUpdate, onError);

      expect(onError).toHaveBeenCalledWith(purchaseError);
    });
  });

  describe('Error message mapping', () => {
    it('maps cancelled errors to USER_CANCELLED', async () => {
      mockInitConnection.mockRejectedValue(new Error('user canceled the purchase'));
      const result = await iapService.initConnection();
      expect(result.error!.code).toBe('USER_CANCELLED');
    });

    it('maps pending errors to PURCHASE_PENDING', async () => {
      mockInitConnection.mockRejectedValue(new Error('purchase is pending approval'));
      const result = await iapService.initConnection();
      expect(result.error!.code).toBe('PURCHASE_PENDING');
    });

    it('maps unknown errors to IAP_ERROR', async () => {
      mockInitConnection.mockRejectedValue(new Error('something unexpected'));
      const result = await iapService.initConnection();
      expect(result.error!.code).toBe('IAP_ERROR');
    });
  });
});
