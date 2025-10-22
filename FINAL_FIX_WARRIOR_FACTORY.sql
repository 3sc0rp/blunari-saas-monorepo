-- FINAL FIX for Warrior Factory
-- Current state: tenant email = addictedave@gmail.com, owner = naturevillage2024@gmail.com
-- Goal: Keep addictedave@gmail.com and sync the owner to match

-- Step 1: Tenant email is already addictedave@gmail.com (no change needed)
-- Just verifying current state
SELECT 
  'Current state (before fix)' as status,
  t.email as tenant_email,
  u.email as owner_email,
  'Emails do not match!' as issue
FROM tenants t
LEFT JOIN auth.users u ON u.id = t.owner_id
WHERE t.name = 'Warrior Factory';

-- Step 2: Delete the old auto_provisioning record (points to wrong user)
DELETE FROM auto_provisioning 
WHERE tenant_id = (SELECT id FROM tenants WHERE name = 'Warrior Factory');

-- Step 3: Verify everything is ready
SELECT 
  '✅ Ready for new owner creation' as status,
  t.id as tenant_id,
  t.name,
  t.email as tenant_email,
  t.owner_id as old_owner_id,
  u.email as old_owner_email,
  'Will create owner with addictedave@gmail.com' as note
FROM tenants t
LEFT JOIN auth.users u ON u.id = t.owner_id
WHERE t.name = 'Warrior Factory';

-- ============================================================================
-- NEXT STEPS - DO THIS IN ADMIN DASHBOARD:
-- ============================================================================
-- After running this SQL:
--
-- 1. Open: https://admin.blunari.ai/admin/tenants
-- 2. Click on "Warrior Factory"
-- 3. Look for the "Password Setup Email" button (top right area)
-- 4. Click it
-- 5. The Edge Function will:
--    - See tenant email is addictedave@gmail.com
--    - Create NEW auth user with addictedave@gmail.com
--    - Update tenant.owner_id to point to new user
--    - Create new auto_provisioning record
--    - Send password setup email to addictedave@gmail.com
--
-- The old naturevillage2024@gmail.com owner will be replaced
-- ============================================================================
