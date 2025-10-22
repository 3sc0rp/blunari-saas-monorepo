-- =============================================================================
-- FIX: Create Separate Owner for Warrior Factory
-- =============================================================================
-- This will update Warrior Factory to use its own dedicated owner account
-- =============================================================================

-- Step 1: First, check current state
SELECT 
  t.id as tenant_id,
  t.name,
  t.slug,
  t.owner_id as current_owner_id,
  t.email as tenant_email,
  'Current owner (shared with others)' as note
FROM tenants t
WHERE t.slug = 'wfactory';

-- Step 2: Check auto_provisioning for Warrior Factory
SELECT 
  ap.id,
  ap.tenant_id,
  ap.user_id as provisioned_user_id,
  ap.login_email,
  ap.restaurant_slug,
  'This is the current provisioned user (might be shared!)' as note
FROM auto_provisioning ap
WHERE ap.restaurant_slug = 'wfactory';

-- =============================================================================
-- MANUAL FIX REQUIRED
-- =============================================================================
-- The issue is that all tenants are sharing the same auth user.
-- We need to create a NEW auth user specifically for Warrior Factory.
--
-- YOU NEED TO DO THIS IN THE ADMIN DASHBOARD:
-- =============================================================================
-- 
-- Option 1: Recreate the Tenant (RECOMMENDED - Easiest)
-- -------------------------------------------------------
-- 1. Delete "Warrior Factory" tenant from admin dashboard
-- 2. Create it again with:
--    - Name: Warrior Factory  
--    - Slug: wfactory
--    - Owner Email: wfactory@gmail.com (MUST BE UNIQUE!)
-- 3. The new tenant will get its own dedicated owner user
-- 4. Email updates will work properly
--
-- Option 2: Use the Admin Dashboard to Create New Owner (Complex)
-- ---------------------------------------------------------------
-- This requires creating a new auth user manually and updating the database.
-- Not recommended - just recreate the tenant instead.
--
-- =============================================================================

-- After recreating, verify it worked:
SELECT 
  t.name,
  t.slug,
  t.owner_id,
  p.email as owner_email,
  'Should show wfactory@gmail.com' as expected
FROM tenants t
LEFT JOIN profiles p ON t.owner_id = p.user_id
WHERE t.slug = 'wfactory';
