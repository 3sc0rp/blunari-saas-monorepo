-- =====================================================================
-- FIX: Test Restaurant Owner Issue
-- =====================================================================
-- The tenant is linked to admin user, needs separate owner
-- =====================================================================

-- Step 1: Check current status
SELECT 
  '🔍 CURRENT STATUS' as step,
  t.id as tenant_id,
  t.name as tenant_name,
  t.email as tenant_email,
  t.owner_id,
  au.email as owner_email,
  CASE 
    WHEN EXISTS (SELECT 1 FROM employees WHERE user_id = t.owner_id AND status = 'ACTIVE')
    THEN '🚨 ADMIN USER (BAD!)'
    ELSE '✅ Separate owner'
  END as owner_type
FROM tenants t
LEFT JOIN auth.users au ON au.id = t.owner_id
WHERE t.name LIKE '%Test Restaurant%';

-- Step 2: Set owner_id to NULL (will trigger Edge Function to create new owner on next email change)
-- UNCOMMENT TO RUN:
/*
UPDATE tenants
SET owner_id = NULL
WHERE name LIKE '%Test Restaurant%';
*/

-- Step 3: Verify the fix
-- After running the update, check again:
SELECT 
  '✅ AFTER FIX' as step,
  t.id as tenant_id,
  t.name as tenant_name,
  t.email as tenant_email,
  t.owner_id,
  CASE 
    WHEN t.owner_id IS NULL THEN '✅ Ready for owner creation'
    ELSE 'Still has owner_id'
  END as status
FROM tenants t
WHERE t.name LIKE '%Test Restaurant%';

-- =====================================================================
-- INSTRUCTIONS:
-- =====================================================================
-- 1. Run Step 1 query to see current status
-- 2. If owner_type shows '🚨 ADMIN USER', uncomment and run Step 2
-- 3. Run Step 3 to verify
-- 4. In the UI, change the tenant email to any email
-- 5. The Edge Function will automatically create a new separate owner
-- =====================================================================
