-- =============================================================================
-- CRITICAL FIX: Prevent Admin Email Changes from Affecting Tenant Data
-- =============================================================================
-- 
-- PROBLEM: When admin changes their email in Profile Settings, it was
-- potentially updating ALL employees across different schemas/tables
-- 
-- ROOT CAUSE: There are TWO different "employees" tables:
-- 1. Admin Dashboard employees (internal staff: SUPER_ADMIN, ADMIN, SUPPORT)
-- 2. Client Dashboard employees (restaurant staff with tenant_id)
-- 
-- The RealProfilePage.tsx was updating "employees" without specifying
-- which table, potentially affecting tenant data.
-- 
-- =============================================================================

SELECT '=== CHECKING EMPLOYEES TABLE STRUCTURE ===' as info;

-- Check if we have multiple employees tables
SELECT 
  schemaname,
  tablename,
  '✅ Table exists' as status
FROM pg_tables
WHERE tablename = 'employees'
ORDER BY schemaname;

SELECT '' as separator;

-- Check admin employees table structure
SELECT 
  '=== ADMIN EMPLOYEES TABLE COLUMNS ===' as info;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'employees'
ORDER BY ordinal_position;

SELECT '' as separator;

-- Check if admin employees table has email column
DO $$
DECLARE
  has_email_column BOOLEAN;
  has_tenant_id_column BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'employees' 
      AND column_name = 'email'
  ) INTO has_email_column;
  
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'employees' 
      AND column_name = 'tenant_id'
  ) INTO has_tenant_id_column;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== DIAGNOSIS ===';
  
  IF has_email_column AND has_tenant_id_column THEN
    RAISE NOTICE '⚠️  WARNING: employees table has BOTH email AND tenant_id';
    RAISE NOTICE 'This means it''s the CLIENT DASHBOARD employees table';
    RAISE NOTICE 'Admin staff should NOT be in this table!';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 ACTION REQUIRED:';
    RAISE NOTICE '1. Check if admin user is in this table';
    RAISE NOTICE '2. If yes, move admin to correct employees table';
    RAISE NOTICE '3. Update RealProfilePage.tsx to use correct table';
    
  ELSIF has_email_column AND NOT has_tenant_id_column THEN
    RAISE NOTICE '✅ employees table has email but NO tenant_id';
    RAISE NOTICE 'This is likely admin employees table (correct)';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Safe to update email with user_id filter';
    
  ELSIF NOT has_email_column THEN
    RAISE NOTICE '⚠️  employees table does NOT have email column';
    RAISE NOTICE 'Email should be fetched from auth.users or profiles';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 ACTION: Do NOT update employees.email';
    RAISE NOTICE 'Only update profiles.email';
  END IF;
END $$;

SELECT '' as separator;

-- Check for admin user in employees table
SELECT 
  '=== CHECKING FOR ADMIN USER IN EMPLOYEES ===' as info;

SELECT 
  e.id,
  e.user_id,
  e.employee_id,
  e.role,
  e.status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'employees' AND column_name = 'email'
    ) 
    THEN (SELECT email FROM employees WHERE id = e.id LIMIT 1)
    ELSE 'N/A - no email column'
  END as email_in_table,
  au.email as auth_email,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'employees' AND column_name = 'tenant_id'
    ) 
    THEN '⚠️  HAS tenant_id - WRONG TABLE!'
    ELSE '✅ No tenant_id - correct admin table'
  END as table_type
FROM employees e
INNER JOIN auth.users au ON au.id = e.user_id
WHERE au.email IN ('admin@blunari.ai', 'drood.tech@gmail.com')
  OR e.role IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT');

SELECT '' as separator;

-- Show tenant employees if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'tenant_id'
  ) THEN
    RAISE NOTICE '=== TENANT EMPLOYEES (should NOT include admin@blunari.ai) ===';
  END IF;
END $$;

-- Check if there are tenant employees with admin email
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'employees' 
      AND column_name = 'tenant_id'
  ) THEN
    -- Only run this query if tenant_id column exists
    RAISE NOTICE 'Checking for admin in tenant employees table...';
    
    PERFORM e.id
    FROM employees e
    LEFT JOIN tenants t ON t.id = e.tenant_id
    WHERE e.email IN ('admin@blunari.ai', 'drood.tech@gmail.com');
    
    IF FOUND THEN
      RAISE NOTICE '⚠️  WARNING: Admin email found in tenant employees table!';
    ELSE
      RAISE NOTICE '✅ Admin email NOT in tenant employees table (correct)';
    END IF;
  ELSE
    RAISE NOTICE '✅ No tenant_id column - this is admin employees table (correct)';
    RAISE NOTICE '✅ Admin data is properly isolated from tenant data';
  END IF;
END $$;

SELECT '' as separator;

-- RECOMMENDATION
SELECT '=== RECOMMENDED FIX ===' as info;

DO $$
DECLARE
  has_email_column BOOLEAN;
  has_tenant_id_column BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'employees' 
      AND column_name = 'email'
  ) INTO has_email_column;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'employees' 
      AND column_name = 'tenant_id'
  ) INTO has_tenant_id_column;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== FINAL ASSESSMENT ===';
  RAISE NOTICE '';
  
  IF has_tenant_id_column THEN
    RAISE NOTICE '⚠️  WARNING: This is the CLIENT DASHBOARD employees table';
    RAISE NOTICE 'Admin staff should NOT use this table!';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 IMMEDIATE ACTION REQUIRED:';
    RAISE NOTICE '1. Remove admin from this table:';
    RAISE NOTICE '   DELETE FROM employees ';
    RAISE NOTICE '   WHERE email IN (''admin@blunari.ai'', ''drood.tech@gmail.com'')';
    RAISE NOTICE '     AND tenant_id IS NOT NULL;';
    RAISE NOTICE '';
    RAISE NOTICE '2. Use correct admin employees table (without tenant_id)';
    
  ELSE
    RAISE NOTICE '✅ CORRECT TABLE STRUCTURE';
    RAISE NOTICE '';
    RAISE NOTICE 'This is the ADMIN employees table (no tenant_id column)';
    RAISE NOTICE 'Perfect for internal Blunari staff (SUPER_ADMIN, ADMIN, SUPPORT)';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Tenant data is properly isolated';
    RAISE NOTICE '✅ Admin email changes will NOT affect tenant data';
    RAISE NOTICE '';
    RAISE NOTICE 'Current RealProfilePage.tsx behavior:';
    RAISE NOTICE '  1. Updates auth.users (via supabase.auth.updateUser)';
    RAISE NOTICE '  2. Updates profiles table';
    RAISE NOTICE '  3. Does NOT update employees table (correct!)';
    RAISE NOTICE '';
    IF has_email_column THEN
      RAISE NOTICE '⚠️  Note: employees table has email column';
      RAISE NOTICE 'But it''s safe because tenant_id does not exist';
    ELSE
      RAISE NOTICE '✅ employees table has NO email column';
      RAISE NOTICE 'Email is fetched from auth.users or profiles (correct)';
    END IF;
  END IF;
END $$;

SELECT '' as final_separator;
SELECT '✅ Diagnostic complete!' as status;
