/**
 * Edge Function: delete-account
 * Story 1.10: Suppression de Compte
 *
 * Deletes a user account and all associated data (RGPD compliance).
 * This function requires service_role key for auth.admin.deleteUser().
 *
 * Flow:
 * 1. Verify JWT from Authorization header
 * 2. Store user email for confirmation
 * 3. Delete files from 'avatars' storage bucket
 * 4. Delete files from 'clothes-photos' storage bucket
 * 5. Delete profiles (CASCADE handles clothes, recommendations)
 * 6. Delete user_settings and user_consents (CASCADE from auth.users)
 * 7. Delete user from auth using admin API
 * 8. Send confirmation email (AC#3)
 *
 * AC#2: Password correct et confirmation → suppression complète
 * AC#3: Email confirmation envoyé automatiquement
 * NFR-S10: RGPD 30j compliance
 *
 * Environment variables required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - RESEND_API_KEY (for confirmation emails, optional - graceful degradation)
 * - EMAIL_FROM (optional, defaults to "Dressing Intelligent <noreply@dressingintelligent.com>")
 *
 * Note: console.* is used for logging as Sentry is not available in Deno Edge Functions.
 * Supabase captures these logs in the Edge Functions dashboard.
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// CORS headers for preflight requests
// Security: Use ALLOWED_ORIGIN env var in production
const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN');
if (!allowedOrigin) {
  console.warn('[SECURITY] ALLOWED_ORIGIN not set - using wildcard. Set this in production!');
}
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Send account deletion confirmation email via Resend (AC#3)
 */
async function sendDeletionConfirmationEmail(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const emailFrom =
    Deno.env.get('EMAIL_FROM') || 'Dressing Intelligent <noreply@dressingintelligent.com>';

  // If no Resend API key, skip email (graceful degradation - Issue #1)
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not configured - skipping confirmation email');
    return { success: true };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [email],
        subject: 'Confirmation de suppression de votre compte',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1f2937;">Compte supprimé</h1>
            <p style="color: #4b5563; font-size: 16px;">
              Bonjour,
            </p>
            <p style="color: #4b5563; font-size: 16px;">
              Nous confirmons que votre compte Dressing Intelligent et toutes vos données associées
              ont été supprimés de nos serveurs conformément à votre demande.
            </p>
            <p style="color: #4b5563; font-size: 16px;">
              Cette action est irréversible. Les données supprimées incluent :
            </p>
            <ul style="color: #4b5563; font-size: 16px;">
              <li>Vos profils et informations personnelles</li>
              <li>Vos vêtements et photos</li>
              <li>Vos recommandations et historique</li>
              <li>Vos paramètres et préférences</li>
            </ul>
            <p style="color: #4b5563; font-size: 16px;">
              Conformément au RGPD, toutes vos données ont été définitivement effacées.
            </p>
            <p style="color: #4b5563; font-size: 16px;">
              Nous espérons vous revoir bientôt !
            </p>
            <p style="color: #9ca3af; font-size: 14px; margin-top: 30px;">
              L'équipe Dressing Intelligent
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Resend API error: ${errorText}` };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Email sending failed',
    };
  }
}

/**
 * Delete all files for a user from a storage bucket (recursive for subfolders)
 * Issue #5 fix: Now handles nested folders like userId/thumbnails/
 */
async function deleteStorageFiles(
  supabaseAdmin: ReturnType<typeof createClient>,
  bucketName: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Recursive function to collect all file paths
    async function collectFilePaths(prefix: string): Promise<string[]> {
      const { data: items, error: listError } = await supabaseAdmin.storage
        .from(bucketName)
        .list(prefix);

      if (listError) {
        // Bucket might not exist or be empty - not an error
        if (
          listError.message.includes('not found') ||
          listError.message.includes('does not exist')
        ) {
          return [];
        }
        throw new Error(listError.message);
      }

      if (!items || items.length === 0) {
        return [];
      }

      const paths: string[] = [];

      for (const item of items) {
        const itemPath = `${prefix}/${item.name}`;

        // Check if item is a folder (no metadata means it's a folder)
        if (item.metadata === null) {
          // Recursively collect files from subfolder
          const subPaths = await collectFilePaths(itemPath);
          paths.push(...subPaths);
        } else {
          // It's a file
          paths.push(itemPath);
        }
      }

      return paths;
    }

    // Collect all file paths recursively
    const allFilePaths = await collectFilePaths(userId);

    if (allFilePaths.length === 0) {
      return { success: true };
    }

    // Delete all files in batches of 100 (Supabase limit)
    const batchSize = 100;
    for (let i = 0; i < allFilePaths.length; i += batchSize) {
      const batch = allFilePaths.slice(i, i + batchSize);
      const { error: deleteError } = await supabaseAdmin.storage.from(bucketName).remove(batch);

      if (deleteError) {
        console.error(`Failed to delete batch ${i / batchSize + 1}: ${deleteError.message}`);
        // Continue with other batches
      }
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
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

    // Create admin client with service role
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
    const userEmail = user.email; // Store email before deletion for confirmation

    // Step 1: Delete files from 'avatars' bucket
    const avatarsResult = await deleteStorageFiles(supabaseAdmin, 'avatars', userId);
    if (!avatarsResult.success) {
      console.error(`Failed to delete avatars: ${avatarsResult.error}`);
      // Continue anyway - don't block deletion for storage issues
    }

    // Step 2: Delete files from 'clothes-photos' bucket
    const clothesResult = await deleteStorageFiles(supabaseAdmin, 'clothes-photos', userId);
    if (!clothesResult.success) {
      console.error(`Failed to delete clothes-photos: ${clothesResult.error}`);
      // Continue anyway - don't block deletion for storage issues
    }

    // Step 3: Delete profiles (CASCADE will handle clothes, recommendations)
    // Note: We use admin client to bypass RLS for complete deletion
    const { error: profilesError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', userId);

    if (profilesError) {
      console.error(`Failed to delete profiles: ${profilesError.message}`);
      // Continue anyway - auth.admin.deleteUser will cascade
    }

    // Step 4: Delete user from auth (this cascades to user_settings, user_consents)
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      return new Response(
        JSON.stringify({
          error: 'Failed to delete account',
          details: deleteUserError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Step 5: Send confirmation email (AC#3)
    if (userEmail) {
      const emailResult = await sendDeletionConfirmationEmail(userEmail);
      if (!emailResult.success) {
        // Log but don't fail - deletion was successful
        console.error(`Failed to send confirmation email: ${emailResult.error}`);
      }
    }

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account deleted successfully',
        emailSent: !!userEmail,
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
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
