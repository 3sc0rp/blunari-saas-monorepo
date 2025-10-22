-- =============================================================================
-- TENANT OWNER VERIFICATION QUERIES
-- =============================================================================
-- Run these queries in Supabase SQL Editor to check tenant owner status
-- Project: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/sql
-- =============================================================================

-- Query 1: Current tenant owner status
-- Shows which tenants share owners (BEFORE FIX)
SELECT 
  t.name as tenant_name,
  t.slug,
  t.owner_id,
  p.email as owner_email,
  COUNT(*) OVER (PARTITION BY t.owner_id) as tenants_sharing_this_owner,
  CASE 
    WHEN COUNT(*) OVER (PARTITION BY t.owner_id) > 1 THEN '⚠️ SHARED'
    ELSE '✅ UNIQUE'
  END as status
FROM tenants t
LEFT JOIN profiles p ON t.owner_id = p.user_id
ORDER BY t.created_at;

-- Expected BEFORE fix: All show "⚠️ SHARED" with count > 1
-- Expected AFTER fix: All show "✅ UNIQUE" with count = 1

-- =============================================================================

-- Query 2: Owner sharing summary
-- Quick count of how many owners are shared
SELECT 
  owner_id,
  COUNT(*) as tenant_count,
  array_agg(name ORDER BY name) as tenant_names
FROM tenants
WHERE owner_id IS NOT NULL
GROUP BY owner_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- Expected BEFORE fix: 1 row showing owner shared by multiple tenants
-- Expected AFTER fix: 0 rows (no shared owners)

-- =============================================================================

-- Query 3: Tenant owner details with email
-- Detailed view of all tenants and their owner accounts
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  t.slug,
  t.owner_id,
  p.email as owner_email,
  p.role as owner_role,
  ap.login_email as provisioning_email,
  ap.status as provisioning_status,
  t.created_at as tenant_created,
  t.updated_at as tenant_updated
FROM tenants t
LEFT JOIN profiles p ON t.owner_id = p.user_id
LEFT JOIN auto_provisioning ap ON t.id = ap.tenant_id
ORDER BY t.name;

-- Verify AFTER fix:
-- - Each tenant has different owner_id
-- - owner_email matches slug pattern (e.g., wfactory@blunari.ai)
-- - provisioning_email matches owner_email
-- - All tenants show recent tenant_updated timestamp

-- =============================================================================

-- Query 4: Auth users linked to tenants
-- Shows actual auth users and their tenant associations
SELECT 
  au.id as user_id,
  au.email,
  au.created_at as user_created,
  au.last_sign_in_at,
  COUNT(t.id) as owned_tenants,
  array_agg(t.name) as tenant_names
FROM auth.users au
LEFT JOIN tenants t ON t.owner_id = au.id
GROUP BY au.id, au.email, au.created_at, au.last_sign_in_at
HAVING COUNT(t.id) > 0
ORDER BY COUNT(t.id) DESC, au.email;

-- Expected AFTER fix:
-- - Each user should own exactly 1 tenant (COUNT = 1)
-- - Emails should match tenant slug pattern

-- =============================================================================

-- Query 5: Admin vs Owner user check
-- Ensures no admin users are set as tenant owners
SELECT 
  e.user_id,
  e.email as admin_email,
  e.role as admin_role,
  COUNT(t.id) as owned_tenants,
  array_agg(t.name) as tenant_names
FROM employees e
LEFT JOIN tenants t ON t.owner_id = e.user_id
WHERE e.role IN ('ADMIN', 'SUPER_ADMIN')
GROUP BY e.user_id, e.email, e.role
HAVING COUNT(t.id) > 0;

-- Expected: 0 rows (admin users should NEVER be tenant owners)
-- If any rows appear, this is a critical security issue

-- =============================================================================

-- Query 6: Orphaned tenants check
-- Ensures all tenants have valid owner_id
SELECT 
  id,
  name,
  slug,
  owner_id,
  created_at
FROM tenants
WHERE owner_id IS NULL;

-- Expected: 0 rows (all tenants must have owners after constraint added)

-- =============================================================================

-- SUMMARY QUERY: One-line status check
-- Run this for quick verification
SELECT 
  COUNT(*) as total_tenants,
  COUNT(DISTINCT owner_id) as unique_owners,
  CASE 
    WHEN COUNT(*) = COUNT(DISTINCT owner_id) THEN '✅ ALL UNIQUE'
    ELSE '⚠️ SHARED OWNERS DETECTED'
  END as status
FROM tenants
WHERE owner_id IS NOT NULL;

-- Expected AFTER fix: 
-- total_tenants = unique_owners AND status = '✅ ALL UNIQUE'

-- =============================================================================
-- NEXT STEPS AFTER VERIFICATION:
-- =============================================================================
-- 1. ✅ Verify all queries show expected results
-- 2. 📧 Send credentials to each tenant owner (from EXECUTE_TENANT_OWNER_SEPARATION.js results)
-- 3. 🔐 Test login for each tenant
-- 4. ✉️ Instruct owners to change password on first login
-- 5. 📊 Monitor admin_actions_audit table for any issues
-- =============================================================================
