-- SIMPLE FIX for Warrior Factory
-- Just update the tenant email in the database
-- Then use the admin dashboard to trigger the Edge Function

-- Step 1: Update tenant email to wfactory@gmail.com
UPDATE tenants 
SET email = 'wfactory@gmail.com'
WHERE name = 'Warrior Factory';

-- Step 2: Verify the update
SELECT 
  'Updated' as status,
  id,
  name,
  email,
  owner_id,
  'Now go to admin dashboard and click "Password Setup Email" button' as next_step
FROM tenants 
WHERE name = 'Warrior Factory';

-- ============================================================================
-- NEXT STEPS (DO THIS IN ADMIN DASHBOARD):
-- ============================================================================
-- 1. Go to Admin Dashboard > Tenants > Warrior Factory
-- 2. Click the "Password Setup Email" button
-- 3. This will invoke the tenant-password-setup-email Edge Function
-- 4. That function will create the wfactory@gmail.com owner account
-- 5. A password setup email will be sent to wfactory@gmail.com
--
-- OR (if you need to update immediately):
-- 1. Update any other tenant field (like phone or description)
-- 2. The updateTenant() function will call manage-tenant-credentials
-- 3. The Edge Function will auto-create the wfactory@gmail.com owner
-- ============================================================================
