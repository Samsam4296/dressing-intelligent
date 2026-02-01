/**
 * User Factory
 *
 * Factory functions for creating test user data.
 * Uses deterministic data with override support.
 */

import type { User, Session } from '@supabase/supabase-js';

let userIdCounter = 1;
let sessionCounter = 1;

/**
 * Create a mock Supabase User object
 */
export const createMockUser = (overrides: Partial<User> = {}): User => {
  const id = `user-${userIdCounter++}`;
  return {
    id,
    aud: 'authenticated',
    role: 'authenticated',
    email: `test${userIdCounter}@example.com`,
    email_confirmed_at: new Date().toISOString(),
    phone: null,
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: 'email' },
    user_metadata: { name: 'Test User' },
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_anonymous: false,
    ...overrides,
  };
};

/**
 * Create a mock Supabase Session object
 */
export const createMockSession = (
  user?: User,
  overrides: Partial<Session> = {}
): Session => {
  const sessionUser = user || createMockUser();
  return {
    access_token: `access-token-${sessionCounter++}`,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: `refresh-token-${sessionCounter}`,
    user: sessionUser,
    ...overrides,
  };
};

/**
 * Reset factory counters (call in beforeEach)
 */
export const resetUserFactory = (): void => {
  userIdCounter = 1;
  sessionCounter = 1;
};
