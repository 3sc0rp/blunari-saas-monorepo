-- ============================================================================
-- FIX ADMIN EMPLOYEE RECORD
-- ============================================================================
-- This ensures the admin employee record is properly created and linked
-- Run this if you're getting 500 errors after logging in
-- ============================================================================

-- Step 1: Check current state
SELECT 
  '🔍 BEFORE FIX' as status,
  e.id,
  e.user_id,
  e.email,
  e.role,
  e.status,
  u.email as auth_email
FROM public.employees e
LEFT JOIN auth.users u ON u.id = e.user_id
WHERE u.email = 'admin@blunari.ai';

-- Step 2: Delete existing employee record (if any)
DELETE FROM public.employees 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'admin@blunari.ai'
);

-- Step 3: Recreate employee record with correct data
INSERT INTO public.employees (
  id,
  user_id,
  email,
  first_name,
  last_name,
  role,
  status,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  u.id,
  u.email,
  'Admin',
  'User',
  'SUPER_ADMIN',
  'ACTIVE',
  now(),
  now()
FROM auth.users u
WHERE u.email = 'admin@blunari.ai';

-- Step 4: Verify the fix
SELECT 
  '✅ AFTER FIX' as status,
  e.id as employee_id,
  e.user_id,
  e.email,
  e.first_name,
  e.last_name,
  e.role,
  e.status,
  u.email as auth_email,
  u.id as auth_user_id,
  CASE 
    WHEN e.user_id = u.id THEN '✅ IDs Match'
    ELSE '❌ IDs Mismatch'
  END as id_match,
  CASE 
    WHEN e.role = 'SUPER_ADMIN' THEN '✅ Is SUPER_ADMIN'
    ELSE '❌ Not SUPER_ADMIN'
  END as role_check,
  CASE 
    WHEN e.status = 'ACTIVE' THEN '✅ Is ACTIVE'
    ELSE '❌ Not ACTIVE'
  END as status_check
FROM public.employees e
LEFT JOIN auth.users u ON u.id = e.user_id
WHERE u.email = 'admin@blunari.ai';

-- Step 5: Final verification
SELECT 
  '🎯 FINAL CHECK' as check_type,
  COUNT(*) as employee_count,
  MAX(CASE WHEN role = 'SUPER_ADMIN' THEN '✅' ELSE '❌' END) as has_super_admin,
  MAX(CASE WHEN status = 'ACTIVE' THEN '✅' ELSE '❌' END) as has_active
FROM public.employees
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'admin@blunari.ai'
);
