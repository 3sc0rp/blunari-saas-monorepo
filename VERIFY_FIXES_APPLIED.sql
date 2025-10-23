-- ============================================================================
-- QUICK VERIFICATION - Did the fixes apply?
-- Run this to see if the security fixes worked
-- ============================================================================

-- Check 1: Does the service role policy exist?
SELECT 
  tablename,
  policyname,
  'Service role policy' as policy_type,
  CASE 
    WHEN policyname = 'Service role can read all employees' THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM pg_policies
WHERE tablename = 'employees'
AND policyname = 'Service role can read all employees';

-- Expected: 1 row with status = '✅ EXISTS'
-- If 0 rows: Policy not created, script didn't run successfully

-- Check 2: Can we see the admin record?
SELECT 
  user_id,
  email,
  role,
  status,
  '✅ Admin record visible' as note
FROM employees
WHERE user_id = '7d68eada-5b32-419f-aef8-f15afac43ed0';

-- Expected: 1 row showing SUPER_ADMIN

-- Check 3: What's the actual error from Edge Function logs?
-- You need to check this manually:
-- Go to: Supabase Dashboard → Edge Functions → tenant-provisioning → Logs
-- Look for the most recent invocation
-- Copy the error message here

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Check the results above';
  RAISE NOTICE '2. If policy is missing, re-run FIX_ALL_SECURITY_ISSUES.sql';
  RAISE NOTICE '3. Check Edge Function logs for detailed error';
  RAISE NOTICE '4. Logout and login again to refresh session';
  RAISE NOTICE '================================================';
END $$;
