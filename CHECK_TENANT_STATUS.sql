-- =============================================================================
-- DIAGNOSTIC: Check Current Tenant Status
-- =============================================================================
-- Run this to see exactly what's wrong with your tenant
-- =============================================================================

-- 1. Show most recent tenants and their owner status
SELECT 
  t.id,
  t.name,
  t.slug,
  t.email,
  t.owner_id,
  CASE 
    WHEN t.owner_id IS NULL THEN '❌ NO OWNER_ID - NEEDS FIX'
    WHEN p.user_id IS NULL THEN '⚠️  OWNER_ID SET BUT USER NOT FOUND'
    WHEN p.role = 'owner' THEN '✅ OWNER PROPERLY CONFIGURED'
    ELSE '⚠️  OWNER_ID SET BUT WRONG ROLE: ' || p.role
  END as status,
  p.email as owner_email,
  p.role as owner_role,
  t.created_at
FROM tenants t
LEFT JOIN profiles p ON t.owner_id = p.user_id
ORDER BY t.created_at DESC
LIMIT 10;

-- 2. Check auto_provisioning for tenants without owner_id
SELECT 
  t.name as tenant_name,
  t.id as tenant_id,
  t.owner_id as tenant_owner_id,
  ap.user_id as provisioning_user_id,
  ap.login_email,
  ap.status as provisioning_status,
  CASE 
    WHEN ap.user_id IS NULL THEN '❌ NO AUTO_PROVISIONING RECORD'
    WHEN ap.status != 'completed' THEN '⚠️  PROVISIONING NOT COMPLETED: ' || ap.status
    WHEN t.owner_id IS NULL THEN '🔧 CAN BE FIXED - RUN UPDATE'
    ELSE '✅ OWNER_ID MATCHES'
  END as action_needed
FROM tenants t
LEFT JOIN auto_provisioning ap ON t.id = ap.tenant_id
WHERE t.owner_id IS NULL
ORDER BY t.created_at DESC;

-- 3. Check if there are any admin users incorrectly set as tenant owners
SELECT 
  t.name as tenant_name,
  t.owner_id,
  p.email as owner_email,
  e.role as employee_role,
  '⚠️  CRITICAL: TENANT OWNER IS AN ADMIN!' as issue
FROM tenants t
INNER JOIN profiles p ON t.owner_id = p.user_id
INNER JOIN employees e ON t.owner_id = e.user_id
WHERE e.status = 'ACTIVE'
  AND e.role IN ('ADMIN', 'SUPER_ADMIN');

-- 4. Count summary
SELECT 
  COUNT(*) as total_tenants,
  COUNT(t.owner_id) as tenants_with_owner_id,
  COUNT(*) - COUNT(t.owner_id) as tenants_needing_fix,
  ROUND(100.0 * COUNT(t.owner_id) / COUNT(*), 1) || '%' as pct_configured
FROM tenants t;

-- =============================================================================
-- Quick Actions Based on Results
-- =============================================================================

-- If Status = "NO OWNER_ID - NEEDS FIX":
--   Run: EMERGENCY_FIX_TENANT.sql

-- If Status = "OWNER_ID SET BUT USER NOT FOUND":
--   The owner_id is invalid. Check Supabase Auth → Users
--   You may need to create a new user or update owner_id

-- If you see "TENANT OWNER IS AN ADMIN":
--   CRITICAL: Admin separation violated! 
--   Create a separate tenant owner user
--   Update tenant.owner_id to new user

-- If Action Needed = "CAN BE FIXED - RUN UPDATE":
--   Run the UPDATE statement from EMERGENCY_FIX_TENANT.sql
