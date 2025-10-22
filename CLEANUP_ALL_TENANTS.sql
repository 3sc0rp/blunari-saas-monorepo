-- =============================================================================
-- MANUAL CLEANUP: Delete All Test Tenants and Start Fresh
-- =============================================================================
-- WARNING: This will permanently delete tenants and their data!
-- Only run this if you're ready to recreate all tenants from scratch
-- =============================================================================

-- Step 1: See what will be deleted
SELECT 
  id,
  name,
  slug,
  owner_id,
  email,
  created_at,
  'Will be DELETED' as warning
FROM tenants
ORDER BY created_at DESC;

-- Step 2: BACKUP - Save tenant info before deleting (optional)
-- Copy the results from Step 1 to a text file if you want to keep the names/slugs

-- Step 3: Delete tenants (this cascades to related tables)
-- UNCOMMENT THE LINES BELOW WHEN READY TO DELETE:

/*
DELETE FROM tenants 
WHERE id IN (
  SELECT id FROM tenants
  -- Add WHERE clause if you want to keep some tenants
  -- For example: WHERE slug NOT IN ('production-tenant')
);
*/

-- Step 4: Verify deletion
SELECT COUNT(*) as remaining_tenants FROM tenants;

-- Step 5: Clean up orphaned records (if any)
-- UNCOMMENT WHEN READY:

/*
-- Delete auto_provisioning records without tenants
DELETE FROM auto_provisioning 
WHERE tenant_id IS NULL 
   OR tenant_id NOT IN (SELECT id FROM tenants);

-- Delete profiles for tenant owners (keep admin profiles!)
DELETE FROM profiles 
WHERE role = 'owner' 
  AND user_id NOT IN (
    SELECT owner_id FROM tenants WHERE owner_id IS NOT NULL
  );
*/

-- =============================================================================
-- After cleanup, you can:
-- 1. Go to admin dashboard
-- 2. Create new tenants with UNIQUE owner emails
-- 3. Each will get its own dedicated owner user
-- 4. Everything will work correctly!
-- =============================================================================

-- Verify cleanup is complete:
SELECT 
  'tenants' as table_name, 
  COUNT(*) as count 
FROM tenants
UNION ALL
SELECT 
  'auto_provisioning', 
  COUNT(*) 
FROM auto_provisioning
UNION ALL
SELECT 
  'profiles (owners only)', 
  COUNT(*) 
FROM profiles 
WHERE role = 'owner';
