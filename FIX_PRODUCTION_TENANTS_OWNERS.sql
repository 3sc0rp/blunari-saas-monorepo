-- =============================================================================
-- PRODUCTION SAFE: Separate Shared Tenant Owners
-- =============================================================================
-- This script separates production tenants that currently share the same owner_id
-- Safe to run - creates NEW auth users, doesn't modify existing ones
-- UPDATED: Use fix-tenant-owner Edge Function (RECOMMENDED)
-- =============================================================================

-- Step 1: Verify current state (CHECK ONLY - NO CHANGES)
-- Run this first to see which tenants need fixing
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  t.slug,
  t.owner_id,
  p.email as current_owner_email,
  COUNT(*) OVER (PARTITION BY t.owner_id) as tenants_sharing_this_owner
FROM tenants t
LEFT JOIN profiles p ON t.owner_id = p.user_id
WHERE t.owner_id IS NOT NULL
ORDER BY t.created_at;

-- =============================================================================
-- MANUAL STEPS - DO THIS FOR EACH TENANT
-- =============================================================================
-- You need to create a new auth user for each tenant manually in Supabase Auth
-- Then update the tenant's owner_id to point to the new user
-- =============================================================================

-- FOR TENANT: Warrior Factory (wfactory)
-- 1. Go to Supabase Auth Dashboard: 
--    https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/auth/users
-- 2. Click "Add User" (top right)
-- 3. Fill in:
--    Email: wfactory-owner@yourdomain.com  (MUST BE UNIQUE!)
--    Password: Generate a secure password
--    Auto Confirm User: YES
-- 4. Copy the new user's ID
-- 5. Run this UPDATE (replace NEW_USER_ID with the ID from step 4):

/*
-- Update Warrior Factory to use new owner
UPDATE tenants 
SET owner_id = 'NEW_USER_ID_HERE',  -- Paste the user ID from Supabase Auth
    updated_at = NOW()
WHERE slug = 'wfactory';

-- Create profile for new owner
INSERT INTO profiles (user_id, email, role, first_name)
VALUES (
  'NEW_USER_ID_HERE',  -- Same user ID
  'wfactory-owner@yourdomain.com',  -- Same email used in Auth
  'owner',
  'Warrior Factory Owner'
)
ON CONFLICT (user_id) DO UPDATE 
SET email = EXCLUDED.email, role = 'owner';

-- Update auto_provisioning
UPDATE auto_provisioning
SET user_id = 'NEW_USER_ID_HERE',
    login_email = 'wfactory-owner@yourdomain.com'
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'wfactory');
*/

-- =============================================================================
-- REPEAT FOR EACH TENANT
-- =============================================================================

-- FOR TENANT: Nature Village (nature-village)
/*
-- 1. Create user in Supabase Auth: nature-owner@yourdomain.com
-- 2. Copy user ID
-- 3. Run:

UPDATE tenants 
SET owner_id = 'NEW_USER_ID_HERE',
    updated_at = NOW()
WHERE slug = 'nature-village';

INSERT INTO profiles (user_id, email, role, first_name)
VALUES ('NEW_USER_ID_HERE', 'nature-owner@yourdomain.com', 'owner', 'Nature Village Owner')
ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email, role = 'owner';

UPDATE auto_provisioning
SET user_id = 'NEW_USER_ID_HERE', login_email = 'nature-owner@yourdomain.com'
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'nature-village');
*/

-- FOR TENANT: droodwick (dpizza)
/*
-- 1. Create user in Supabase Auth: dpizza-owner@yourdomain.com
-- 2. Copy user ID
-- 3. Run:

UPDATE tenants 
SET owner_id = 'NEW_USER_ID_HERE',
    updated_at = NOW()
WHERE slug = 'dpizza';

INSERT INTO profiles (user_id, email, role, first_name)
VALUES ('NEW_USER_ID_HERE', 'dpizza-owner@yourdomain.com', 'owner', 'Dpizza Owner')
ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email, role = 'owner';

UPDATE auto_provisioning
SET user_id = 'NEW_USER_ID_HERE', login_email = 'dpizza-owner@yourdomain.com'
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'dpizza');
*/

-- =============================================================================
-- VERIFY - After updating all tenants
-- =============================================================================
SELECT 
  t.name,
  t.slug,
  t.owner_id,
  p.email as owner_email,
  CASE 
    WHEN COUNT(*) OVER (PARTITION BY t.owner_id) > 1 THEN '⚠️ STILL SHARED'
    ELSE '✅ UNIQUE OWNER'
  END as status
FROM tenants t
LEFT JOIN profiles p ON t.owner_id = p.user_id
ORDER BY t.name;

-- Expected: Each tenant should show "✅ UNIQUE OWNER" and different owner_id

-- =============================================================================
-- IMPORTANT NOTES
-- =============================================================================
-- ✅ This preserves ALL tenant data (bookings, tables, menus, etc.)
-- ✅ Only changes the owner user linkage
-- ✅ Each tenant gets its own dedicated login credentials
-- ✅ No disruption to operations or customer bookings
-- ⚠️  You'll need to give each tenant owner their new login credentials
-- =============================================================================
