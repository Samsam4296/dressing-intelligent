// =============================================================================
// Edge Function: process-clothing-image
// =============================================================================
// Traite les photos de vêtements:
// 1. Upload vers Cloudinary
// 2. Applique le background removal (détourage)
// 3. Catégorisation automatique via Imagga AI (Story 2.4)
// 4. Retourne les URLs (originale + traitée) + catégorie suggérée
//
// Sécurité:
// - Credentials Cloudinary dans Supabase Secrets
// - Validation UUID, taille, MIME type
// - Idempotency key pour éviter les duplications
// - Messages d'erreur sanitisés
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import {
  mapCloudinaryTagsToCategory,
  type ClothingCategory,
} from '../_shared/categoryMapping.ts';

// =============================================================================
// Constants
// =============================================================================

/** Maximum base64 size in characters (~10MB image = ~13.3MB base64) */
const MAX_BASE64_SIZE = 15_000_000;

/** UUID v4 regex pattern */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Allowed MIME types for images */
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];

/** Rate limiting: max uploads per profile per minute */
const RATE_LIMIT_MAX_UPLOADS = 10;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

/** User-facing error messages (sanitized) */
const ERROR_MESSAGES = {
  MISSING_FIELDS: 'Champs requis manquants',
  INVALID_PROFILE_ID: 'Identifiant de profil invalide',
  IMAGE_TOO_LARGE: 'Image trop volumineuse (max 10MB)',
  INVALID_MIME_TYPE: "Format d'image non supporté",
  MISSING_AUTH: 'Authentification requise',
  UNAUTHORIZED: 'Non autorisé',
  PROFILE_NOT_FOUND: 'Profil non trouvé',
  SERVER_ERROR: 'Erreur serveur, veuillez réessayer',
  UPLOAD_TIMEOUT: 'Délai dépassé, veuillez réessayer',
  CONFIG_ERROR: 'Configuration serveur incomplète',
  RATE_LIMITED: 'Trop de requêtes, veuillez patienter',
  DUPLICATE_REQUEST: 'Requête déjà traitée',
} as const;

// =============================================================================
// Types
// =============================================================================

interface ProcessImageRequest {
  imageBase64: string;
  profileId: string;
  mimeType?: string;
  idempotencyKey?: string;
}

interface ProcessImageResponse {
  success: boolean;
  data?: {
    originalUrl: string;
    processedUrl: string | null;
    publicId: string;
    // Story 2.4: AI categorization
    suggestedCategory?: ClothingCategory;
    categoryConfidence?: number; // 0-100
  };
  error?: string;
}

interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  eager?: Array<{ secure_url: string }>;
  // Story 2.4: Imagga tagging response
  tags?: string[];
  info?: {
    categorization?: {
      imagga_tagging?: {
        status: string; // 'complete' | 'pending'
        data: Array<{
          tag: string;
          confidence: number; // 0.0 - 1.0
        }>;
      };
    };
  };
}

// =============================================================================
// Environment Variables
// =============================================================================

const CLOUDINARY_CLOUD_NAME = Deno.env.get('CLOUDINARY_CLOUD_NAME')!;
const CLOUDINARY_API_KEY = Deno.env.get('CLOUDINARY_API_KEY')!;
const CLOUDINARY_API_SECRET = Deno.env.get('CLOUDINARY_API_SECRET')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validates UUID v4 format
 */
function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Validates MIME type against whitelist
 */
function isValidMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

/**
 * Sanitizes UUID for path construction (defense-in-depth)
 */
function sanitizeUUID(uuid: string): string {
  return uuid.replace(/[^a-f0-9-]/gi, '');
}

// =============================================================================
// Error Helpers
// =============================================================================

class ClientError extends Error {
  constructor(
    public readonly userMessage: string,
    public readonly statusCode: number = 400,
    internalMessage?: string
  ) {
    super(internalMessage || userMessage);
    this.name = 'ClientError';
  }
}

/**
 * Logs error server-side without exposing details to client
 * Note: In production, integrate with Sentry or similar service
 */
function logError(context: string, error: unknown, metadata?: Record<string, unknown>): void {
  // Server-side logging only
  console.error(`[${context}]`, {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...metadata,
  });
}

// =============================================================================
// Main Handler
// =============================================================================

serve(async (req: Request): Promise<Response> => {
  // CORS headers - use environment variable for production security
  // Set ALLOWED_ORIGIN in Supabase secrets for production deployment
  // WARNING: Falls back to '*' only for development. Set ALLOWED_ORIGIN in production!
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN');
  if (!allowedOrigin) {
    console.warn('[SECURITY] ALLOWED_ORIGIN not set - using wildcard. Set this in production!');
  }
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ===========================================
    // 1. Validate server configuration
    // ===========================================
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      logError('config', new Error('Missing Cloudinary credentials'));
      throw new ClientError(ERROR_MESSAGES.CONFIG_ERROR, 500);
    }

    // ===========================================
    // 2. Parse and validate request body
    // ===========================================
    const body: ProcessImageRequest = await req.json();
    const { imageBase64, profileId, mimeType = 'image/jpeg', idempotencyKey } = body;

    // Required fields
    if (!imageBase64 || !profileId) {
      throw new ClientError(ERROR_MESSAGES.MISSING_FIELDS);
    }

    // UUID format validation
    if (!isValidUUID(profileId)) {
      throw new ClientError(ERROR_MESSAGES.INVALID_PROFILE_ID);
    }

    // Base64 size validation (prevents DoS)
    if (imageBase64.length > MAX_BASE64_SIZE) {
      throw new ClientError(ERROR_MESSAGES.IMAGE_TOO_LARGE);
    }

    // MIME type whitelist validation
    if (!isValidMimeType(mimeType)) {
      throw new ClientError(ERROR_MESSAGES.INVALID_MIME_TYPE);
    }

    // ===========================================
    // 3. Authenticate user
    // ===========================================
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new ClientError(ERROR_MESSAGES.MISSING_AUTH, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      logError('auth', authError || new Error('No user found'));
      throw new ClientError(ERROR_MESSAGES.UNAUTHORIZED, 401);
    }

    // ===========================================
    // 4. Verify profile ownership
    // ===========================================
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_id')
      .eq('id', profileId)
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      logError('profile', profileError || new Error('Profile not found'), {
        profileId,
        userId: user.id,
      });
      throw new ClientError(ERROR_MESSAGES.PROFILE_NOT_FOUND, 404);
    }

    // ===========================================
    // 5. Rate limiting check (graceful if table doesn't exist yet)
    // ===========================================
    // Note: clothing_items table created in Story 2.7. Until then, rate limiting is skipped.
    try {
      const rateLimitCutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
      const { count: recentUploads, error: rateLimitError } = await supabase
        .from('clothing_items')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .gte('created_at', rateLimitCutoff);

      if (rateLimitError) {
        // Table doesn't exist yet - skip rate limiting (will work after Story 2.7)
        logError('rate_limit_skip', rateLimitError, { reason: 'table_not_ready' });
      } else if (recentUploads !== null && recentUploads >= RATE_LIMIT_MAX_UPLOADS) {
        logError('rate_limit', new Error('Rate limit exceeded'), { profileId, recentUploads });
        throw new ClientError(ERROR_MESSAGES.RATE_LIMITED, 429);
      }
    } catch (error) {
      // Only re-throw if it's our rate limit error
      if (error instanceof ClientError) throw error;
      // Otherwise log and continue (table may not exist)
      logError('rate_limit_error', error, { reason: 'graceful_skip' });
    }

    // ===========================================
    // 6. Check idempotency (graceful if table doesn't exist yet)
    // ===========================================
    // Note: clothing_items table created in Story 2.7. Until then, idempotency check is skipped.
    if (idempotencyKey) {
      try {
        const sanitizedUserId = sanitizeUUID(user.id);
        const sanitizedProfileId = sanitizeUUID(profileId);
        const expectedPublicId = `clothes/${sanitizedUserId}/${sanitizedProfileId}/${idempotencyKey}`;

        // Check if this idempotency key was already processed
        const { data: existingItem, error: idempotencyError } = await supabase
          .from('clothing_items')
          .select('cloudinary_public_id, original_image_url, processed_image_url')
          .eq('cloudinary_public_id', expectedPublicId)
          .single();

        if (idempotencyError && idempotencyError.code !== 'PGRST116') {
          // PGRST116 = no rows returned (expected). Other errors = table issue
          logError('idempotency_skip', idempotencyError, { reason: 'table_not_ready' });
        } else if (existingItem) {
          // Return cached result instead of re-uploading
          logError('idempotency', new Error('Duplicate request detected'), { idempotencyKey });
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                originalUrl: existingItem.original_image_url,
                processedUrl: existingItem.processed_image_url,
                publicId: existingItem.cloudinary_public_id,
              },
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          );
        }
      } catch (error) {
        // Log and continue (table may not exist)
        logError('idempotency_error', error, { reason: 'graceful_skip' });
      }
    }

    // ===========================================
    // 7. Generate idempotent public_id
    // ===========================================
    // Use client-provided idempotency key to prevent duplicate uploads on retry
    // Falls back to timestamp if not provided (backward compatible)
    const sanitizedUserId = sanitizeUUID(user.id);
    const sanitizedProfileId = sanitizeUUID(profileId);
    const uploadId = idempotencyKey || `${Date.now()}`;
    const publicId = `clothes/${sanitizedUserId}/${sanitizedProfileId}/${uploadId}`;

    // ===========================================
    // 8. Upload to Cloudinary
    // ===========================================
    const uploadResult = await uploadToCloudinary({
      imageBase64,
      mimeType,
      publicId,
    });

    // ===========================================
    // 9. Map Imagga tags to category (Story 2.4)
    // ===========================================
    let suggestedCategory: ClothingCategory | undefined;
    let categoryConfidence: number | undefined;

    // Check if Imagga tagging is complete (not 'pending')
    const imaggaResult = uploadResult.info?.categorization?.imagga_tagging;
    if (imaggaResult?.status === 'complete' && imaggaResult.data?.length) {
      const mapping = mapCloudinaryTagsToCategory(imaggaResult.data);
      if (mapping) {
        suggestedCategory = mapping.category;
        categoryConfidence = mapping.confidence;
      }
    }
    // If status === 'pending' or no match: suggestedCategory remains undefined
    // Client will show "Sélectionnez une catégorie" without pre-selection

    // ===========================================
    // 10. Return success response
    // ===========================================
    const response: ProcessImageResponse = {
      success: true,
      data: {
        originalUrl: uploadResult.secure_url,
        processedUrl: uploadResult.eager?.[0]?.secure_url || null,
        publicId: uploadResult.public_id,
        // Story 2.4: AI categorization
        suggestedCategory,
        categoryConfidence,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    // ===========================================
    // Error Handling - Sanitized responses
    // ===========================================

    // Known client errors - return user-friendly message
    if (error instanceof ClientError) {
      logError('client_error', error);
      return new Response(JSON.stringify({ success: false, error: error.userMessage }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.statusCode,
      });
    }

    // Unknown errors - log details, return generic message
    logError('unknown_error', error);
    return new Response(JSON.stringify({ success: false, error: ERROR_MESSAGES.SERVER_ERROR }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// =============================================================================
// Cloudinary Upload
// =============================================================================

/**
 * Upload image to Cloudinary with background removal
 */
async function uploadToCloudinary({
  imageBase64,
  mimeType,
  publicId,
}: {
  imageBase64: string;
  mimeType: string;
  publicId: string;
}): Promise<CloudinaryUploadResponse> {
  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

  // Prepare the data URI
  const dataUri = `data:${mimeType};base64,${imageBase64}`;

  // Generate signature for authenticated upload
  const timestamp = Math.floor(Date.now() / 1000);

  // Parameters for signature (alphabetically sorted - CRITICAL for signature validation)
  // Story 2.4: Added categorization=imagga_tagging for AI auto-tagging
  const paramsToSign = [
    `categorization=imagga_tagging`, // Story 2.4: AI categorization
    `eager=e_background_removal`,
    `folder=dressing-intelligent`,
    `public_id=${publicId}`,
    `timestamp=${timestamp}`,
  ].join('&');

  // Create signature using SHA-1
  const signatureString = paramsToSign + CLOUDINARY_API_SECRET;
  const encoder = new TextEncoder();
  const data = encoder.encode(signatureString);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  // Prepare form data
  const formData = new FormData();
  formData.append('file', dataUri);
  formData.append('public_id', publicId);
  formData.append('folder', 'dressing-intelligent');
  formData.append('timestamp', timestamp.toString());
  formData.append('api_key', CLOUDINARY_API_KEY);
  formData.append('signature', signature);
  formData.append('categorization', 'imagga_tagging'); // Story 2.4: AI categorization
  formData.append('eager', 'e_background_removal');

  // Upload with timeout (8s to leave buffer for client's 10s timeout)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      logError('cloudinary', new Error('Upload failed'), { errorData });
      throw new ClientError(ERROR_MESSAGES.SERVER_ERROR, 500);
    }

    const result: CloudinaryUploadResponse = await response.json();
    return result;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ClientError(ERROR_MESSAGES.UPLOAD_TIMEOUT, 408);
    }

    // Re-throw ClientError as-is
    if (error instanceof ClientError) {
      throw error;
    }

    // Wrap unknown errors
    logError('cloudinary_unknown', error);
    throw new ClientError(ERROR_MESSAGES.SERVER_ERROR, 500);
  }
}
