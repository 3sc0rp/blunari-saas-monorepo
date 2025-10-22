-- ============================================================================
-- VERIFICATION QUERIES
-- Run these in Supabase Dashboard after deploying the migration
-- ============================================================================

-- ============================================================================
-- STEP 1: Verify Functions Exist
-- ============================================================================

SELECT 
  proname AS function_name,
  pg_get_function_identity_arguments(oid) AS parameters,
  CASE 
    WHEN proname = 'provision_tenant_atomic' THEN '✅ Main provisioning function'
    WHEN proname = 'check_owner_email_availability' THEN '✅ Email validation function'
    WHEN proname = 'mark_provisioning_failed' THEN '✅ Error handling function'
  END AS description
FROM pg_proc 
WHERE proname IN (
  'provision_tenant_atomic', 
  'check_owner_email_availability',
  'mark_provisioning_failed'
)
AND pronamespace = 'public'::regnamespace
ORDER BY proname;

-- Expected: 3 rows

-- ============================================================================
-- STEP 2: Verify provisioning_requests Table Exists
-- ============================================================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'provisioning_requests'
ORDER BY ordinal_position;

-- Expected: Should show columns like id, idempotency_key, admin_user_id, tenant_slug, owner_email, status, etc.

-- ============================================================================
-- STEP 3: Verify tenants Table Schema
-- ============================================================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  CASE 
    WHEN column_name = 'owner_id' THEN '✅ Required for provisioning'
    WHEN column_name = 'email' THEN '✅ Required for contact info'
    WHEN column_name = 'status' THEN '✅ Tracks provisioning state'
    ELSE ''
  END AS notes
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'tenants'
AND column_name IN ('id', 'name', 'slug', 'owner_id', 'email', 'status')
ORDER BY ordinal_position;

-- Expected: Should show owner_id (nullable) and email columns

-- ============================================================================
-- STEP 4: Verify Constraints
-- ============================================================================

SELECT 
  constraint_name,
  constraint_type,
  CASE 
    WHEN constraint_name = 'tenant_must_have_owner' THEN '✅ Allows NULL owner_id during provisioning'
    WHEN constraint_name = 'tenants_slug_key' THEN '✅ Prevents duplicate slugs'
    WHEN constraint_name = 'tenants_email_unique' THEN '✅ Prevents duplicate emails'
    ELSE ''
  END AS description
FROM information_schema.table_constraints
WHERE table_schema = 'public'
AND table_name = 'tenants'
AND constraint_name IN ('tenant_must_have_owner', 'tenants_slug_key', 'tenants_email_unique')
ORDER BY constraint_name;

-- Expected: At least 2 rows (tenant_must_have_owner and tenants_slug_key)

-- ============================================================================
-- STEP 5: Test Email Availability Check
-- ============================================================================

-- Test with a unique email (should return available=true)
SELECT check_owner_email_availability('test-unique-' || extract(epoch from now())::TEXT || '@example.com') AS result;

-- Expected: { "available": true, "reason": null }

-- Test with existing admin email (should return available=false)
SELECT check_owner_email_availability(
  (SELECT email FROM auth.users LIMIT 1)
) AS result;

-- Expected: { "available": false, "reason": "Email is already registered in the system" }

-- ============================================================================
-- STEP 6: Check for Old provision_tenant Function
-- ============================================================================

SELECT 
  proname AS function_name,
  pg_get_function_identity_arguments(oid) AS parameters
FROM pg_proc 
WHERE proname = 'provision_tenant'
AND pronamespace = 'public'::regnamespace;

-- Expected: 0 rows (old function should be dropped)
-- If 1 row appears, run: DROP FUNCTION public.provision_tenant(UUID, TEXT, TEXT, TEXT, TEXT) CASCADE;

-- ============================================================================
-- STEP 7: Check for Orphaned Tenants
-- ============================================================================

-- Find tenants stuck in provisioning state
SELECT 
  id,
  name,
  slug,
  owner_id,
  status,
  created_at,
  (NOW() - created_at) AS stuck_duration
FROM tenants
WHERE status = 'provisioning'
AND created_at < NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;

-- Expected: 0 rows (no stuck tenants)
-- If rows appear, these are orphaned from failed provisions

-- ============================================================================
-- STEP 8: Check Provisioning History
-- ============================================================================

-- View recent provisioning attempts
SELECT 
  idempotency_key,
  admin_user_id,
  tenant_slug,
  owner_email,
  status,
  tenant_id,
  error_message,
  created_at,
  completed_at,
  (completed_at - created_at) AS duration
FROM provisioning_requests
ORDER BY created_at DESC
LIMIT 10;

-- Expected: Initially 0 rows (table is new)
-- After provisioning, should show records with status='completed' or 'failed'

-- ============================================================================
-- STEP 9: Verify RLS Policies on provisioning_requests
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression
FROM pg_policies
WHERE tablename = 'provisioning_requests'
ORDER BY policyname;

-- Expected: Policies allowing admins to view/insert provisioning_requests

-- ============================================================================
-- STEP 10: Test Complete Provisioning Flow (Manual Test)
-- ============================================================================

-- This should be tested via Admin Dashboard UI, but here's how to test DB functions directly:

/*
-- Generate test data
DO $$
DECLARE
  v_test_email TEXT := 'test-provision-' || extract(epoch from now())::TEXT || '@example.com';
  v_test_slug TEXT := 'test-tenant-' || extract(epoch from now())::TEXT;
  v_admin_id UUID := (SELECT id FROM auth.users WHERE email LIKE '%admin%' LIMIT 1);
  v_result JSONB;
BEGIN
  RAISE NOTICE 'Testing provisioning flow...';
  RAISE NOTICE 'Email: %', v_test_email;
  RAISE NOTICE 'Slug: %', v_test_slug;
  RAISE NOTICE 'Admin: %', v_admin_id;
  
  -- Test atomic provisioning
  SELECT provision_tenant_atomic(
    p_idempotency_key := gen_random_uuid(),
    p_admin_user_id := v_admin_id,
    p_tenant_name := 'Test Restaurant',
    p_tenant_slug := v_test_slug,
    p_owner_email := v_test_email,
    p_owner_password := 'TempPassword123!',
    p_tenant_data := '{
      "timezone": "America/New_York",
      "currency": "USD",
      "primary_phone": "+1234567890"
    }'::jsonb
  ) INTO v_result;
  
  RAISE NOTICE 'Result: %', v_result;
  
  IF v_result->>'success' = 'true' THEN
    RAISE NOTICE '✅ Provisioning succeeded!';
    RAISE NOTICE 'Tenant ID: %', v_result->>'tenant_id';
    RAISE NOTICE 'Owner ID: %', v_result->>'owner_id';
  ELSE
    RAISE NOTICE '❌ Provisioning failed';
  END IF;
END $$;
*/

-- ============================================================================
-- SUMMARY CHECKLIST
-- ============================================================================

DO $$
DECLARE
  v_functions_count INTEGER;
  v_table_exists BOOLEAN;
  v_constraint_exists BOOLEAN;
  v_owner_id_exists BOOLEAN;
  v_email_column_exists BOOLEAN;
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'DEPLOYMENT VERIFICATION SUMMARY';
  RAISE NOTICE '================================================';
  
  -- Check functions
  SELECT COUNT(*) INTO v_functions_count
  FROM pg_proc 
  WHERE proname IN ('provision_tenant_atomic', 'check_owner_email_availability', 'mark_provisioning_failed')
  AND pronamespace = 'public'::regnamespace;
  
  IF v_functions_count = 3 THEN
    RAISE NOTICE '✅ All 3 functions exist';
  ELSE
    RAISE NOTICE '❌ Missing functions: % of 3 found', v_functions_count;
  END IF;
  
  -- Check table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'provisioning_requests'
  ) INTO v_table_exists;
  
  IF v_table_exists THEN
    RAISE NOTICE '✅ provisioning_requests table exists';
  ELSE
    RAISE NOTICE '❌ provisioning_requests table missing';
  END IF;
  
  -- Check constraint
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'tenants' 
    AND constraint_name = 'tenant_must_have_owner'
  ) INTO v_constraint_exists;
  
  IF v_constraint_exists THEN
    RAISE NOTICE '✅ tenant_must_have_owner constraint exists';
  ELSE
    RAISE NOTICE '❌ tenant_must_have_owner constraint missing';
  END IF;
  
  -- Check owner_id column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'owner_id'
  ) INTO v_owner_id_exists;
  
  IF v_owner_id_exists THEN
    RAISE NOTICE '✅ tenants.owner_id column exists';
  ELSE
    RAISE NOTICE '❌ tenants.owner_id column missing';
  END IF;
  
  -- Check email column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'email'
  ) INTO v_email_column_exists;
  
  IF v_email_column_exists THEN
    RAISE NOTICE '✅ tenants.email column exists';
  ELSE
    RAISE NOTICE '⚠️  tenants.email column missing (may cause issues)';
  END IF;
  
  RAISE NOTICE '================================================';
  
  -- Overall status
  IF v_functions_count = 3 AND v_table_exists AND v_constraint_exists AND v_owner_id_exists THEN
    RAISE NOTICE '✅ ✅ ✅ DEPLOYMENT SUCCESSFUL ✅ ✅ ✅';
    RAISE NOTICE 'You can now test provisioning via Admin Dashboard';
  ELSE
    RAISE NOTICE '❌ ❌ ❌ DEPLOYMENT INCOMPLETE ❌ ❌ ❌';
    RAISE NOTICE 'Review errors above and re-run migration';
  END IF;
  
  RAISE NOTICE '================================================';
END $$;
