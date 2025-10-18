-- Simple check: Was the profile created?

-- Check all profiles
SELECT 
  p.user_id,
  p.email,
  p.first_name,
  p.last_name,
  p.role,
  p.created_at
FROM profiles p
ORDER BY p.created_at DESC
LIMIT 10;

-- Check if the specific owner profile exists
SELECT 
  'Profile for owner-test-1759905296975@example.com' as check_type,
  p.*
FROM profiles p
WHERE p.email LIKE '%1759905296975%';

-- Check what auto_provisioning expects
SELECT 
  'What auto_provisioning expects' as check_type,
  ap.user_id,
  ap.login_email,
  ap.restaurant_name
FROM auto_provisioning ap
WHERE ap.login_email LIKE '%1759905296975%';

-- The key join to see what's matching
SELECT 
  'Matching check' as info,
  ap.restaurant_name,
  ap.user_id as ap_user_id,
  ap.login_email as ap_email,
  p.user_id as profile_user_id,
  p.email as profile_email,
  CASE 
    WHEN p.user_id IS NULL THEN 'No profile found for this user_id'
    WHEN ap.login_email != p.email THEN 'Profile exists but email mismatch'
    ELSE 'All good!'
  END as issue
FROM auto_provisioning ap
LEFT JOIN profiles p ON ap.user_id = p.user_id
WHERE ap.login_email LIKE '%1759905296975%';
