-- =============================================================================
-- DEBUG: Warrior Factory Tenant
-- =============================================================================

-- Step 1: Check tenant owner_id
SELECT 
  t.id as tenant_id,
  t.name,
  t.slug,
  t.owner_id,
  t.email as tenant_email,
  t.created_at,
  '👇 Copy this owner_id and check in Auth Dashboard' as instruction
FROM tenants t
WHERE t.slug = 'wfactory';

-- Step 2: Check if profile exists for this owner
SELECT 
  p.user_id,
  p.email as profile_email,
  p.role,
  p.first_name,
  p.last_name,
  'Profile found ✅' as status
FROM profiles p
WHERE p.user_id = (SELECT owner_id FROM tenants WHERE slug = 'wfactory');

-- Step 3: Check auto_provisioning
SELECT 
  ap.id,
  ap.tenant_id,
  ap.user_id as provisioned_user_id,
  ap.login_email,
  ap.restaurant_name,
  ap.status,
  ap.created_at
FROM auto_provisioning ap
WHERE ap.restaurant_slug = 'wfactory'
   OR ap.tenant_id = (SELECT id FROM tenants WHERE slug = 'wfactory');

-- Step 4: Compare owner_id with provisioned user_id
SELECT 
  t.owner_id as tenant_owner_id,
  ap.user_id as auto_provision_user_id,
  CASE 
    WHEN t.owner_id = ap.user_id THEN '✅ MATCH - Good!'
    WHEN t.owner_id IS NULL THEN '❌ NULL owner_id'
    WHEN ap.user_id IS NULL THEN '❌ No auto_provisioning record'
    ELSE '⚠️ MISMATCH - owner_id (' || t.owner_id || ') != provisioned (' || ap.user_id || ')'
  END as status,
  t.email as tenant_email,
  ap.login_email as provisioned_email
FROM tenants t
LEFT JOIN auto_provisioning ap ON t.id = ap.tenant_id
WHERE t.slug = 'wfactory';

-- =============================================================================
-- NEXT STEP: Check Supabase Auth
-- =============================================================================
-- 1. Go to: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/auth/users
-- 2. Copy the owner_id from Step 1 above
-- 3. Search for it in the Users list
-- 4. Does the user exist?
--    - YES: Check what email it has
--    - NO: The auth user is missing (this is the problem!)
-- =============================================================================
