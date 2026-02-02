-- ============================================
-- Migration: switch_active_profile RPC Function
-- Story 1.7: Switch Entre Profils
-- ============================================
-- Date: 2026-02-02
-- Description:
--   Creates an explicit RPC function for switching active profile.
--   While the trigger ensure_single_active_profile handles the logic,
--   this RPC provides a cleaner atomic API and better error handling.

-- ============================================
-- FUNCTION: switch_active_profile
-- ============================================

CREATE OR REPLACE FUNCTION switch_active_profile(
  p_user_id UUID,
  p_new_profile_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_previous_profile_id UUID;
  v_profile_exists BOOLEAN;
  v_result JSONB;
BEGIN
  -- Verify the profile exists and belongs to the user
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_new_profile_id AND user_id = p_user_id
  ) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    RAISE EXCEPTION 'Profile not found or not owned by user'
      USING ERRCODE = 'P0002'; -- no_data_found
  END IF;

  -- Get the currently active profile (for return value)
  SELECT id INTO v_previous_profile_id
  FROM profiles
  WHERE user_id = p_user_id AND is_active = true
  LIMIT 1;

  -- Désactiver tous les profils de l'utilisateur
  UPDATE profiles
  SET is_active = false, updated_at = NOW()
  WHERE user_id = p_user_id AND is_active = true;

  -- Activer le nouveau profil
  UPDATE profiles
  SET is_active = true, updated_at = NOW()
  WHERE id = p_new_profile_id AND user_id = p_user_id;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'previous_profile_id', v_previous_profile_id,
    'new_profile_id', p_new_profile_id
  );

  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION switch_active_profile(UUID, UUID) TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON FUNCTION switch_active_profile IS
  'Atomically switches the active profile for a user. Returns previous and new profile IDs.';
