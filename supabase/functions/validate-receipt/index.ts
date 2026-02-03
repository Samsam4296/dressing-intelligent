/**
 * Edge Function: validate-receipt
 * Story 1.11: Démarrage Essai Gratuit
 *
 * Validates IAP receipts from Apple App Store or Google Play Store
 * and creates/updates subscription records in the database.
 *
 * Flow:
 * 1. Verify JWT from Authorization header
 * 2. Parse request body (receipt, platform, productId)
 * 3. Validate receipt with Apple/Google APIs
 * 4. Create or update subscription record
 * 5. Return subscription data
 *
 * AC#3: Edge Function valide côté serveur (NFR-I4)
 *
 * Environment variables required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - APPLE_SHARED_SECRET (for App Store Connect)
 * - GOOGLE_SERVICE_ACCOUNT_KEY (JSON string of service account)
 * - ANDROID_PACKAGE_NAME (e.g., com.dressingintelligent.app)
 *
 * Note: console.* is used for logging as Sentry is not available in Deno Edge Functions.
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// ============================================
// Google OAuth2 JWT Signing Utilities
// ============================================

/**
 * Base64URL encode (RFC 4648)
 */
function base64UrlEncode(data: Uint8Array | string): string {
  const base64 = typeof data === 'string'
    ? btoa(data)
    : btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Import RSA private key from PEM format for signing
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Remove PEM headers and decode
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
    .replace(/-----END RSA PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  return await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
}

/**
 * Create and sign a JWT for Google OAuth2
 */
async function createSignedJwt(
  clientEmail: string,
  privateKey: string,
  scope: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const payload = {
    iss: clientEmail,
    scope: scope,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // Import key and sign
  const key = await importPrivateKey(privateKey);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput)
  );

  const encodedSignature = base64UrlEncode(new Uint8Array(signature));

  return `${signingInput}.${encodedSignature}`;
}

/**
 * Get Google OAuth2 access token using service account
 */
async function getGoogleAccessToken(
  clientEmail: string,
  privateKey: string
): Promise<string> {
  const jwt = await createSignedJwt(
    clientEmail,
    privateKey,
    'https://www.googleapis.com/auth/androidpublisher'
  );

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get access token: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// CORS headers for preflight requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Types
interface ReceiptValidationRequest {
  receipt: string;
  platform: 'ios' | 'android';
  productId: string;
}

interface SubscriptionData {
  user_id: string;
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  product_id: string;
  platform: 'ios' | 'android';
  original_transaction_id: string;
  trial_ends_at: string | null;
  expires_at: string;
  auto_renewing: boolean;
  raw_receipt: object;
}

interface AppleReceiptResponse {
  status: number;
  latest_receipt_info?: Array<{
    original_transaction_id: string;
    product_id: string;
    expires_date_ms: string;
    is_trial_period: string;
    is_in_intro_offer_period?: string;
    auto_renew_status?: string;
  }>;
  pending_renewal_info?: Array<{
    auto_renew_status: string;
  }>;
}

interface GooglePurchaseResponse {
  orderId: string;
  purchaseTimeMillis: string;
  purchaseState: number;
  paymentState: number;
  expiryTimeMillis: string;
  autoRenewing: boolean;
  acknowledgementState: number;
}

/**
 * Validate Apple App Store receipt
 */
async function validateAppleReceipt(
  receipt: string,
  productId: string
): Promise<{ valid: boolean; data?: Partial<SubscriptionData>; error?: string }> {
  const sharedSecret = Deno.env.get('APPLE_SHARED_SECRET');

  if (!sharedSecret) {
    console.warn('APPLE_SHARED_SECRET not configured');
    return { valid: false, error: 'Apple validation not configured' };
  }

  try {
    // First try production endpoint
    let response = await fetch('https://buy.itunes.apple.com/verifyReceipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'receipt-data': receipt,
        password: sharedSecret,
        'exclude-old-transactions': true,
      }),
    });

    let result: AppleReceiptResponse = await response.json();

    // If sandbox receipt, retry with sandbox endpoint (status 21007)
    if (result.status === 21007) {
      response = await fetch('https://sandbox.itunes.apple.com/verifyReceipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'receipt-data': receipt,
          password: sharedSecret,
          'exclude-old-transactions': true,
        }),
      });
      result = await response.json();
    }

    // Check for valid status (0 = valid)
    if (result.status !== 0) {
      console.error(`Apple receipt validation failed with status: ${result.status}`);
      return { valid: false, error: `Receipt validation failed (status: ${result.status})` };
    }

    // Get latest transaction info
    const latestReceipt = result.latest_receipt_info?.[0];
    if (!latestReceipt) {
      return { valid: false, error: 'No transaction info found' };
    }

    // Verify product ID matches
    if (latestReceipt.product_id !== productId) {
      return { valid: false, error: 'Product ID mismatch' };
    }

    // Check if subscription is still valid
    const expiresAt = new Date(parseInt(latestReceipt.expires_date_ms));
    const now = new Date();

    // Determine status
    const isTrial = latestReceipt.is_trial_period === 'true' ||
                    latestReceipt.is_in_intro_offer_period === 'true';
    const isExpired = expiresAt < now;
    const autoRenewing = result.pending_renewal_info?.[0]?.auto_renew_status === '1';

    let status: SubscriptionData['status'];
    if (isExpired) {
      status = 'expired';
    } else if (isTrial) {
      status = 'trial';
    } else {
      status = 'active';
    }

    // Calculate trial end date (7 days from original purchase for trial)
    const trialEndsAt = isTrial ? expiresAt.toISOString() : null;

    // Store only essential fields for audit (reduce raw_receipt size)
    const auditReceipt = {
      status: result.status,
      latest_transaction: {
        original_transaction_id: latestReceipt.original_transaction_id,
        product_id: latestReceipt.product_id,
        expires_date_ms: latestReceipt.expires_date_ms,
        is_trial_period: latestReceipt.is_trial_period,
        is_in_intro_offer_period: latestReceipt.is_in_intro_offer_period,
      },
      auto_renew_status: result.pending_renewal_info?.[0]?.auto_renew_status,
    };

    return {
      valid: true,
      data: {
        status,
        product_id: latestReceipt.product_id,
        platform: 'ios',
        original_transaction_id: latestReceipt.original_transaction_id,
        trial_ends_at: trialEndsAt,
        expires_at: expiresAt.toISOString(),
        auto_renewing: autoRenewing,
        raw_receipt: auditReceipt,
      },
    };
  } catch (err) {
    console.error('Apple receipt validation error:', err);
    return { valid: false, error: err instanceof Error ? err.message : 'Validation failed' };
  }
}

/**
 * Validate Google Play receipt using Google Play Developer API
 * Implements full server-side validation per NFR-I4
 */
async function validateGoogleReceipt(
  receipt: string,
  productId: string
): Promise<{ valid: boolean; data?: Partial<SubscriptionData>; error?: string }> {
  const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
  const packageName = Deno.env.get('ANDROID_PACKAGE_NAME') || 'com.dressingintelligent.app';

  if (!serviceAccountKey) {
    console.warn('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
    return { valid: false, error: 'Google validation not configured' };
  }

  try {
    // Parse the purchase data from receipt
    const purchaseData = JSON.parse(receipt);
    const purchaseToken = purchaseData.purchaseToken;

    if (!purchaseToken) {
      return { valid: false, error: 'Invalid receipt format: missing purchaseToken' };
    }

    // Parse service account credentials
    const credentials = JSON.parse(serviceAccountKey);

    if (!credentials.client_email || !credentials.private_key) {
      console.error('Invalid service account credentials format');
      return { valid: false, error: 'Server configuration error' };
    }

    // Get OAuth2 access token using signed JWT
    console.log('Obtaining Google OAuth2 access token...');
    const accessToken = await getGoogleAccessToken(
      credentials.client_email,
      credentials.private_key
    );

    // Call Google Play Developer API to validate subscription
    const apiUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`;

    console.log(`Validating subscription with Google Play API for product: ${productId}`);
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Play API error (${response.status}): ${errorText}`);

      // Handle specific error codes
      if (response.status === 404) {
        return { valid: false, error: 'Purchase not found or invalid' };
      }
      if (response.status === 401 || response.status === 403) {
        return { valid: false, error: 'Server authorization error' };
      }

      return { valid: false, error: 'Receipt validation failed' };
    }

    const subscriptionPurchase: GooglePurchaseResponse = await response.json();

    // Verify purchase state (0 = purchased, 1 = canceled, 2 = pending)
    if (subscriptionPurchase.purchaseState !== 0) {
      console.warn(`Invalid purchase state: ${subscriptionPurchase.purchaseState}`);
      return { valid: false, error: 'Purchase not completed' };
    }

    // Verify payment state for subscriptions (1 = received, 2 = free trial, 3 = pending upgrade/downgrade)
    const paymentState = subscriptionPurchase.paymentState;

    // Calculate expiry time
    const expiryTime = new Date(parseInt(subscriptionPurchase.expiryTimeMillis));
    const now = new Date();

    // Determine if in trial period (paymentState 2 = free trial)
    const isTrial = paymentState === 2;

    // Determine subscription status
    let status: SubscriptionData['status'];
    if (expiryTime < now) {
      status = 'expired';
    } else if (isTrial) {
      status = 'trial';
    } else {
      status = 'active';
    }

    console.log(`Google receipt validated: status=${status}, expires=${expiryTime.toISOString()}`);

    // Store only essential fields from the response (reduce raw_receipt size)
    const auditReceipt = {
      orderId: subscriptionPurchase.orderId,
      purchaseTimeMillis: subscriptionPurchase.purchaseTimeMillis,
      purchaseState: subscriptionPurchase.purchaseState,
      paymentState: subscriptionPurchase.paymentState,
      expiryTimeMillis: subscriptionPurchase.expiryTimeMillis,
      autoRenewing: subscriptionPurchase.autoRenewing,
      acknowledgementState: subscriptionPurchase.acknowledgementState,
    };

    return {
      valid: true,
      data: {
        status,
        product_id: productId,
        platform: 'android',
        original_transaction_id: subscriptionPurchase.orderId,
        trial_ends_at: isTrial ? expiryTime.toISOString() : null,
        expires_at: expiryTime.toISOString(),
        auto_renewing: subscriptionPurchase.autoRenewing,
        raw_receipt: auditReceipt,
      },
    };
  } catch (err) {
    console.error('Google receipt validation error:', err);
    return { valid: false, error: err instanceof Error ? err.message : 'Validation failed' };
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwt = authHeader.replace('Bearer ', '');

    // Create admin client with service role (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify JWT and get user
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    // Parse request body
    const body: ReceiptValidationRequest = await req.json();
    const { receipt, platform, productId } = body;

    if (!receipt || !platform || !productId) {
      return new Response(JSON.stringify({ error: 'Missing required fields: receipt, platform, productId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate platform
    if (platform !== 'ios' && platform !== 'android') {
      return new Response(JSON.stringify({ error: 'Invalid platform. Must be ios or android' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate receipt based on platform
    let validationResult;
    if (platform === 'ios') {
      validationResult = await validateAppleReceipt(receipt, productId);
    } else {
      validationResult = await validateGoogleReceipt(receipt, productId);
    }

    if (!validationResult.valid || !validationResult.data) {
      return new Response(JSON.stringify({
        error: validationResult.error || 'Receipt validation failed',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare subscription data
    const subscriptionData: SubscriptionData = {
      user_id: userId,
      ...validationResult.data as Omit<SubscriptionData, 'user_id'>,
    };

    // Check if subscription already exists (upsert)
    const { data: existingSubscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .single();

    let subscription;
    if (existingSubscription) {
      // Update existing subscription
      const { data, error } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: subscriptionData.status,
          product_id: subscriptionData.product_id,
          trial_ends_at: subscriptionData.trial_ends_at,
          expires_at: subscriptionData.expires_at,
          auto_renewing: subscriptionData.auto_renewing,
          raw_receipt: subscriptionData.raw_receipt,
        })
        .eq('id', existingSubscription.id)
        .select()
        .single();

      if (error) {
        console.error('Failed to update subscription:', error);
        return new Response(JSON.stringify({ error: 'Failed to update subscription' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      subscription = data;
    } else {
      // Insert new subscription
      const { data, error } = await supabaseAdmin
        .from('subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (error) {
        // Handle duplicate transaction ID (already processed)
        if (error.code === '23505') {
          console.warn('Duplicate transaction - receipt already processed');
          // Fetch existing subscription
          const { data: existing } = await supabaseAdmin
            .from('subscriptions')
            .select()
            .eq('original_transaction_id', subscriptionData.original_transaction_id)
            .single();

          if (existing) {
            subscription = existing;
          } else {
            return new Response(JSON.stringify({ error: 'Failed to create subscription' }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } else {
          console.error('Failed to create subscription:', error);
          return new Response(JSON.stringify({ error: 'Failed to create subscription' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        subscription = data;
      }
    }

    console.log(`Subscription ${existingSubscription ? 'updated' : 'created'} for user ${userId}`);

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          product_id: subscription.product_id,
          platform: subscription.platform,
          trial_ends_at: subscription.trial_ends_at,
          expires_at: subscription.expires_at,
          auto_renewing: subscription.auto_renewing,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
