-- Check RLS policies and see actual data
-- Run this in Supabase SQL Editor

-- Check RLS status
SELECT 
  '=== RLS STATUS ===' as info;

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('auto_provisioning', 'tenants', 'profiles')
AND schemaname = 'public';

-- Check policies
SELECT 
  '' as separator;

SELECT 
  '=== RLS POLICIES ===' as info;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression
FROM pg_policies
WHERE tablename IN ('auto_provisioning', 'tenants', 'profiles')
AND schemaname = 'public';

-- Now let's check the actual data (bypassing RLS in SQL editor)
SELECT 
  '' as separator;

SELECT 
  '=== ACTUAL DATA IN auto_provisioning ===' as info;

SELECT 
  id,
  tenant_id,
  restaurant_name,
  restaurant_slug,
  user_id,
  login_email,
  status,
  created_at
FROM auto_provisioning
ORDER BY created_at DESC;

-- Check tenants
SELECT 
  '' as separator;

SELECT 
  '=== ACTUAL DATA IN tenants ===' as info;

SELECT 
  id,
  name,
  slug,
  email,
  created_at
FROM tenants
ORDER BY created_at DESC;

-- Check if there's a mismatch
SELECT 
  '' as separator;

SELECT 
  '=== TENANTS WITHOUT auto_provisioning ===' as info;

SELECT 
  t.id,
  t.name,
  t.slug,
  t.email,
  t.created_at,
  '❌ MISSING auto_provisioning' as issue
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 
  FROM auto_provisioning ap 
  WHERE ap.tenant_id = t.id
);
