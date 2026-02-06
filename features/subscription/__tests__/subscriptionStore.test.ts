/**
 * subscriptionStore Unit Tests
 * Story 1.11: Démarrage Essai Gratuit
 *
 * Consolidated tests (per CLAUDE.md):
 * 1. Store actions: setSubscription, clearSubscription
 * 2. Computed methods: isActive, isTrial, isExpired
 * 3. Selectors: selectIsSubscriptionActive, selectIsTrial, etc.
 */

// ============================================
// Mocks
// ============================================

jest.mock('@/lib/storage', () => ({
  zustandStorage: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

// Import after mocks
import {
  useSubscriptionStore,
  selectSubscriptionStatus,
  selectIsSubscriptionActive,
  selectIsTrial,
  selectExpiresAt,
  selectTrialEndsAt,
} from '../stores/subscriptionStore';

// ============================================
// Helpers
// ============================================

/** Get a date string N days in the future */
const futureDate = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

/** Get a date string N days in the past */
const pastDate = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

// ============================================
// Tests
// ============================================

describe('subscriptionStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useSubscriptionStore.getState().clearSubscription();
  });

  describe('Store actions', () => {
    it('initializes with correct default state', () => {
      const state = useSubscriptionStore.getState();

      expect(state.status).toBe('none');
      expect(state.productId).toBeNull();
      expect(state.trialEndsAt).toBeNull();
      expect(state.expiresAt).toBeNull();
      expect(state.autoRenewing).toBe(false);
    });

    it('setSubscription updates partial state', () => {
      const { setSubscription } = useSubscriptionStore.getState();

      setSubscription({
        status: 'trial',
        productId: 'dressing_monthly_trial',
        trialEndsAt: '2026-02-10T00:00:00Z',
        expiresAt: '2026-02-10T00:00:00Z',
      });

      const state = useSubscriptionStore.getState();
      expect(state.status).toBe('trial');
      expect(state.productId).toBe('dressing_monthly_trial');
      expect(state.trialEndsAt).toBe('2026-02-10T00:00:00Z');
      expect(state.autoRenewing).toBe(false); // unchanged
    });

    it('setSubscription merges with existing state', () => {
      const { setSubscription } = useSubscriptionStore.getState();

      setSubscription({ status: 'trial', productId: 'product_1' });
      setSubscription({ status: 'active', autoRenewing: true });

      const state = useSubscriptionStore.getState();
      expect(state.status).toBe('active');
      expect(state.productId).toBe('product_1'); // preserved
      expect(state.autoRenewing).toBe(true);
    });

    it('clearSubscription resets to initial state', () => {
      const { setSubscription, clearSubscription } = useSubscriptionStore.getState();

      setSubscription({
        status: 'active',
        productId: 'product_1',
        expiresAt: '2026-12-31T00:00:00Z',
        autoRenewing: true,
      });

      clearSubscription();

      const state = useSubscriptionStore.getState();
      expect(state.status).toBe('none');
      expect(state.productId).toBeNull();
      expect(state.expiresAt).toBeNull();
      expect(state.autoRenewing).toBe(false);
    });
  });

  describe('Computed methods', () => {
    describe('isActive', () => {
      it('returns false for status "none"', () => {
        expect(useSubscriptionStore.getState().isActive()).toBe(false);
      });

      it('returns true for active trial with future expiry', () => {
        useSubscriptionStore.getState().setSubscription({
          status: 'trial',
          expiresAt: futureDate(7),
        });
        expect(useSubscriptionStore.getState().isActive()).toBe(true);
      });

      it('returns true for active subscription with future expiry', () => {
        useSubscriptionStore.getState().setSubscription({
          status: 'active',
          expiresAt: futureDate(30),
        });
        expect(useSubscriptionStore.getState().isActive()).toBe(true);
      });

      it('returns false for expired subscription', () => {
        useSubscriptionStore.getState().setSubscription({
          status: 'active',
          expiresAt: pastDate(1),
        });
        expect(useSubscriptionStore.getState().isActive()).toBe(false);
      });

      it('returns false for cancelled status', () => {
        useSubscriptionStore.getState().setSubscription({
          status: 'cancelled',
          expiresAt: futureDate(5),
        });
        expect(useSubscriptionStore.getState().isActive()).toBe(false);
      });

      it('returns false for expired status', () => {
        useSubscriptionStore.getState().setSubscription({ status: 'expired' });
        expect(useSubscriptionStore.getState().isActive()).toBe(false);
      });

      it('returns true for active without expiry date', () => {
        useSubscriptionStore.getState().setSubscription({ status: 'active' });
        expect(useSubscriptionStore.getState().isActive()).toBe(true);
      });
    });

    describe('isTrial', () => {
      it('returns false for status "none"', () => {
        expect(useSubscriptionStore.getState().isTrial()).toBe(false);
      });

      it('returns true for trial with future trialEndsAt', () => {
        useSubscriptionStore.getState().setSubscription({
          status: 'trial',
          trialEndsAt: futureDate(7),
        });
        expect(useSubscriptionStore.getState().isTrial()).toBe(true);
      });

      it('returns false for trial with past trialEndsAt', () => {
        useSubscriptionStore.getState().setSubscription({
          status: 'trial',
          trialEndsAt: pastDate(1),
        });
        expect(useSubscriptionStore.getState().isTrial()).toBe(false);
      });

      it('returns false for active status even with trialEndsAt', () => {
        useSubscriptionStore.getState().setSubscription({
          status: 'active',
          trialEndsAt: futureDate(7),
        });
        expect(useSubscriptionStore.getState().isTrial()).toBe(false);
      });

      it('returns false for trial without trialEndsAt', () => {
        useSubscriptionStore.getState().setSubscription({ status: 'trial' });
        expect(useSubscriptionStore.getState().isTrial()).toBe(false);
      });
    });

    describe('isExpired', () => {
      it('returns false for status "none"', () => {
        expect(useSubscriptionStore.getState().isExpired()).toBe(false);
      });

      it('returns true for explicit expired status', () => {
        useSubscriptionStore.getState().setSubscription({ status: 'expired' });
        expect(useSubscriptionStore.getState().isExpired()).toBe(true);
      });

      it('returns true for active with past expiresAt', () => {
        useSubscriptionStore.getState().setSubscription({
          status: 'active',
          expiresAt: pastDate(1),
        });
        expect(useSubscriptionStore.getState().isExpired()).toBe(true);
      });

      it('returns false for active with future expiresAt', () => {
        useSubscriptionStore.getState().setSubscription({
          status: 'active',
          expiresAt: futureDate(30),
        });
        expect(useSubscriptionStore.getState().isExpired()).toBe(false);
      });

      it('returns false for none status without expiresAt', () => {
        expect(useSubscriptionStore.getState().isExpired()).toBe(false);
      });
    });
  });

  describe('Selectors', () => {
    it('selectSubscriptionStatus returns current status', () => {
      useSubscriptionStore.getState().setSubscription({ status: 'trial' });
      const state = useSubscriptionStore.getState();
      expect(selectSubscriptionStatus(state)).toBe('trial');
    });

    it('selectIsSubscriptionActive mirrors isActive logic', () => {
      useSubscriptionStore.getState().setSubscription({
        status: 'active',
        expiresAt: futureDate(30),
      });
      expect(selectIsSubscriptionActive(useSubscriptionStore.getState())).toBe(true);

      useSubscriptionStore.getState().setSubscription({
        status: 'active',
        expiresAt: pastDate(1),
      });
      expect(selectIsSubscriptionActive(useSubscriptionStore.getState())).toBe(false);

      useSubscriptionStore.getState().clearSubscription();
      expect(selectIsSubscriptionActive(useSubscriptionStore.getState())).toBe(false);
    });

    it('selectIsTrial mirrors isTrial logic', () => {
      useSubscriptionStore.getState().setSubscription({
        status: 'trial',
        trialEndsAt: futureDate(7),
      });
      expect(selectIsTrial(useSubscriptionStore.getState())).toBe(true);

      useSubscriptionStore.getState().setSubscription({
        status: 'trial',
        trialEndsAt: pastDate(1),
      });
      expect(selectIsTrial(useSubscriptionStore.getState())).toBe(false);
    });

    it('selectExpiresAt returns expiresAt value', () => {
      const date = futureDate(30);
      useSubscriptionStore.getState().setSubscription({ expiresAt: date });
      expect(selectExpiresAt(useSubscriptionStore.getState())).toBe(date);
    });

    it('selectTrialEndsAt returns trialEndsAt value', () => {
      const date = futureDate(7);
      useSubscriptionStore.getState().setSubscription({ trialEndsAt: date });
      expect(selectTrialEndsAt(useSubscriptionStore.getState())).toBe(date);
    });
  });
});
