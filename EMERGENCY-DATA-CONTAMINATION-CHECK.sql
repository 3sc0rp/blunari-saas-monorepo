-- =============================================================================
-- EMERGENCY: Check for Data Contamination
-- ==============SELECT '=== CHECK FOR TENANT OWNERSHIP ===' as info;

-- Check auto_provisioning table for tenant ownership
SELECT 
  ap.tenant_id,
  t.name as tenant_name,
  t.slug,
  ap.user_id,
  au.email,
  ap.status,
  ap.created_at
FROM auto_provisioning ap
LEFT JOIN tenants t ON t.id = ap.tenant_id
LEFT JOIN auth.users au ON au.id = ap.user_id
WHERE ap.status = 'completed'
  AND au.email IN ('admin@blunari.ai', 'drood.tech@gmail.com')
ORDER BY ap.created_at DESC;

SELECT '=== CHECK IF MULTIPLE TENANTS OWNED BY SAME USER ===' as info;

SELECT 
  au.email,
  COUNT(DISTINCT ap.tenant_id) as tenant_count,
  array_agg(DISTINCT t.name ORDER BY t.created_at) as tenant_names,
  array_agg(DISTINCT ap.tenant_id::text ORDER BY ap.created_at) as tenant_ids
FROM auto_provisioning ap
LEFT JOIN tenants t ON t.id = ap.tenant_id
LEFT JOIN auth.users au ON au.id = ap.user_id
WHERE ap.status = 'completed'
GROUP BY au.email
HAVING COUNT(DISTINCT ap.tenant_id) > 1
ORDER BY tenant_count DESC;==================================================
-- This script checks if email changes have affected multiple users/tenants
-- =============================================================================

-- Check auth.users emails
SELECT '🚨 EMERGENCY DATA CONTAMINATION CHECK 🚨' as status;
SELECT '=== AUTH.USERS EMAILS ===' as info;

SELECT 
  id,
  email,
  created_at,
  updated_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE email IN ('admin@blunari.ai', 'drood.tech@gmail.com')
ORDER BY created_at;

SELECT '=== ALL AUTH.USERS (Check for duplicates) ===' as info;

SELECT 
  email,
  COUNT(*) as count,
  array_agg(id::text ORDER BY created_at) as user_ids,
  MIN(created_at) as first_created,
  MAX(updated_at) as last_updated
FROM auth.users
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY count DESC;

SELECT '=== PROFILES TABLE ===' as info;

SELECT 
  p.user_id,
  p.email,
  p.first_name,
  p.last_name,
  au.email as auth_email,
  p.updated_at,
  CASE 
    WHEN p.email = au.email THEN '✅ Match'
    ELSE '❌ MISMATCH!'
  END as email_status
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.user_id
WHERE p.email IN ('admin@blunari.ai', 'drood.tech@gmail.com')
   OR au.email IN ('admin@blunari.ai', 'drood.tech@gmail.com')
ORDER BY p.updated_at DESC;

SELECT '=== EMPLOYEES TABLE (Check for contamination) ===' as info;

-- Check if employees table has email column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'email'
  ) THEN
    RAISE NOTICE 'Employees table HAS email column - checking for contamination...';
    
    -- Show all employees with admin email
    PERFORM e.id
    FROM employees e
    WHERE e.email IN ('admin@blunari.ai', 'drood.tech@gmail.com');
    
    IF FOUND THEN
      RAISE NOTICE '⚠️ WARNING: Admin email found in employees table!';
    ELSE
      RAISE NOTICE '✅ No admin email in employees table';
    END IF;
  ELSE
    RAISE NOTICE '✅ Employees table does NOT have email column (correct for admin table)';
  END IF;
END $$;

-- If employees has email, show details
DO $$
DECLARE
  has_tenant_id BOOLEAN;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'email'
  ) THEN
    -- Check if tenant_id column exists
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'employees' AND column_name = 'tenant_id'
    ) INTO has_tenant_id;
    
    IF has_tenant_id THEN
      -- Query with tenant_id (client employees table)
      EXECUTE 'SELECT 
        e.id,
        e.email,
        e.first_name,
        e.last_name,
        e.tenant_id,
        t.name as tenant_name,
        e.updated_at
      FROM employees e
      LEFT JOIN tenants t ON t.id = e.tenant_id
      WHERE e.email IN (''admin@blunari.ai'', ''drood.tech@gmail.com'')
      ORDER BY e.updated_at DESC';
    ELSE
      -- Query without tenant_id (admin employees table)
      EXECUTE 'SELECT 
        e.id,
        e.email,
        e.first_name,
        e.last_name,
        e.updated_at
      FROM employees e
      WHERE e.email IN (''admin@blunari.ai'', ''drood.tech@gmail.com'')
      ORDER BY e.updated_at DESC';
    END IF;
  END IF;
END $$;

SELECT '=== TENANTS TABLE ===' as info;

-- First check what columns exist in tenants table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tenants' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show recent tenants
SELECT 
  id,
  slug,
  name,
  status,
  created_at,
  updated_at
FROM tenants
ORDER BY updated_at DESC
LIMIT 10;

SELECT '=== CHECK FOR TENANT OWNERSHIP ===' as info;

-- This is the CRITICAL check - are there multiple tenants with same owner_email?
SELECT 
  owner_email,
  COUNT(*) as tenant_count,
  array_agg(name ORDER BY created_at) as tenant_names,
  array_agg(id::text ORDER BY created_at) as tenant_ids
FROM tenants
WHERE owner_email IS NOT NULL
GROUP BY owner_email
HAVING COUNT(*) > 1
ORDER BY tenant_count DESC;

SELECT '=== RECENT EMAIL CHANGES (Last 24 hours) ===' as info;

-- Check auth.users updates
SELECT 
  'auth.users' as table_name,
  id as record_id,
  email,
  updated_at
FROM auth.users
WHERE updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC;

-- Check profiles updates
SELECT 
  'profiles' as table_name,
  user_id as record_id,
  email,
  updated_at
FROM profiles
WHERE updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC;

-- Check tenants updates
SELECT 
  'tenants' as table_name,
  id as record_id,
  name as tenant_name,
  updated_at
FROM tenants
WHERE updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC;

SELECT '=== DIAGNOSTIC SUMMARY ===' as info;

DO $$
DECLARE
  auth_count INTEGER;
  profile_count INTEGER;
  tenant_count INTEGER;
  employee_count INTEGER;
  has_email_col BOOLEAN;
BEGIN
  -- Count records with admin email
  SELECT COUNT(*) INTO auth_count
  FROM auth.users
  WHERE email IN ('admin@blunari.ai', 'drood.tech@gmail.com');
  
  SELECT COUNT(*) INTO profile_count
  FROM profiles
  WHERE email IN ('admin@blunari.ai', 'drood.tech@gmail.com');
  
  -- Count tenants owned by admin via auto_provisioning
  SELECT COUNT(DISTINCT ap.tenant_id) INTO tenant_count
  FROM auto_provisioning ap
  LEFT JOIN auth.users au ON au.id = ap.user_id
  WHERE ap.status = 'completed'
    AND au.email IN ('admin@blunari.ai', 'drood.tech@gmail.com');
  
  -- Check if employees has email column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'email'
  ) INTO has_email_col;
  
  IF has_email_col THEN
    EXECUTE 'SELECT COUNT(*) FROM employees WHERE email IN (''admin@blunari.ai'', ''drood.tech@gmail.com'')'
    INTO employee_count;
  ELSE
    employee_count := 0;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== CONTAMINATION REPORT ===';
  RAISE NOTICE '';
  RAISE NOTICE 'Admin email found in:';
  RAISE NOTICE '  auth.users: % records', auth_count;
  RAISE NOTICE '  profiles: % records', profile_count;
  RAISE NOTICE '  tenants: % records (owner_email)', tenant_count;
  IF has_email_col THEN
    RAISE NOTICE '  employees: % records', employee_count;
  ELSE
    RAISE NOTICE '  employees: N/A (no email column)';
  END IF;
  RAISE NOTICE '';
  
  IF tenant_count > 1 THEN
    RAISE NOTICE '🚨 CRITICAL: Admin email is owner of MULTIPLE tenants!';
    RAISE NOTICE '   This indicates cross-tenant data contamination!';
  ELSIF tenant_count = 1 THEN
    RAISE NOTICE '✅ Admin email is owner of 1 tenant (expected)';
  ELSE
    RAISE NOTICE '⚠️  Admin email is NOT a tenant owner';
  END IF;
  
  IF auth_count > 1 THEN
    RAISE NOTICE '🚨 CRITICAL: Multiple auth.users with same email!';
  ELSIF auth_count = 1 THEN
    RAISE NOTICE '✅ Single auth.users record (correct)';
  END IF;
  
  IF has_email_col AND employee_count > 0 THEN
    RAISE NOTICE '⚠️  WARNING: Admin email found in employees table';
  END IF;
END $$;

SELECT '✅ Diagnostic complete!' as status;

SELECT '📋 NEXT STEPS:' as info;
SELECT '1. Review the output above for any ❌ or 🚨 indicators' as step1;
SELECT '2. Check if multiple tenants have the same owner_email' as step2;
SELECT '3. Check if auth.users and profiles emails match' as step3;
SELECT '4. Report findings for remediation' as step4;
