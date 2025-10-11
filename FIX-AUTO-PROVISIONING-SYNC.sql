-- =============================================================================
-- FIX AUTO_PROVISIONING SYNC
-- =============================================================================
-- This script syncs auto_provisioning.user_id with tenants.owner_id
-- Run this if the UI shows wrong credentials

-- Step 1: Show current mismatches
SELECT 
  '❌ MISMATCHED' as status,
  t.name as tenant_name,
  t.owner_id as tenant_owner_id,
  ap.user_id as autoprov_user_id,
  au_tenant.email as should_be_email,
  au_autoprov.email as currently_showing_email
FROM tenants t
LEFT JOIN auto_provisioning ap ON ap.tenant_id = t.id
LEFT JOIN auth.users au_tenant ON au_tenant.id = t.owner_id
LEFT JOIN auth.users au_autoprov ON au_autoprov.id = ap.user_id
WHERE t.owner_id IS NOT NULL 
  AND (ap.user_id IS NULL OR t.owner_id != ap.user_id);

-- Step 2: Fix droodwick specifically
UPDATE auto_provisioning
SET user_id = '4acd8f0e-e7a8-4860-8f20-6ea74b3d48a6'
WHERE tenant_id IN (SELECT id FROM tenants WHERE name = 'droodwick');

-- Step 3: Verify the fix
SELECT 
  '✅ VERIFICATION' as status,
  t.name,
  t.owner_id,
  ap.user_id,
  au.email,
  CASE 
    WHEN t.owner_id = ap.user_id THEN '✅ SYNCED'
    ELSE '❌ Still wrong'
  END as sync_status
FROM tenants t
LEFT JOIN auto_provisioning ap ON ap.tenant_id = t.id
LEFT JOIN auth.users au ON au.id = ap.user_id
WHERE t.name = 'droodwick';

-- Step 4: General fix for all tenants (optional - run if needed)
/*
UPDATE auto_provisioning ap
SET user_id = t.owner_id
FROM tenants t
WHERE ap.tenant_id = t.id
  AND t.owner_id IS NOT NULL
  AND ap.user_id != t.owner_id;
*/

COMMENT ON TABLE auto_provisioning IS 'After running this, refresh your admin dashboard to see updated credentials';
