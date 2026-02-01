/**
 * Supabase Client Configuration
 *
 * This file configures the Supabase client for the Dressing Intelligent app.
 * It uses auto-generated types from the database schema for full type safety.
 *
 * @see https://supabase.com/docs/reference/javascript/initializing
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Environment variables validation
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables are not configured. ' +
      'Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
  );
}

/**
 * Supabase client instance
 *
 * Usage:
 * ```typescript
 * import { supabase } from '@/lib/supabase'
 *
 * // Query example
 * const { data, error } = await supabase
 *   .from('profiles')
 *   .select('*')
 *   .eq('user_id', userId)
 * ```
 */
export const supabase = createClient<Database>(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    // Persist session in storage
    persistSession: true,
    // Auto refresh token before expiry
    autoRefreshToken: true,
    // Detect session from URL (for OAuth redirects)
    detectSessionInUrl: true,
  },
});

/**
 * Helper to check if Supabase is properly configured
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};
