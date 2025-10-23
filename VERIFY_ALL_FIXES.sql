-- ============================================================================
-- COMPREHENSIVE VERIFICATION - Check All Fixes Applied
-- Run this to verify all authorization fixes worked correctly
-- ============================================================================

SELECT '========================================' as separator;
SELECT 'VERIFICATION RESULTS' as title;
SELECT '========================================' as separator;

-- ============================================================================
-- CHECK 1: Admin user in profiles table
-- ============================================================================

SELECT '1️⃣ ADMIN IN PROFILES TABLE' as check_name;

SELECT 
  user_id,
  email,
  role,
  onboarding_completed,
  created_at,
  CASE 
    WHEN role = 'admin' THEN '✅ CORRECT (lowercase admin)'
    WHEN role = 'SUPER_ADMIN' THEN '⚠️  UPPERCASE (needs to be lowercase "admin" for manage-tenant-credentials)'
    ELSE '❌ WRONG ROLE'
  END as status
FROM profiles
WHERE user_id = '7d68eada-5b32-419f-aef8-f15afac43ed0';

-- Expected: 1 row with role='admin' (lowercase)

-- ============================================================================
-- CHECK 2: Admin user in employees table (should already exist)
-- ============================================================================

SELECT '2️⃣ ADMIN IN EMPLOYEES TABLE' as check_name;

SELECT 
  user_id,
  email,
  role,
  status,
  CASE 
    WHEN role IN ('SUPER_ADMIN', 'ADMIN') AND status = 'ACTIVE' THEN '✅ CORRECT'
    ELSE '❌ WRONG'
  END as status_check
FROM employees
WHERE user_id = '7d68eada-5b32-419f-aef8-f15afac43ed0';

-- Expected: 1 row with role='SUPER_ADMIN' and status='ACTIVE'

-- ============================================================================
-- CHECK 3: provision_tenant_atomic function accepts lowercase roles
-- ============================================================================

SELECT '3️⃣ PROVISION_TENANT_ATOMIC UPDATED' as check_name;

SELECT 
  proname as function_name,
  prosrc LIKE '%UPPER(role)%' as accepts_case_insensitive,
  prosrc LIKE '%profiles%' as checks_profiles_table,
  prosrc LIKE '%employees%' as checks_employees_table,
  CASE 
    WHEN prosrc LIKE '%UPPER(role)%' AND prosrc LIKE '%profiles%' AND prosrc LIKE '%employees%' THEN '✅ UPDATED CORRECTLY'
    WHEN prosrc LIKE '%UPPER(role)%' THEN '⚠️  Partially updated'
    ELSE '❌ NOT UPDATED'
  END as status
FROM pg_proc
WHERE proname = 'provision_tenant_atomic';

-- Expected: accepts_case_insensitive=true, checks both tables, status='✅ UPDATED CORRECTLY'

-- ============================================================================
-- CHECK 4: No broken security triggers remain
-- ============================================================================

SELECT '4️⃣ SECURITY TRIGGERS CLEANED UP' as check_name;

SELECT 
  trigger_name,
  event_object_table,
  '❌ BROKEN TRIGGER STILL EXISTS' as status
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('profiles', 'employees', 'tenants')
  AND (
    trigger_name LIKE '%audit%' 
    OR trigger_name LIKE '%security%'
    OR trigger_name LIKE '%log_role%'
  );

-- Expected: 0 rows (all broken triggers removed)
-- If any rows: Those triggers need to be dropped

-- ============================================================================
-- CHECK 5: Test authorization logic manually
-- ============================================================================

SELECT '5️⃣ TEST AUTHORIZATION LOGIC' as check_name;

-- Test profiles table check (for manage-tenant-credentials)
SELECT 
  'profiles check' as check_type,
  COUNT(*) as found,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ WILL PASS (manage-tenant-credentials)'
    ELSE '❌ WILL FAIL (manage-tenant-credentials)'
  END as status
FROM profiles
WHERE user_id = '7d68eada-5b32-419f-aef8-f15afac43ed0'
  AND role IN ('admin', 'owner');

-- Test employees table check (for tenant-provisioning fallback)
SELECT 
  'employees check' as check_type,
  COUNT(*) as found,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ WILL PASS (tenant-provisioning fallback)'
    ELSE '❌ WILL FAIL'
  END as status
FROM employees
WHERE user_id = '7d68eada-5b32-419f-aef8-f15afac43ed0'
  AND role IN ('SUPER_ADMIN', 'ADMIN')
  AND status = 'ACTIVE';

-- Test case-insensitive check (for provision_tenant_atomic)
SELECT 
  'case-insensitive check' as check_type,
  COUNT(*) as found,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ WILL PASS (provision_tenant_atomic with UPPER)'
    ELSE '❌ WILL FAIL'
  END as status
FROM profiles
WHERE user_id = '7d68eada-5b32-419f-aef8-f15afac43ed0'
  AND UPPER(role) IN ('ADMIN', 'OWNER', 'SUPER_ADMIN');

-- ============================================================================
-- SUMMARY AND NEXT STEPS
-- ============================================================================

DO $$
DECLARE
  profile_exists BOOLEAN;
  profile_role TEXT;
  employee_exists BOOLEAN;
  function_updated BOOLEAN;
BEGIN
  -- Check if profile exists with correct role
  SELECT EXISTS(
    SELECT 1 FROM profiles 
    WHERE user_id = '7d68eada-5b32-419f-aef8-f15afac43ed0' 
    AND role = 'admin'
  ) INTO profile_exists;
  
  -- Get actual role
  SELECT role INTO profile_role FROM profiles 
  WHERE user_id = '7d68eada-5b32-419f-aef8-f15afac43ed0';
  
  -- Check employee exists
  SELECT EXISTS(
    SELECT 1 FROM employees 
    WHERE user_id = '7d68eada-5b32-419f-aef8-f15afac43ed0'
    AND status = 'ACTIVE'
  ) INTO employee_exists;
  
  -- Check function updated
  SELECT EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'provision_tenant_atomic'
    AND prosrc LIKE '%UPPER(role)%'
  ) INTO function_updated;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  IF profile_exists AND employee_exists AND function_updated THEN
    RAISE NOTICE '✅ ALL FIXES APPLIED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Logout and login again to refresh your session';
    RAISE NOTICE '2. Try creating a tenant - should work now';
    RAISE NOTICE '3. Try updating tenant email - should work now';
    RAISE NOTICE '4. Try accessing tenant features - should work now';
  ELSE
    RAISE NOTICE '⚠️  SOME FIXES NOT APPLIED:';
    RAISE NOTICE '';
    
    IF NOT profile_exists THEN
      RAISE NOTICE '❌ Admin not in profiles table with role=admin';
      IF profile_role IS NULL THEN
        RAISE NOTICE '   → Run: INSERT INTO profiles (user_id, email, role, onboarding_completed) VALUES (''7d68eada-5b32-419f-aef8-f15afac43ed0'', ''drood.tech@gmail.com'', ''admin'', true)';
      ELSE
        RAISE NOTICE '   → Current role: %. Need to update to ''admin''', profile_role;
        RAISE NOTICE '   → Run: UPDATE profiles SET role = ''admin'' WHERE user_id = ''7d68eada-5b32-419f-aef8-f15afac43ed0''';
      END IF;
    ELSE
      RAISE NOTICE '✅ Admin in profiles table';
    END IF;
    
    IF NOT employee_exists THEN
      RAISE NOTICE '❌ Admin not in employees table';
      RAISE NOTICE '   → This should already exist. Check your admin setup.';
    ELSE
      RAISE NOTICE '✅ Admin in employees table';
    END IF;
    
    IF NOT function_updated THEN
      RAISE NOTICE '❌ provision_tenant_atomic not updated';
      RAISE NOTICE '   → Re-run the function update part of FIX_ALL_EDGE_FUNCTION_AUTH.sql';
    ELSE
      RAISE NOTICE '✅ provision_tenant_atomic updated';
    END IF;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
