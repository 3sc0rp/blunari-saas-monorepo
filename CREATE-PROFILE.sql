-- =============================================================================
-- CREATE PROFILE FOR THE PROVISIONING USER
-- =============================================================================
-- This creates a profile for the user that owns the auto_provisioning records
-- =============================================================================

-- First, check if profile exists
SELECT 
  '=== CHECKING PROFILE ===' as info;

SELECT 
  user_id,
  email,
  first_name,
  last_name,
  role
FROM profiles
WHERE user_id = '7d68eada-5b32-419f-aef8-f15afac43ed0';

-- Get user info from auth
SELECT 
  '' as separator;

SELECT 
  '=== AUTH USER INFO ===' as info;

SELECT 
  id,
  email,
  raw_user_meta_data
FROM auth.users
WHERE id = '7d68eada-5b32-419f-aef8-f15afac43ed0';

-- Create the profile
SELECT 
  '' as separator;

SELECT 
  '=== CREATING/UPDATING PROFILE ===' as info;

INSERT INTO profiles (
  user_id,
  email,
  first_name,
  last_name,
  role
)
SELECT 
  au.id,
  au.email,
  'Admin',
  'User',
  'admin'
FROM auth.users au
WHERE au.id = '7d68eada-5b32-419f-aef8-f15afac43ed0'
ON CONFLICT (user_id) 
DO UPDATE SET
  email = EXCLUDED.email,
  role = CASE 
    WHEN profiles.role IS NULL THEN EXCLUDED.role
    ELSE profiles.role
  END,
  updated_at = NOW();

SELECT '✅ Profile created/updated!' as status;

-- Verify
SELECT 
  '' as separator;

SELECT 
  '=== VERIFICATION ===' as info;

SELECT 
  user_id,
  email,
  first_name,
  last_name,
  role,
  '✅ Profile exists!' as result
FROM profiles
WHERE user_id = '7d68eada-5b32-419f-aef8-f15afac43ed0';

SELECT '✅ Done!' as final_message;
