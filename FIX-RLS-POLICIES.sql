-- =============================================================================
-- FIX RLS POLICIES FOR AUTO_PROVISIONING TABLE
-- =============================================================================
-- This ensures the auto_provisioning table has proper policies for access
-- Copy and paste this into Supabase SQL Editor and run it
-- =============================================================================

-- First, let's see what policies exist
SELECT 
  '=== CURRENT RLS POLICIES ===' as info;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command
FROM pg_policies
WHERE tablename = 'auto_provisioning'
AND schemaname = 'public';

-- Check if RLS is enabled
SELECT 
  '' as separator;

SELECT 
  '=== RLS STATUS ===' as info;

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'auto_provisioning'
AND schemaname = 'public';

-- Now let's fix the policies
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
    WHERE tablename = 'auto_provisioning' 
    AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON auto_provisioning', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- Create a policy that allows service role full access
CREATE POLICY "Service role has full access to auto_provisioning"
ON auto_provisioning
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create a policy that allows authenticated users to read all records
-- (This is needed for the Edge Function to work)
CREATE POLICY "Authenticated users can read auto_provisioning"
ON auto_provisioning
FOR SELECT
TO authenticated
USING (true);

-- Also allow anon users to read (for testing)
CREATE POLICY "Public can read auto_provisioning"
ON auto_provisioning
FOR SELECT
TO anon
USING (true);

SELECT '✅ Policies created!' as status;

-- Verify the new policies
SELECT 
  '' as separator;

SELECT 
  '=== NEW POLICIES ===' as info;

SELECT 
  policyname,
  roles,
  cmd as command,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'auto_provisioning'
AND schemaname = 'public';

-- Test query to see if records are visible
SELECT 
  '' as separator;

SELECT 
  '=== TEST: Can we see the records now? ===' as info;

SELECT 
  ap.id,
  ap.restaurant_name,
  ap.restaurant_slug,
  ap.user_id,
  ap.tenant_id,
  ap.login_email,
  ap.status,
  '✅ Visible!' as result
FROM auto_provisioning ap;

SELECT 
  '' as separator;

SELECT 
  '✅ Done! RLS policies fixed. Records should be visible now.' as final_message;
