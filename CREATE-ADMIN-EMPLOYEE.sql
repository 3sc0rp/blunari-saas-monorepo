-- =============================================================================
-- CREATE EMPLOYEE RECORD FOR ADMIN USER
-- =============================================================================
-- This is the correct fix - you need an EMPLOYEE record, not just a profile
-- Employees are for admin dashboard, profiles are for client dashboard
-- =============================================================================

SELECT 
  '=== CHECKING CURRENT EMPLOYEES ===' as info;

-- Check if any employees exist
SELECT 
  employee_id,
  user_id,
  role,
  status,
  email
FROM employees
ORDER BY created_at DESC;

-- Check if employee exists for your user
SELECT 
  '' as separator;

SELECT 
  '=== CHECKING FOR ADMIN EMPLOYEE ===' as info;

SELECT 
  COUNT(*) as admin_employee_count
FROM employees
WHERE user_id = '7d68eada-5b32-419f-aef8-f15afac43ed0';

-- Get your auth user info
SELECT 
  '' as separator;

SELECT 
  '=== YOUR AUTH USER ===' as info;

SELECT 
  id,
  email,
  raw_user_meta_data
FROM auth.users
WHERE id = '7d68eada-5b32-419f-aef8-f15afac43ed0';

-- Create the employee record
SELECT 
  '' as separator;

SELECT 
  '=== CREATING EMPLOYEE RECORD ===' as info;

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
  'EMP-' || SUBSTRING(au.id::text, 1, 8),
  'SUPER_ADMIN',
  'ACTIVE',
  au.email,
  NOW()
FROM auth.users au
WHERE au.id = '7d68eada-5b32-419f-aef8-f15afac43ed0'
ON CONFLICT (user_id) 
DO UPDATE SET
  role = 'SUPER_ADMIN',
  status = 'ACTIVE';

SELECT '✅ Employee record created!' as status;

-- Verify
SELECT 
  '' as separator;

SELECT 
  '=== VERIFICATION ===' as info;

SELECT 
  employee_id,
  user_id,
  email,
  role,
  status,
  '✅ This is YOU - the admin!' as note
FROM employees
WHERE user_id = '7d68eada-5b32-419f-aef8-f15afac43ed0';

SELECT 
  '' as separator;

SELECT 
  '✅ Done! You now have SUPER_ADMIN access to manage tenant credentials.' as final_message;

-- Summary
SELECT 
  '' as separator;

SELECT 
  '=== SUMMARY ===' as info;

SELECT 
  'employees table' as table_name,
  'Admin dashboard users (YOU)' as purpose,
  'Manage tenants, users, settings' as access;

SELECT 
  'profiles table' as table_name,
  'Client dashboard users (restaurant owners)' as purpose,
  'Manage their own restaurant' as access;
