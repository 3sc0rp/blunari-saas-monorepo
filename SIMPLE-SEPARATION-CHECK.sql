-- =============================================================================
-- SIMPLE CHECK: Admin vs Tenant Separation Status
-- =============================================================================
-- Run this in Supabase SQL Editor to check current state

-- 1. Show all admin users
SELECT 
  '👤 ADMIN USER' as type,
  au.id as user_id,
  au.email,
  e.role::text as role
FROM auth.users au
JOIN employees e ON e.user_id = au.id
WHERE e.status = 'ACTIVE';

-- 2. Show all tenants and their owner status
SELECT 
  '🏪 TENANT' as type,
  t.id as tenant_id,
  t.name as tenant_name,
  t.email as tenant_email,
  t.owner_id,
  CASE 
    WHEN t.owner_id IS NULL THEN '❌ NO OWNER'
    WHEN EXISTS (SELECT 1 FROM employees WHERE user_id = t.owner_id AND status = 'ACTIVE') THEN '🚨 LINKED TO ADMIN!'
    ELSE '✅ HAS SEPARATE OWNER'
  END as owner_status,
  au.email as owner_email
FROM tenants t
LEFT JOIN auth.users au ON au.id = t.owner_id
ORDER BY t.name;

-- 3. Check auto_provisioning for bad admin links
SELECT 
  '🔗 AUTO-PROVISIONING' as type,
  ap.tenant_id,
  t.name as tenant_name,
  ap.user_id,
  au.email as user_email,
  CASE 
    WHEN EXISTS (SELECT 1 FROM employees WHERE user_id = ap.user_id AND status = 'ACTIVE') THEN '🚨 ADMIN USER (BAD!)'
    ELSE '✅ Non-admin user'
  END as user_type
FROM auto_provisioning ap
JOIN tenants t ON t.id = ap.tenant_id
LEFT JOIN auth.users au ON au.id = ap.user_id
WHERE ap.status = 'completed'
ORDER BY t.name;

-- 4. Summary
SELECT 
  COUNT(DISTINCT e.user_id) as admin_users_count,
  COUNT(DISTINCT t.id) as total_tenants,
  COUNT(DISTINCT CASE WHEN t.owner_id IS NOT NULL THEN t.id END) as tenants_with_owners,
  COUNT(DISTINCT CASE WHEN t.owner_id IS NULL THEN t.id END) as tenants_without_owners,
  COUNT(DISTINCT CASE 
    WHEN EXISTS (SELECT 1 FROM employees WHERE user_id = t.owner_id AND status = 'ACTIVE') 
    THEN t.id 
  END) as tenants_linked_to_admin
FROM employees e
CROSS JOIN tenants t
WHERE e.status = 'ACTIVE';
