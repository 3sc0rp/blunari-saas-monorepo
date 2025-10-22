-- Delete the incorrect auto_provisioning record for Warrior Factory
-- This is blocking the creation of the correct owner account

DELETE FROM auto_provisioning 
WHERE tenant_id = (SELECT id FROM tenants WHERE name = 'Warrior Factory');

-- Verify deletion
SELECT 
  'Auto-provisioning deleted' as status,
  COUNT(*) as remaining_records,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Successfully deleted - ready for new owner'
    ELSE '⚠️ Still has records'
  END as result
FROM auto_provisioning 
WHERE tenant_id = (SELECT id FROM tenants WHERE name = 'Warrior Factory');

-- Show current tenant state
SELECT 
  'Current tenant state' as status,
  t.id,
  t.name,
  t.email as tenant_email,
  t.owner_id,
  u.email as current_owner_email
FROM tenants t
LEFT JOIN auth.users u ON u.id = t.owner_id
WHERE t.name = 'Warrior Factory';

-- ============================================================================
-- AFTER RUNNING THIS:
-- ============================================================================
-- 1. Go to Admin Dashboard: https://admin.blunari.ai
-- 2. Navigate to Tenants > Warrior Factory
-- 3. Click the "Password Setup Email" button at the top
-- 4. This will create wfactory@gmail.com owner account
-- 5. Check your email for the password setup link
-- ============================================================================
