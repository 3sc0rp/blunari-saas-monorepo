-- =============================================================================
-- FIX: Update Existing Tenants with owner_id
-- =============================================================================
-- Purpose: Populate owner_id for tenants created before the provision_tenant fix
-- Context: Migration 20251022000001 fixed provision_tenant to set owner_id,
--          but existing tenants still have NULL owner_id
-- Run: Copy this entire script and run in Supabase SQL Editor
-- =============================================================================

-- Step 1: Check how many tenants need fixing
SELECT 
  COUNT(*) as total_tenants_without_owner,
  COUNT(DISTINCT ap.user_id) as unique_owners_found
FROM tenants t
LEFT JOIN auto_provisioning ap ON t.id = ap.tenant_id
WHERE t.owner_id IS NULL
  AND ap.status = 'completed';

-- Expected: Should show number of tenants that need fixing

-- Step 2: Preview the updates that will be made
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  t.slug as tenant_slug,
  t.owner_id as current_owner_id,  -- Should be NULL
  ap.user_id as new_owner_id,      -- Will be set
  ap.login_email as owner_email
FROM tenants t
INNER JOIN auto_provisioning ap ON t.id = ap.tenant_id
WHERE t.owner_id IS NULL
  AND ap.status = 'completed'
ORDER BY t.created_at DESC;

-- Review the preview above before running the update!

-- Step 3: Update tenants with owner_id from auto_provisioning
UPDATE tenants t
SET 
  owner_id = ap.user_id,
  updated_at = NOW()
FROM auto_provisioning ap
WHERE t.id = ap.tenant_id
  AND t.owner_id IS NULL
  AND ap.status = 'completed';

-- Step 4: Verify the updates
SELECT 
  id,
  name,
  slug,
  owner_id,
  email,
  created_at,
  updated_at
FROM tenants
WHERE owner_id IS NOT NULL
ORDER BY updated_at DESC;

-- Step 5: Check if any tenants still have NULL owner_id
SELECT 
  id,
  name,
  slug,
  email,
  created_at
FROM tenants
WHERE owner_id IS NULL;

-- If tenants still have NULL owner_id, they might not have auto_provisioning records
-- Manual intervention required for those cases

-- =============================================================================
-- Verification Queries
-- =============================================================================

-- Check that owner_id matches valid auth users
SELECT 
  t.id,
  t.name,
  t.owner_id,
  p.email as owner_email,
  p.role as owner_role
FROM tenants t
LEFT JOIN profiles p ON t.owner_id = p.user_id
WHERE t.owner_id IS NOT NULL
ORDER BY t.created_at DESC;

-- Expected: All tenants should have matching profiles with role 'owner'

-- Check for any orphaned tenants (owner_id doesn't match any user)
SELECT 
  t.id,
  t.name,
  t.owner_id,
  'ORPHANED - owner user not found' as issue
FROM tenants t
LEFT JOIN profiles p ON t.owner_id = p.user_id
WHERE t.owner_id IS NOT NULL
  AND p.user_id IS NULL;

-- Expected: Should return 0 rows (no orphaned tenants)

-- =============================================================================
-- Rollback (if needed)
-- =============================================================================
-- UNCOMMENT AND RUN ONLY IF YOU NEED TO UNDO THE UPDATE
-- WARNING: This will set owner_id back to NULL for all tenants updated in last 10 minutes

/*
UPDATE tenants
SET owner_id = NULL
WHERE updated_at > NOW() - INTERVAL '10 minutes';
*/

-- =============================================================================
-- Success Criteria
-- =============================================================================
-- ✅ All tenants should have owner_id populated
-- ✅ owner_id should match user_id in auto_provisioning
-- ✅ owner_id should correspond to valid auth user (check profiles table)
-- ✅ No orphaned tenants (owner_id without matching user)
