-- =============================================================================
-- FIX RLS POLICIES FOR PROFILES TABLE
-- =============================================================================
-- Allow read access to profiles for authenticated and anon users
-- =============================================================================

SELECT 
  '=== CURRENT PROFILES RLS POLICIES ===' as info;

SELECT 
  policyname,
  roles,
  cmd as command
FROM pg_policies
WHERE tablename = 'profiles'
AND schemaname = 'public';

-- Drop all existing policies and create new ones
SELECT 
  '' as separator;

SELECT 
  '=== FIXING POLICIES ===' as info;

-- Drop ALL existing policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- Create policies that allow read access
CREATE POLICY "Service role has full access to profiles"
ON profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can read all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Anon users can read profiles"
ON profiles
FOR SELECT
TO anon
USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

SELECT '✅ Policies created!' as status;

-- Verify the new policies
SELECT 
  '' as separator;

SELECT 
  '=== NEW PROFILES POLICIES ===' as info;

SELECT 
  policyname,
  roles,
  cmd as command
FROM pg_policies
WHERE tablename = 'profiles'
AND schemaname = 'public';

-- Test if profiles are now visible
SELECT 
  '' as separator;

SELECT 
  '=== TEST: Are profiles visible now? ===' as info;

SELECT 
  user_id,
  email,
  first_name,
  last_name,
  role,
  '✅ Visible!' as result
FROM profiles
ORDER BY created_at DESC
LIMIT 5;

SELECT 
  '' as separator;

SELECT 
  '✅ Done! Profiles RLS policies fixed.' as final_message;
