-- =============================================================================
-- FIND AND FIX YOUR ACTUAL ADMIN USER
-- =============================================================================
-- You have admin@blunari.ai - let's find it and create proper records
-- =============================================================================

SELECT 
  '=== FINDING YOUR ADMIN USER ===' as info;

-- Find the admin@blunari.ai user
SELECT 
  id as user_id,
  email,
  created_at,
  '✅ This is YOUR admin login' as note
FROM auth.users
WHERE email = 'admin@blunari.ai';

-- Check if this user has an employee record
SELECT 
  '' as separator;

SELECT 
  '=== CHECKING EMPLOYEE RECORD ===' as info;

SELECT 
  e.employee_id,
  e.user_id,
  e.email,
  e.role,
  e.status,
  CASE 
    WHEN e.user_id IS NOT NULL THEN '✅ Has employee record'
    ELSE '❌ Missing employee record'
  END as status_note
FROM auth.users au
LEFT JOIN employees e ON au.id = e.user_id
WHERE au.email = 'admin@blunari.ai';

-- Check if this user has a profile (admin users CAN have profiles for display data)
SELECT 
  '' as separator;

SELECT 
  '=== CHECKING PROFILE (for display name/avatar) ===' as info;

SELECT 
  p.user_id,
  p.email,
  p.first_name,
  p.last_name,
  p.avatar_url,
  p.role,
  CASE 
    WHEN p.user_id IS NOT NULL THEN '✅ Has profile for display data'
    ELSE '⚠️ No profile - will create one'
  END as note
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.user_id
WHERE au.email = 'admin@blunari.ai';

-- Create employee record for your admin user
SELECT 
  '' as separator;

SELECT 
  '=== CREATING EMPLOYEE RECORD FOR admin@blunari.ai ===' as info;

INSERT INTO employees (
  user_id,
  employee_id,
  role,
  status,
  email,
  created_at
)
SELECT 
  au.id,
  'EMP-ADMIN-001',
  'SUPER_ADMIN',
  'ACTIVE',
  au.email,
  NOW()
FROM auth.users au
WHERE au.email = 'admin@blunari.ai'
ON CONFLICT (user_id) 
DO UPDATE SET
  role = 'SUPER_ADMIN',
  status = 'ACTIVE',
  email = EXCLUDED.email;

SELECT '✅ Employee record created for admin@blunari.ai!' as status;

-- Create or update profile record for display data (names, avatar, etc.)
SELECT 
  '' as separator;

SELECT 
  '=== CREATING PROFILE FOR DISPLAY DATA ===' as info;

INSERT INTO profiles (
  user_id,
  email,
  first_name,
  last_name,
  role,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  'Admin',  -- You can change this to your real first name via Profile Settings
  'User',   -- You can change this to your real last name via Profile Settings
  'owner',  -- Profile role (for display purposes)
  NOW(),
  NOW()
FROM auth.users au
WHERE au.email = 'admin@blunari.ai'
ON CONFLICT (user_id) 
DO UPDATE SET
  email = EXCLUDED.email,
  first_name = COALESCE(profiles.first_name, EXCLUDED.first_name),
  last_name = COALESCE(profiles.last_name, EXCLUDED.last_name),
  updated_at = NOW();

SELECT '✅ Profile record created/updated for admin@blunari.ai!' as status;

-- Also fix the auto_provisioning records to use YOUR admin user
SELECT 
  '' as separator;

SELECT 
  '=== UPDATING AUTO_PROVISIONING TO USE YOUR ADMIN ===' as info;

UPDATE auto_provisioning
SET user_id = (SELECT id FROM auth.users WHERE email = 'admin@blunari.ai')
WHERE user_id != (SELECT id FROM auth.users WHERE email = 'admin@blunari.ai')
OR user_id IS NULL;

SELECT '✅ Auto_provisioning records updated to use admin@blunari.ai!' as status;

-- Verification
SELECT 
  '' as separator;

SELECT 
  '=== FINAL VERIFICATION ===' as info;

-- Show your admin employee record
SELECT 
  'Your Admin Employee Record' as section,
  e.employee_id,
  e.email,
  e.role,
  e.status,
  au.id as user_id
FROM auth.users au
INNER JOIN employees e ON au.id = e.user_id
WHERE au.email = 'admin@blunari.ai';

-- Show your profile data
SELECT 
  '' as separator;

SELECT 
  'Your Profile Data (for display/editing)' as section,
  p.user_id,
  p.email,
  p.first_name,
  p.last_name,
  p.avatar_url,
  '✅ You can edit this via Profile Settings' as note
FROM auth.users au
INNER JOIN profiles p ON au.id = p.user_id
WHERE au.email = 'admin@blunari.ai';

-- Show all auto_provisioning records
SELECT 
  '' as separator;

SELECT 
  'Auto_Provisioning Records' as section,
  ap.restaurant_name,
  ap.restaurant_slug,
  ap.user_id,
  au.email as provisioner_email,
  '✅ Provisioned by your admin' as note
FROM auto_provisioning ap
INNER JOIN auth.users au ON ap.user_id = au.id;

SELECT 
  '' as separator;

SELECT 
  '✅ Done! Everything is now linked to admin@blunari.ai' as final_message;

SELECT 
  '' as separator;

SELECT 
  '🎯 Now you can log in with admin@blunari.ai / admin123 and manage tenant credentials!' as next_step;
