-- =====================================================================
-- QUICK VERIFICATION QUERIES
-- Run these in Supabase SQL Editor to verify separation is working
-- =====================================================================

-- ═══════════════════════════════════════════════════════════════════
-- QUERY 1: Check droodwick tenant status
-- ═══════════════════════════════════════════════════════════════════
-- Expected: owner_id should be 4acd8f0e-e7a8-4860-8f20-6ea74b3d48a6
--           email should be deewav3@gmail.com
--           sync_status should be ✅ SYNCED

SELECT 
  '🏪 DROODWICK TENANT' as check_type,
  t.id as tenant_id,
  t.name as tenant_name,
  t.email as tenant_email,
  t.owner_id,
  au.email as owner_email,
  ap.user_id as autoprov_user_id,
  CASE 
    WHEN t.owner_id = ap.user_id THEN '✅ SYNCED'
    WHEN t.owner_id IS NULL THEN '❌ NO OWNER'
    WHEN ap.user_id IS NULL THEN '⚠️  NO AUTO-PROV'
    ELSE '⚠️  MISMATCH'
  END as sync_status
FROM tenants t
LEFT JOIN auth.users au ON au.id = t.owner_id
LEFT JOIN auto_provisioning ap ON ap.tenant_id = t.id
WHERE t.name = 'droodwick';

-- ═══════════════════════════════════════════════════════════════════
-- QUERY 2: Verify admin email unchanged
-- ═══════════════════════════════════════════════════════════════════
-- Expected: drood.tech@gmail.com should still exist
--           Should NOT be in any tenant's owner_id

SELECT 
  '👤 ADMIN USER' as check_type,
  au.id as user_id,
  au.email,
  e.role as employee_role,
  p.role as profile_role,
  CASE 
    WHEN EXISTS (SELECT 1 FROM tenants WHERE owner_id = au.id) THEN '🚨 USED AS TENANT OWNER (BAD!)'
    ELSE '✅ Not used as tenant owner (GOOD)'
  END as usage_status
FROM auth.users au
LEFT JOIN employees e ON e.user_id = au.id AND e.status = 'ACTIVE'
LEFT JOIN profiles p ON p.user_id = au.id
WHERE au.id = '7d68eada-5b32-419f-aef8-f15afac43ed0'
   OR au.email = 'drood.tech@gmail.com';

-- ═══════════════════════════════════════════════════════════════════
-- QUERY 3: Check tenant owner user
-- ═══════════════════════════════════════════════════════════════════
-- Expected: deewav3@gmail.com should exist
--           Should NOT be in employees table (not an admin)
--           Should be owner_id for droodwick tenant

SELECT 
  '👤 TENANT OWNER' as check_type,
  au.id as user_id,
  au.email,
  p.role as profile_role,
  CASE 
    WHEN EXISTS (SELECT 1 FROM employees WHERE user_id = au.id AND status = 'ACTIVE') THEN '🚨 IS ADMIN (BAD!)'
    ELSE '✅ Not an admin (GOOD)'
  END as admin_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM tenants WHERE owner_id = au.id) THEN '✅ Used as tenant owner (GOOD)'
    ELSE '⚠️  Not used as tenant owner'
  END as tenant_link_status,
  (SELECT STRING_AGG(name, ', ') FROM tenants WHERE owner_id = au.id) as tenant_names
FROM auth.users au
LEFT JOIN profiles p ON p.user_id = au.id
WHERE au.id = '4acd8f0e-e7a8-4860-8f20-6ea74b3d48a6'
   OR au.email = 'deewav3@gmail.com';

-- ═══════════════════════════════════════════════════════════════════
-- QUERY 4: Full separation overview
-- ═══════════════════════════════════════════════════════════════════
-- Shows all tenants and their owner status

SELECT 
  t.name as tenant_name,
  t.owner_id,
  au.email as owner_email,
  ap.user_id as autoprov_user_id,
  CASE 
    WHEN t.owner_id IS NULL THEN '❌ NO OWNER'
    WHEN t.owner_id = ap.user_id THEN '✅ SYNCED'
    WHEN ap.user_id IS NULL THEN '⚠️  NO AUTO-PROV'
    ELSE '⚠️  MISMATCH'
  END as status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM employees WHERE user_id = t.owner_id AND status = 'ACTIVE') THEN '🚨 ADMIN USER!'
    ELSE '✅ Separate owner'
  END as owner_type
FROM tenants t
LEFT JOIN auth.users au ON au.id = t.owner_id
LEFT JOIN auto_provisioning ap ON ap.tenant_id = t.id
ORDER BY t.name;

-- ═══════════════════════════════════════════════════════════════════
-- QUERY 5: Summary statistics
-- ═══════════════════════════════════════════════════════════════════

SELECT 
  COUNT(DISTINCT e.user_id) as total_admin_users,
  COUNT(DISTINCT t.id) as total_tenants,
  COUNT(DISTINCT CASE WHEN t.owner_id IS NOT NULL THEN t.id END) as tenants_with_owner_id,
  COUNT(DISTINCT CASE WHEN t.owner_id IS NULL THEN t.id END) as tenants_without_owner_id,
  COUNT(DISTINCT CASE 
    WHEN EXISTS (SELECT 1 FROM employees WHERE user_id = t.owner_id AND status = 'ACTIVE') 
    THEN t.id 
  END) as tenants_linked_to_admins,
  COUNT(DISTINCT CASE 
    WHEN t.owner_id = ap.user_id THEN t.id 
  END) as tenants_synced_with_autoprov
FROM employees e
CROSS JOIN tenants t
LEFT JOIN auto_provisioning ap ON ap.tenant_id = t.id
WHERE e.status = 'ACTIVE';

-- ═══════════════════════════════════════════════════════════════════
-- QUERY 6: Check for potential issues
-- ═══════════════════════════════════════════════════════════════════
-- Returns any problematic configurations

SELECT 
  '⚠️  POTENTIAL ISSUES' as check_type,
  issue_type,
  tenant_name,
  details
FROM (
  -- Issue 1: Tenants without owner_id
  SELECT 
    'No owner_id' as issue_type,
    t.name as tenant_name,
    'Tenant has no owner_id set' as details
  FROM tenants t
  WHERE t.owner_id IS NULL
  
  UNION ALL
  
  -- Issue 2: Tenants with admin as owner
  SELECT 
    'Admin as owner' as issue_type,
    t.name as tenant_name,
    'Tenant owner_id points to admin user: ' || au.email as details
  FROM tenants t
  JOIN auth.users au ON au.id = t.owner_id
  WHERE EXISTS (SELECT 1 FROM employees WHERE user_id = t.owner_id AND status = 'ACTIVE')
  
  UNION ALL
  
  -- Issue 3: Mismatched owner_id and auto_provisioning
  SELECT 
    'Sync mismatch' as issue_type,
    t.name as tenant_name,
    'owner_id and auto_provisioning.user_id do not match' as details
  FROM tenants t
  JOIN auto_provisioning ap ON ap.tenant_id = t.id
  WHERE t.owner_id IS NOT NULL 
    AND ap.user_id IS NOT NULL
    AND t.owner_id != ap.user_id
  
  UNION ALL
  
  -- Issue 4: Auto-provisioning with admin user
  SELECT 
    'Admin in auto_prov' as issue_type,
    t.name as tenant_name,
    'auto_provisioning points to admin user: ' || au.email as details
  FROM auto_provisioning ap
  JOIN tenants t ON t.id = ap.tenant_id
  JOIN auth.users au ON au.id = ap.user_id
  WHERE EXISTS (SELECT 1 FROM employees WHERE user_id = ap.user_id AND status = 'ACTIVE')
) issues
ORDER BY 
  CASE issue_type
    WHEN 'Admin as owner' THEN 1
    WHEN 'Admin in auto_prov' THEN 2
    WHEN 'Sync mismatch' THEN 3
    WHEN 'No owner_id' THEN 4
  END;

-- ═══════════════════════════════════════════════════════════════════
-- QUERY 7: Verify owner_id column exists
-- ═══════════════════════════════════════════════════════════════════
-- Confirms migration was applied

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'tenants' 
  AND column_name = 'owner_id';

-- Expected result: 
-- column_name | data_type | is_nullable | column_default
-- owner_id    | uuid      | YES         | NULL

-- =====================================================================
-- EXPECTED RESULTS SUMMARY
-- =====================================================================

/*
QUERY 1 (droodwick status):
  owner_id: 4acd8f0e-e7a8-4860-8f20-6ea74b3d48a6
  owner_email: deewav3@gmail.com
  sync_status: ✅ SYNCED

QUERY 2 (admin email):
  email: drood.tech@gmail.com
  usage_status: ✅ Not used as tenant owner (GOOD)

QUERY 3 (tenant owner):
  email: deewav3@gmail.com
  admin_status: ✅ Not an admin (GOOD)
  tenant_link_status: ✅ Used as tenant owner (GOOD)

QUERY 4 (all tenants):
  droodwick: ✅ SYNCED, ✅ Separate owner
  Other tenants: Check individual status

QUERY 5 (statistics):
  Should show proper counts with no tenants_linked_to_admins

QUERY 6 (issues):
  Should return NO ROWS if everything is correct
  Any rows indicate issues that need fixing

QUERY 7 (column exists):
  Should return 1 row confirming owner_id column exists
*/

-- =====================================================================
-- QUICK FIX QUERIES (if needed)
-- =====================================================================

-- If droodwick owner_id is NULL, sync from auto_provisioning:
/*
UPDATE tenants t
SET owner_id = ap.user_id
FROM auto_provisioning ap
WHERE ap.tenant_id = t.id
  AND ap.status = 'completed'
  AND t.name = 'droodwick'
  AND t.owner_id IS NULL;
*/

-- If auto_provisioning doesn't match owner_id, sync it:
/*
UPDATE auto_provisioning ap
SET user_id = t.owner_id
FROM tenants t
WHERE ap.tenant_id = t.id
  AND t.owner_id IS NOT NULL
  AND t.name = 'droodwick'
  AND ap.user_id != t.owner_id;
*/

-- =====================================================================
-- END OF VERIFICATION QUERIES
-- =====================================================================
