-- ============================================
-- Migration: Create clothes-photos storage bucket + RLS
-- Story 2.7: Upload et Stockage Photo
-- ============================================
-- Date: 2026-02-04
-- Description:
--   1. Create clothes-photos storage bucket (private, 10MB, image types)
--   2. Set up RLS policies for INSERT/SELECT/UPDATE/DELETE
--   Path structure: {user_id}/{timestamp}_{hex}.jpg

-- ============================================
-- PART 1: CREATE CLOTHES-PHOTOS STORAGE BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clothes-photos',
  'clothes-photos',
  false,
  10485760, -- 10MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PART 2: RLS POLICIES FOR CLOTHES-PHOTOS STORAGE
-- ============================================

-- Policy: Users can upload their own photos
-- Path structure enforces {user_id}/ prefix via foldername check
CREATE POLICY "Users can upload their own photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'clothes-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own photos
CREATE POLICY "Users can view their own photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'clothes-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own photos
CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'clothes-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own photos
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'clothes-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
