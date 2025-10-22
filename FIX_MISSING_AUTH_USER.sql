-- =============================================================================
-- EMERGENCY FIX: Create Missing Auth User for Tenant Owner
-- =============================================================================
-- Use this if the tenant has owner_id but the auth user doesn't exist
-- =============================================================================

-- Step 1: Identify the problem tenant
-- Run DEBUG_OWNER_AUTH.sql first to get the owner_id

-- Step 2: If auth user is missing, create it manually
-- You'll need to do this in Supabase Dashboard → Authentication → Add User
-- OR we can update the tenant to use the auto_provisioning user_id instead

-- OPTION A: Use the user from auto_provisioning (RECOMMENDED)
-- This swaps the owner_id to use the actual provisioned user

UPDATE tenants t
SET 
  owner_id = ap.user_id,
  updated_at = NOW()
FROM auto_provisioning ap
WHERE t.id = ap.tenant_id
  AND ap.status = 'completed'
  AND t.slug = 'dpizza';  -- CHANGE THIS to your tenant slug

-- Verify
SELECT 
  t.slug,
  t.owner_id as new_owner_id,
  ap.login_email,
  'Updated to use provisioned user' as status
FROM tenants t
JOIN auto_provisioning ap ON t.id = ap.tenant_id
WHERE t.slug = 'dpizza';  -- CHANGE THIS

-- =============================================================================
-- After running this, try the email update again
-- =============================================================================
