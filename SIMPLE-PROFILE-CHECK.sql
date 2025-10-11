-- =============================================================================
-- SIMPLE PROFILE INTEGRITY CHECK
-- Run this on your PRODUCTION database via Supabase Dashboard
-- =============================================================================

-- Step 1: Check if any user_id appears multiple times (should be ZERO!)
SELECT 'Duplicate user_id check:' as info;
SELECT 
  user_id,
  COUNT(*) as count,
  array_agg(email) as emails
FROM profiles
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Step 2: Check auth.users vs profiles email sync
SELECT 'Email sync check:' as info;
SELECT 
  au.id as user_id,
  au.email as auth_email,
  p.email as profile_email,
  'MISMATCH' as issue
FROM auth.users au
LEFT JOIN profiles p ON p.user_id = au.id
WHERE au.email != p.email
   OR p.email IS NULL;

-- Step 3: Show all tenant owners from auto_provisioning
SELECT 'Tenant owners:' as info;
SELECT 
  ap.tenant_id,
  ap.user_id,
  t.name as tenant_name,
  t.email as tenant_email,
  p.email as owner_profile_email,
  au.email as owner_auth_email
FROM auto_provisioning ap
JOIN tenants t ON t.id = ap.tenant_id
LEFT JOIN profiles p ON p.user_id = ap.user_id
LEFT JOIN auth.users au ON au.id = ap.user_id
WHERE ap.status = 'completed'
ORDER BY t.name;
