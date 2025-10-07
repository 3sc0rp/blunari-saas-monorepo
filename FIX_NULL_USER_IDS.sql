-- 🔧 FIX SCRIPT FOR NULL user_id PROFILES
-- This script helps fix profiles that have NULL user_id
-- Run this AFTER running DIAGNOSTIC_500_ERROR.sql to identify issues

-- ============================================================================
-- IMPORTANT: READ BEFORE RUNNING
-- ============================================================================
-- This script identifies profiles with NULL user_id but CANNOT automatically
-- fix them because user_id must come from Supabase Auth (auth.users table).
-- 
-- You have 3 options to fix each profile:
-- 
-- Option 1: Use Admin Dashboard "Regenerate Credentials" (RECOMMENDED)
--   - Go to Tenants page
--   - Click on the tenant
--   - Go to "User Management" tab
--   - Click "Regenerate Credentials"
--   - This creates a new auth user and links everything
--
-- Option 2: Create auth users manually via edge function
--   - The tenant-provisioning function can create users
--   - Re-run provisioning for affected tenants
--
-- Option 3: Manual SQL (ADVANCED - requires auth user IDs)
--   - Create auth users via Supabase Auth Admin API
--   - Then update profiles with the new user_id
-- ============================================================================

BEGIN;

-- Step 1: Identify all profiles with NULL user_id
CREATE TEMP TABLE profiles_needing_fix AS
SELECT 
  p.id as profile_id,
  p.email,
  t.id as tenant_id,
  t.name as tenant_name
FROM profiles p
LEFT JOIN tenants t ON t.email = p.email
WHERE p.user_id IS NULL
  AND p.email IS NOT NULL
  AND p.email != '';

-- Show what needs fixing
SELECT 
  '🔍 PROFILES THAT NEED FIXING' as "REPORT",
  COUNT(*) as total_count
FROM profiles_needing_fix;

SELECT 
  profile_id,
  email,
  tenant_id,
  tenant_name,
  '❌ NULL user_id' as issue
FROM profiles_needing_fix
ORDER BY email;

-- Step 2: Show recommended action for each
SELECT 
  '💡 RECOMMENDED ACTIONS' as "INSTRUCTIONS",
  'Use Admin Dashboard "Regenerate Credentials" for each tenant' as action;

SELECT 
  tenant_name,
  email,
  'Go to Admin Dashboard → Tenants → ' || tenant_name || ' → User Management → Regenerate Credentials' as action_steps
FROM profiles_needing_fix
WHERE tenant_id IS NOT NULL
ORDER BY tenant_name;

-- Step 3: Cleanup
DROP TABLE profiles_needing_fix;

ROLLBACK; -- Don't commit anything, this is just a diagnostic

-- ============================================================================
-- ALTERNATIVE: LINK TO EXISTING AUTH USERS (if they exist)
-- ============================================================================
-- If you know the auth users exist but profiles just aren't linked,
-- you can try this approach:

-- WARNING: This requires knowing the correct user_id for each email
-- Run this only if you're sure the auth users exist

/*
-- Example: Update a single profile
UPDATE profiles 
SET user_id = (
  SELECT id FROM auth.users WHERE email = 'tenant@example.com' LIMIT 1
)
WHERE email = 'tenant@example.com'
  AND user_id IS NULL;

-- To bulk update ALL profiles where auth user exists:
-- (Uncomment to run - BE CAREFUL!)

UPDATE profiles p
SET user_id = au.id
FROM auth.users au
WHERE p.email = au.email
  AND p.user_id IS NULL;

-- After running, verify:
SELECT 
  COUNT(*) as profiles_still_with_null_user_id
FROM profiles 
WHERE user_id IS NULL;
*/

-- ============================================================================
-- SUMMARY
-- ============================================================================
SELECT 
  '📊 SUMMARY' as "REPORT",
  'Run DIAGNOSTIC_500_ERROR.sql first to see the issues' as step_1,
  'Use Admin Dashboard "Regenerate Credentials" for each affected tenant' as step_2,
  'Or uncomment the bulk UPDATE above if auth users already exist' as step_3,
  'Then test credential updates in the admin dashboard' as step_4;
