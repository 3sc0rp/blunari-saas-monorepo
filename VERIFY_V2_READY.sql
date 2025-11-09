-- ============================================================================
-- COMPREHENSIVE V2 SYSTEM VERIFICATION
-- Run this in Supabase SQL Editor before testing
-- ============================================================================

\echo '==== 1. CHECK V2 AUDIT TABLE EXISTS ===='
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'tenant_provisioning_audit_v2'
ORDER BY ordinal_position;

\echo ''
\echo '==== 2. CHECK V2 FUNCTIONS EXIST ===='
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%_v2'
ORDER BY routine_name;

\echo ''
\echo '==== 3. VERIFY TENANTS TABLE COLUMNS ===='
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'tenants'
ORDER BY ordinal_position;

\echo ''
\echo '==== 4. CHECK OWNER_ID COLUMN EXISTS ===='
SELECT 
  EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'tenants' 
      AND column_name = 'owner_id'
  ) AS owner_id_exists;

\echo ''
\echo '==== 5. CHECK CONTACT FIELDS EXIST ===='
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'tenants'
  AND column_name IN ('contact_email', 'contact_phone')
ORDER BY column_name;

\echo ''
\echo '==== 6. VERIFY NO OLD COLUMNS ===='
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASS: No legacy columns (email, phone, address, settings) found'
    ELSE 'FAIL: Found legacy columns that should not exist'
  END AS validation_result,
  array_agg(column_name) AS columns_found
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'tenants'
  AND column_name IN ('email', 'phone', 'address', 'settings');

\echo ''
\echo '==== 7. TEST EMAIL VALIDATION FUNCTION ===='
SELECT 
  'test1@example.com' AS test_email,
  available,
  reason
FROM validate_owner_email_realtime('test1@example.com');

\echo ''
\echo '==== 8. TEST SLUG VALIDATION FUNCTION ===='
SELECT 
  'test-restaurant-99' AS test_slug,
  available,
  reason
FROM validate_tenant_slug_realtime('test-restaurant-99');

\echo ''
\echo '==== 9. CHECK AUTO_PROVISIONING TABLE ===='
SELECT 
  COUNT(*) AS total_records,
  COUNT(DISTINCT tenant_id) AS unique_tenants,
  COUNT(DISTINCT user_id) AS unique_users
FROM auto_provisioning;

\echo ''
\echo '==== 10. CHECK EMPLOYEES TABLE (ADMIN CHECK) ===='
SELECT 
  COUNT(*) AS total_admins
FROM employees
WHERE role IN ('SUPER_ADMIN', 'ADMIN') 
  AND status = 'ACTIVE';

\echo ''
\echo '==== VERIFICATION COMPLETE ===='
\echo 'Review results above. All checks should pass before testing.'
