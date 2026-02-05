// =============================================================================
// Edge Function: process-clothing-image
// =============================================================================
// Traite les photos de vêtements:
// 1. Upload vers Cloudinary
// 2. Applique le background removal (détourage)
// 3. Retourne les URLs (originale + traitée)
//
// Sécurité: Les credentials Cloudinary sont dans Supabase Secrets
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Types
interface ProcessImageRequest {
  imageBase64: string;
  profileId: string;
  mimeType?: string;
}

interface ProcessImageResponse {
  success: boolean;
  data?: {
    originalUrl: string;
    processedUrl: string | null;
    publicId: string;
  };
  error?: string;
}

interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  eager?: Array<{ secure_url: string }>;
}

// Cloudinary credentials from Supabase Secrets
const CLOUDINARY_CLOUD_NAME = Deno.env.get('CLOUDINARY_CLOUD_NAME')!;
const CLOUDINARY_API_KEY = Deno.env.get('CLOUDINARY_API_KEY')!;
const CLOUDINARY_API_SECRET = Deno.env.get('CLOUDINARY_API_SECRET')!;

// Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req: Request): Promise<Response> => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate credentials are set
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary credentials not configured in Supabase Secrets');
    }

    // Parse request
    const {
      imageBase64,
      profileId,
      mimeType = 'image/jpeg',
    }: ProcessImageRequest = await req.json();

    if (!imageBase64 || !profileId) {
      throw new Error('Missing required fields: imageBase64, profileId');
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify profile belongs to user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_id')
      .eq('id', profileId)
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found or unauthorized');
    }

    // Generate unique public_id for Cloudinary
    const timestamp = Date.now();
    const publicId = `clothes/${user.id}/${profileId}/${timestamp}`;

    // Upload to Cloudinary with background removal
    const uploadResult = await uploadToCloudinary({
      imageBase64,
      mimeType,
      publicId,
    });

    const response: ProcessImageResponse = {
      success: true,
      data: {
        originalUrl: uploadResult.secure_url,
        processedUrl: uploadResult.eager?.[0]?.secure_url || null,
        publicId: uploadResult.public_id,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error processing image:', error);

    const response: ProcessImageResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 400,
    });
  }
});

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

  // Parameters for signature (alphabetically sorted)
  const paramsToSign = [
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
  formData.append('eager', 'e_background_removal'); // Background removal transformation

  // Upload with timeout (10s as per NFR-I2)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Cloudinary upload failed: ${JSON.stringify(errorData)}`);
    }

    const result: CloudinaryUploadResponse = await response.json();
    return result;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Cloudinary upload timeout (10s) - image saved without background removal');
    }
    throw error;
  }
}
