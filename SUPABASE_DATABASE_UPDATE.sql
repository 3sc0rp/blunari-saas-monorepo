-- Comprehensive Supabase Database Update
-- Ensures all tables, policies, and structure are correct for tenant credential management
-- Run this in Supabase SQL Editor

BEGIN;

-- ============================================================================
-- PART 1: VERIFY TABLE STRUCTURE
-- ============================================================================

-- Ensure profiles table has correct columns
DO $$
BEGIN
  -- Check if user_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'profiles' 
    AND column_name = 'user_id'
  ) THEN
    -- Add user_id column if missing
    ALTER TABLE profiles ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
    RAISE NOTICE 'Added user_id column to profiles table';
  ELSE
    RAISE NOTICE 'profiles.user_id column exists ✓';
  END IF;

  -- Ensure email column exists and is indexed
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'profiles' 
    AND indexname = 'idx_profiles_email'
  ) THEN
    CREATE INDEX idx_profiles_email ON profiles(email);
    RAISE NOTICE 'Created email index on profiles table';
  ELSE
    RAISE NOTICE 'profiles email index exists ✓';
  END IF;
END $$;

-- ============================================================================
-- PART 2: UPDATE RLS POLICIES
-- ============================================================================

-- Drop and recreate RLS policies for profiles table to ensure service role access

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for edge functions)
DROP POLICY IF EXISTS "Service role has full access to profiles" ON profiles;
CREATE POLICY "Service role has full access to profiles" 
ON profiles FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Authenticated users can read their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" 
ON profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Authenticated users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

RAISE NOTICE 'Updated RLS policies for profiles table ✓';

-- ============================================================================
-- PART 3: UPDATE TENANTS TABLE POLICIES
-- ============================================================================

-- Ensure service role can update tenants table
DROP POLICY IF EXISTS "Service role has full access to tenants" ON tenants;
CREATE POLICY "Service role has full access to tenants" 
ON tenants FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

RAISE NOTICE 'Updated RLS policies for tenants table ✓';

-- ============================================================================
-- PART 4: UPDATE AUTO_PROVISIONING TABLE POLICIES
-- ============================================================================

-- Ensure service role can manage auto_provisioning records
DROP POLICY IF EXISTS "Service role has full access to auto_provisioning" ON auto_provisioning;
CREATE POLICY "Service role has full access to auto_provisioning" 
ON auto_provisioning FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

RAISE NOTICE 'Updated RLS policies for auto_provisioning table ✓';

-- ============================================================================
-- PART 5: DATA CONSISTENCY CHECK
-- ============================================================================

-- Update profiles where user_id is NULL but we can find the user by email
-- Note: This is a best-effort approach, actual user_id should come from auth.users
DO $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- Log profiles with missing user_id
  SELECT COUNT(*) INTO updated_count
  FROM profiles
  WHERE user_id IS NULL;
  
  IF updated_count > 0 THEN
    RAISE WARNING 'Found % profiles with NULL user_id - these need manual fixing via Auth API', updated_count;
  ELSE
    RAISE NOTICE 'All profiles have user_id set ✓';
  END IF;
END $$;

-- ============================================================================
-- PART 6: VERIFY FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Ensure proper foreign key from profiles.user_id to auth.users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY'
    AND table_name = 'profiles'
    AND constraint_name LIKE '%user_id%'
  ) THEN
    -- Add foreign key if missing
    ALTER TABLE profiles 
    ADD CONSTRAINT profiles_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;
    RAISE NOTICE 'Added foreign key constraint for profiles.user_id';
  ELSE
    RAISE NOTICE 'profiles.user_id foreign key exists ✓';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- PART 7: SUMMARY REPORT
-- ============================================================================

SELECT '===============================================' as "SUMMARY REPORT";

-- Table structure check
SELECT 
  'profiles table structure' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'profiles' AND column_name = 'user_id'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status;

-- RLS policies check
SELECT 
  'profiles RLS policies' as check_name,
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ PASS (' || COUNT(*) || ' policies)'
    ELSE '❌ FAIL (' || COUNT(*) || ' policies)'
  END as status
FROM pg_policies
WHERE tablename = 'profiles';

-- Tenants with admin email
SELECT 
  'Tenants with admin email' as check_name,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS (no tenants need fixing)'
    ELSE '⚠️  WARNING (' || COUNT(*) || ' tenants need unique credentials)'
  END as status
FROM tenants
WHERE email = 'admin@blunari.ai';

-- Profiles with NULL user_id
SELECT 
  'Profiles with NULL user_id' as check_name,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS (all profiles have user_id)'
    ELSE '⚠️  WARNING (' || COUNT(*) || ' profiles missing user_id)'
  END as status
FROM profiles
WHERE user_id IS NULL;

SELECT '===============================================' as "END REPORT";
