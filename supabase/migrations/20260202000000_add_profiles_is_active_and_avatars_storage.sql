-- ============================================
-- Migration: Add is_active to profiles + Create avatars storage bucket
-- Story 1.5: Création Premier Profil
-- ============================================
-- Date: 2026-02-02
-- Description:
--   1. Add is_active column to profiles table (AC#6)
--   2. Add name length constraint (AC#2: 2-30 characters)
--   3. Create avatars storage bucket (AC#3)
--   4. Set up RLS policies for avatars storage (NFR-S5)

-- ============================================
-- PART 1: ADD is_active COLUMN TO PROFILES
-- ============================================

-- Add is_active column (default false, first profile will be set to true)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;

-- Add constraint for display_name length (2-30 characters, AC#2)
-- Note: display_name is VARCHAR(100) in initial schema, we add a check constraint
ALTER TABLE profiles
ADD CONSTRAINT check_display_name_length
CHECK (char_length(display_name) >= 2 AND char_length(display_name) <= 30);

-- Create index for faster active profile lookup
CREATE INDEX IF NOT EXISTS idx_profiles_user_active
ON profiles(user_id, is_active)
WHERE is_active = true;

-- ============================================
-- PART 2: CREATE AVATARS STORAGE BUCKET
-- ============================================

-- Insert avatars bucket (private by default for security)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  false,
  10485760, -- 10MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PART 3: RLS POLICIES FOR AVATARS STORAGE
-- ============================================

-- Policy: Users can upload their own avatars
-- Path structure: {user_id}/{profile_id}.jpg
CREATE POLICY "Users can upload own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own avatars
CREATE POLICY "Users can view own avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own avatars
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own avatars
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- PART 4: FUNCTION TO ENSURE SINGLE ACTIVE PROFILE PER USER
-- ============================================

-- Function to automatically deactivate other profiles when one is activated
CREATE OR REPLACE FUNCTION ensure_single_active_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- If the new profile is being set to active
  IF NEW.is_active = true AND (OLD IS NULL OR OLD.is_active = false) THEN
    -- Deactivate all other profiles for this user
    UPDATE profiles
    SET is_active = false
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure single active profile
DROP TRIGGER IF EXISTS ensure_single_active_profile_trigger ON profiles;
CREATE TRIGGER ensure_single_active_profile_trigger
  BEFORE INSERT OR UPDATE OF is_active ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_active_profile();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON COLUMN profiles.is_active IS 'Indicates if this is the currently active profile for the user (only one per user)';
