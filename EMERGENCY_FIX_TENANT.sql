-- =============================================================================
-- EMERGENCY FIX: Update Current Tenant with owner_id
-- =============================================================================
-- Run this in Supabase SQL Editor to fix the tenant you're currently testing
-- =============================================================================

-- Step 1: Find the tenant you're working with (look at the most recent one)
SELECT 
  t.id as tenant_id,
  t.name,
  t.slug,
  t.email as tenant_email,
  t.owner_id as current_owner_id,  -- This is probably NULL
  ap.user_id as owner_from_auto_provisioning,
  ap.login_email,
  ap.status,
  t.created_at
FROM tenants t
LEFT JOIN auto_provisioning ap ON t.id = ap.tenant_id
ORDER BY t.created_at DESC
LIMIT 5;

-- Step 2: Quick fix for the most recent tenant (adjust if needed)
-- IMPORTANT: Review the tenant ID from Step 1 before running this!

-- Option A: Update using the most recent tenant's auto_provisioning
UPDATE tenants t
SET 
  owner_id = ap.user_id,
  updated_at = NOW()
FROM auto_provisioning ap
WHERE t.id = ap.tenant_id
  AND t.owner_id IS NULL
  AND ap.status = 'completed'
  AND t.id = (
    -- Get the most recent tenant without owner_id
    SELECT id FROM tenants 
    WHERE owner_id IS NULL 
    ORDER BY created_at DESC 
    LIMIT 1
  );

-- Step 3: Verify the update
SELECT 
  t.id,
  t.name,
  t.slug,
  t.owner_id,
  p.email as owner_email_from_profiles,
  p.role as owner_role
FROM tenants t
LEFT JOIN profiles p ON t.owner_id = p.user_id
WHERE t.id = (
  SELECT id FROM tenants ORDER BY updated_at DESC LIMIT 1
);

-- Expected: owner_id should now be a valid UUID, and profiles should show owner email

-- Step 4: Verify the owner user exists in auth
-- Copy the owner_id from Step 3 and replace YOUR_OWNER_ID_HERE:
-- Then check in Supabase Dashboard → Authentication → Users
-- Search for the owner_id (user ID) to confirm it exists

-- =============================================================================
-- If owner_id is still NULL after running this:
-- =============================================================================
-- The tenant might not have an auto_provisioning record
-- Check manually:

SELECT * FROM auto_provisioning 
WHERE tenant_id = 'YOUR_TENANT_ID_HERE';

-- If no record exists, you need to create the owner user manually
-- Or create a NEW tenant (which will use the fixed provision_tenant function)
