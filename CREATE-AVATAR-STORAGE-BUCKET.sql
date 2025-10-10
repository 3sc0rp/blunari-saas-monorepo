-- =============================================================================
-- CREATE AVATARS STORAGE BUCKET FOR PROFILE PICTURES
-- =============================================================================
-- This creates a Supabase Storage bucket for user avatars with public access
-- =============================================================================

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,  -- Public bucket so avatars can be accessed without auth
  2097152,  -- 2MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- Set up storage policies for avatars bucket
-- First, drop existing policies if they exist to avoid conflicts

DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Public Access" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
  DROP POLICY IF EXISTS "Avatar public access" ON storage.objects;
  DROP POLICY IF EXISTS "Avatar upload access" ON storage.objects;
  DROP POLICY IF EXISTS "Avatar update access" ON storage.objects;
  DROP POLICY IF EXISTS "Avatar delete access" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Policy: Anyone can view avatars (public read)
CREATE POLICY "Avatar public access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Policy: Authenticated users can upload their own avatar
CREATE POLICY "Avatar upload access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'avatars'
);

-- Policy: Users can update their own avatar
CREATE POLICY "Avatar update access"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- Policy: Users can delete their own avatar
CREATE POLICY "Avatar delete access"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

-- Verify bucket creation
SELECT 
  '=== AVATARS BUCKET STATUS ===' as info;

SELECT 
  id as bucket_id,
  name,
  public,
  file_size_limit as size_limit_bytes,
  allowed_mime_types,
  '✅ Bucket configured successfully' as status
FROM storage.buckets
WHERE id = 'avatars';

-- Show storage policies
SELECT 
  '' as separator;

SELECT 
  '=== STORAGE POLICIES ===' as info;

SELECT 
  policyname as policy_name,
  cmd as command_type,
  qual as policy_definition,
  '✅ Policy active' as status
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%avatar%';

SELECT 
  '' as separator;

SELECT 
  '✅ Avatar storage bucket is ready!' as final_message;

SELECT 
  '' as separator;

SELECT 
  '📝 Users can now upload avatars up to 2MB in size' as note;
