-- ============================================================================
-- TENANT PROVISIONING FIX - DEPLOYMENT SCRIPT
-- Date: October 22, 2025
-- Deploy via: Supabase Dashboard → SQL Editor → Run
-- DO NOT use 'supabase db push' - will fail due to multi-statement limitation
-- ============================================================================

-- Step 1: Verify current state
DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'PRE-DEPLOYMENT CHECKS';
  RAISE NOTICE '================================================';
  
  -- Check if old provision_tenant exists
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'provision_tenant' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE NOTICE '⚠️  OLD provision_tenant() function exists - will be dropped';
  ELSE
    RAISE NOTICE '✓ No old provision_tenant() function found';
  END IF;
  
  -- Check if new functions exist
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'provision_tenant_atomic'
    AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE NOTICE '⚠️  provision_tenant_atomic() already exists - will be replaced';
  ELSE
    RAISE NOTICE '✓ provision_tenant_atomic() does not exist yet';
  END IF;
  
  -- Check tenants table schema
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'tenants' 
    AND column_name = 'owner_id'
  ) THEN
    RAISE NOTICE '✓ tenants.owner_id column exists';
  ELSE
    RAISE NOTICE '⚠️  tenants.owner_id column MISSING - will be added';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'tenants' 
    AND column_name = 'email'
  ) THEN
    RAISE NOTICE '✓ tenants.email column exists';
  ELSE
    RAISE NOTICE '⚠️  tenants.email column MISSING - may cause issues';
  END IF;
  
  RAISE NOTICE '================================================';
END $$;

-- ============================================================================
-- MAIN DEPLOYMENT: Copy content from 20251022_fix_tenant_provisioning_atomic.sql
-- ============================================================================
-- INSTRUCTIONS:
-- 1. Open: supabase/migrations/20251022_fix_tenant_provisioning_atomic.sql
-- 2. Copy the ENTIRE file contents
-- 3. Paste below this comment (replacing the placeholder)
-- 4. Run the entire script in Supabase Dashboard SQL Editor
-- ============================================================================

-- PASTE MIGRATION CONTENT HERE -->



-- <-- END MIGRATION CONTENT

-- ============================================================================
-- POST-DEPLOYMENT: Drop old function and verify
-- ============================================================================

-- Drop old provision_tenant function to prevent conflicts
DO $$
BEGIN
  DROP FUNCTION IF EXISTS public.provision_tenant(UUID, TEXT, TEXT, TEXT, TEXT) CASCADE;
  RAISE NOTICE '✅ Dropped old provision_tenant() function';
EXCEPTION
  WHEN undefined_function THEN
    RAISE NOTICE '✓ Old provision_tenant() function did not exist';
END $$;

-- Verify deployment
DO $$
DECLARE
  v_function_count INTEGER;
  v_table_exists BOOLEAN;
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'POST-DEPLOYMENT VERIFICATION';
  RAISE NOTICE '================================================';
  
  -- Check new functions exist
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc 
  WHERE proname IN ('provision_tenant_atomic', 'check_owner_email_availability', 'mark_provisioning_failed')
  AND pronamespace = 'public'::regnamespace;
  
  IF v_function_count = 3 THEN
    RAISE NOTICE '✅ All 3 provisioning functions created successfully';
  ELSE
    RAISE NOTICE '❌ FAILED: Only % of 3 functions exist', v_function_count;
  END IF;
  
  -- Check provisioning_requests table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' 
    AND table_name = 'provisioning_requests'
  ) INTO v_table_exists;
  
  IF v_table_exists THEN
    RAISE NOTICE '✅ provisioning_requests table created';
  ELSE
    RAISE NOTICE '❌ FAILED: provisioning_requests table missing';
  END IF;
  
  -- Check tenants table constraints
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
    AND table_name = 'tenants'
    AND constraint_name = 'tenant_must_have_owner'
  ) THEN
    RAISE NOTICE '✅ tenant_must_have_owner constraint added';
  ELSE
    RAISE NOTICE '❌ FAILED: tenant_must_have_owner constraint missing';
  END IF;
  
  RAISE NOTICE '================================================';
  RAISE NOTICE 'DEPLOYMENT COMPLETE';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test provisioning via Admin Dashboard';
  RAISE NOTICE '2. Check Edge Function logs for success';
  RAISE NOTICE '3. Verify no orphaned tenants in database';
  RAISE NOTICE '================================================';
END $$;
