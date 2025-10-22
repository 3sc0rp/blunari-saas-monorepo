-- =============================================================================
-- DEBUG: Check if tenant owner_id matches actual auth users
-- =============================================================================
-- This will tell us if the owner_id is valid or points to a deleted/non-existent user
-- =============================================================================

-- Step 1: Get the tenant you're trying to update
-- Replace 'dpizza' with your tenant slug or use the tenant_id from the error
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  t.slug,
  t.owner_id,
  t.email as tenant_email,
  '👇 Check if this owner_id exists in auth.users in Dashboard' as note
FROM tenants t
WHERE t.slug = 'dpizza'  -- or whatever tenant you're testing with
   OR t.name = 'droodwick';

-- Step 2: Check if profiles exist for the owner_id
SELECT 
  p.user_id,
  p.email,
  p.role,
  'Profile exists ✅' as status
FROM profiles p
WHERE p.user_id IN (
  SELECT owner_id FROM tenants WHERE slug = 'dpizza' OR name = 'droodwick'
);

-- Step 3: Check auto_provisioning for this tenant
SELECT 
  ap.tenant_id,
  ap.user_id,
  ap.login_email,
  ap.status,
  'This is the user_id that should be owner_id' as note
FROM auto_provisioning ap
WHERE ap.tenant_id IN (
  SELECT id FROM tenants WHERE slug = 'dpizza' OR name = 'droodwick'
);

-- =============================================================================
-- IMPORTANT: Check Supabase Auth Dashboard
-- =============================================================================
-- Go to: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/auth/users
-- Search for the owner_id from Step 1
-- 
-- If user NOT FOUND:
--   The owner_id is invalid! The auth user was deleted or never created.
--   We need to create a new auth user for this tenant.
-- 
-- If user FOUND:
--   The owner_id is valid. The issue might be:
--   - Email already taken by another user
--   - Email confirmation required
--   - Auth settings preventing update
-- =============================================================================
