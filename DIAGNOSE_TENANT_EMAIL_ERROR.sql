-- Diagnostic script for tenant email update 500 error
-- INSTRUCTIONS: Replace the tenant ID in the WITH clause below with your actual tenant UUID
-- Example: WITH target AS (SELECT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid as tenant_id)

WITH target AS (
  -- ⚠️ REPLACE THIS UUID WITH YOUR ACTUAL TENANT ID ⚠️
  SELECT '00000000-0000-0000-0000-000000000000'::uuid as tenant_id
)

-- Step 1: Check tenant basic info
SELECT 
  'Step 1: Tenant Basic Info' as check_name,
  t.id,
  t.name,
  t.slug,
  t.email as tenant_email,
  t.owner_id,
  t.status,
  t.created_at
FROM tenants t, target
WHERE t.id = target.tenant_id;

-- Step 2: Check if owner_id exists in auth.users
SELECT 
  'Step 2: Owner Auth Check' as check_name,
  t.id as tenant_id,
  t.name,
  t.owner_id,
  u.email as auth_email,
  u.created_at as auth_created,
  u.email_confirmed_at,
  u.last_sign_in_at,
  CASE 
    WHEN t.owner_id IS NULL THEN '⚠️ No owner_id set'
    WHEN u.id IS NULL THEN '❌ owner_id points to non-existent user'
    ELSE '✅ Valid owner'
  END as status
FROM tenants t, target
LEFT JOIN auth.users u ON u.id = t.owner_id
WHERE t.id = target.tenant_id;

-- Step 3: Check if owner is an admin (should be FALSE)
SELECT 
  'Step 3: Admin Check' as check_name,
  t.id as tenant_id,
  t.name,
  t.owner_id,
  e.id as employee_id,
  e.role as employee_role,
  e.status as employee_status,
  CASE 
    WHEN e.id IS NULL THEN '✅ Owner is NOT an admin (correct)'
    ELSE '❌ CRITICAL: Owner is an admin user!'
  END as status
FROM tenants t, target
LEFT JOIN employees e ON e.user_id = t.owner_id AND e.status = 'ACTIVE'
WHERE t.id = target.tenant_id;

-- Step 4: Check auto_provisioning status
SELECT 
  'Step 4: Auto-Provisioning' as check_name,
  ap.tenant_id,
  ap.user_id,
  ap.status as provisioning_status,
  ap.completed_at,
  u.email as provisioned_user_email,
  CASE 
    WHEN ap.tenant_id IS NULL THEN '⚠️ No auto_provisioning record'
    WHEN ap.status = 'completed' THEN '✅ Provisioning completed'
    ELSE '⚠️ Provisioning not completed'
  END as status
FROM target
LEFT JOIN auto_provisioning ap ON ap.tenant_id = target.tenant_id
LEFT JOIN auth.users u ON u.id = ap.user_id;

-- Step 5: Check if tenant email is used by another user
SELECT 
  'Step 5: Email Conflict Check' as check_name,
  t.email as tenant_email,
  u.id as user_id,
  u.email as auth_email,
  u.created_at,
  e.role as is_employee_role,
  CASE 
    WHEN t.email IS NULL THEN '⚠️ Tenant has no email'
    WHEN u.id IS NULL THEN '✅ Email not in use'
    WHEN e.role IS NOT NULL THEN '❌ Email belongs to admin'
    ELSE '⚠️ Email belongs to another user'
  END as status
FROM tenants t, target
LEFT JOIN auth.users u ON u.email = t.email
LEFT JOIN employees e ON e.user_id = u.id AND e.status = 'ACTIVE'
WHERE t.id = target.tenant_id;

-- Step 6: Check if system email already exists
SELECT 
  'Step 6: System Email Check' as check_name,
  target.tenant_id,
  CONCAT('tenant-', target.tenant_id::text, '@blunari-system.local') as system_email,
  u.id as existing_user_id,
  u.email as existing_email,
  u.created_at,
  CASE 
    WHEN u.id IS NULL THEN '✅ System email available'
    ELSE '⚠️ System email already exists (will reuse)'
  END as status
FROM target
LEFT JOIN auth.users u ON u.email = CONCAT('tenant-', target.tenant_id::text, '@blunari-system.local');

-- Step 7: Check profile for owner
SELECT 
  'Step 7: Profile Check' as check_name,
  t.id as tenant_id,
  t.owner_id,
  p.id as profile_id,
  p.user_id as profile_user_id,
  p.email as profile_email,
  p.role as profile_role,
  CASE 
    WHEN t.owner_id IS NULL THEN '⚠️ No owner_id'
    WHEN p.id IS NULL THEN '⚠️ No profile for owner'
    ELSE '✅ Profile exists'
  END as status
FROM tenants t, target
LEFT JOIN profiles p ON p.user_id = t.owner_id
WHERE t.id = target.tenant_id;

-- Recommended Actions Based on Results:
-- 
-- ✅ If owner_id is NULL:
--   → Edge Function will auto-create owner account
--   → This is normal for new tenants
--
-- ❌ If owner_id exists but auth user doesn't (Step 2):
--   → Run: UPDATE tenants SET owner_id = NULL WHERE id = '<your-tenant-id>';
--   → Then retry email update in admin dashboard
--
-- ❌ If owner is an admin (Step 3 shows employee_role):
--   → CRITICAL: This is a data integrity issue
--   → DO NOT proceed with email update
--   → Contact support or run fix-tenant-owner function
--
-- ⚠️ If tenant email matches admin email (Step 5):
--   → Edge Function will use system email: tenant-{id}@blunari-system.local
--   → This is expected behavior
--
-- ⚠️ If system email already exists (Step 6):
--   → Edge Function will reuse existing account
--   → Verify that account is correctly linked to this tenant
--
-- ⚠️ If no profile exists (Step 7):
--   → Edge Function will create profile during owner creation
--   → This is not critical

-- Alternative: Simple check for a specific tenant
-- Just replace the UUID below:
/*
SELECT 
  t.id,
  t.name,
  t.email,
  t.owner_id,
  u.email as owner_auth_email,
  CASE 
    WHEN t.owner_id IS NULL THEN 'Will create owner'
    WHEN u.id IS NULL THEN 'ERROR: Invalid owner_id'
    WHEN e.id IS NOT NULL THEN 'ERROR: Owner is admin!'
    ELSE 'OK'
  END as status
FROM tenants t
LEFT JOIN auth.users u ON u.id = t.owner_id
LEFT JOIN employees e ON e.user_id = t.owner_id AND e.status = 'ACTIVE'
WHERE t.id = '00000000-0000-0000-0000-000000000000'; -- Replace with actual tenant ID
*/
