-- ============================================================================
-- QUICK PRE-FLIGHT CHECK - Run this before testing V2 provisioning
-- Should take < 5 seconds to execute
-- ============================================================================

DO $$
DECLARE
  v_check_passed BOOLEAN := TRUE;
  v_error_msg TEXT := '';
BEGIN
  RAISE NOTICE '🔍 Running V2 System Pre-Flight Checks...';
  RAISE NOTICE '';
  
  -- Check 1: V2 Audit Table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_provisioning_audit_v2') THEN
    v_check_passed := FALSE;
    v_error_msg := 'FAIL: tenant_provisioning_audit_v2 table not found';
    RAISE WARNING '%', v_error_msg;
  ELSE
    RAISE NOTICE '✅ Check 1: Audit table exists';
  END IF;
  
  -- Check 2: V2 Main Function
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'provision_tenant_atomic_v2') THEN
    v_check_passed := FALSE;
    v_error_msg := 'FAIL: provision_tenant_atomic_v2 function not found';
    RAISE WARNING '%', v_error_msg;
  ELSE
    RAISE NOTICE '✅ Check 2: Main provisioning function exists';
  END IF;
  
  -- Check 3: Email Validation Function
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_owner_email_realtime') THEN
    v_check_passed := FALSE;
    v_error_msg := 'FAIL: validate_owner_email_realtime function not found';
    RAISE WARNING '%', v_error_msg;
  ELSE
    RAISE NOTICE '✅ Check 3: Email validation function exists';
  END IF;
  
  -- Check 4: Slug Validation Function
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_tenant_slug_realtime') THEN
    v_check_passed := FALSE;
    v_error_msg := 'FAIL: validate_tenant_slug_realtime function not found';
    RAISE WARNING '%', v_error_msg;
  ELSE
    RAISE NOTICE '✅ Check 4: Slug validation function exists';
  END IF;
  
  -- Check 5: Owner ID Update Function
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_provisioning_owner_id') THEN
    v_check_passed := FALSE;
    v_error_msg := 'FAIL: update_provisioning_owner_id function not found';
    RAISE WARNING '%', v_error_msg;
  ELSE
    RAISE NOTICE '✅ Check 5: Owner ID update function exists';
  END IF;
  
  -- Check 6: Rollback Function
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rollback_provisioning_v2') THEN
    v_check_passed := FALSE;
    v_error_msg := 'FAIL: rollback_provisioning_v2 function not found';
    RAISE WARNING '%', v_error_msg;
  ELSE
    RAISE NOTICE '✅ Check 6: Rollback function exists';
  END IF;
  
  -- Check 7: Tenants Table Columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'contact_email'
  ) THEN
    v_check_passed := FALSE;
    v_error_msg := 'FAIL: contact_email column not found in tenants table';
    RAISE WARNING '%', v_error_msg;
  ELSE
    RAISE NOTICE '✅ Check 7: contact_email column exists';
  END IF;
  
  -- Check 8: Owner ID Column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'owner_id'
  ) THEN
    v_check_passed := FALSE;
    v_error_msg := 'FAIL: owner_id column not found in tenants table';
    RAISE WARNING '%', v_error_msg;
  ELSE
    RAISE NOTICE '✅ Check 8: owner_id column exists';
  END IF;
  
  -- Check 9: No Legacy Columns
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' 
      AND column_name IN ('email', 'phone', 'address', 'settings')
  ) THEN
    v_check_passed := FALSE;
    v_error_msg := 'WARNING: Found legacy columns (email/phone/address/settings) in tenants table';
    RAISE WARNING '%', v_error_msg;
  ELSE
    RAISE NOTICE '✅ Check 9: No legacy columns found';
  END IF;
  
  -- Check 10: Auto-Provisioning Table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auto_provisioning') THEN
    v_check_passed := FALSE;
    v_error_msg := 'FAIL: auto_provisioning table not found';
    RAISE WARNING '%', v_error_msg;
  ELSE
    RAISE NOTICE '✅ Check 10: auto_provisioning table exists';
  END IF;
  
  RAISE NOTICE '';
  
  IF v_check_passed THEN
    RAISE NOTICE '🎉 ALL CHECKS PASSED! System is ready for testing.';
    RAISE NOTICE '';
    RAISE NOTICE 'Next step: Go to Admin Dashboard → Tenants → "Provision New Tenant"';
  ELSE
    RAISE WARNING '⚠️  SOME CHECKS FAILED! Review errors above before testing.';
    RAISE WARNING 'Last error: %', v_error_msg;
  END IF;
END $$;
