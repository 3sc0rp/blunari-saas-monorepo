-- Find owner users that don't have profiles yet
-- These are the "missing" owners causing the login email mismatch

-- Step 1: Get all login_emails from auto_provisioning
WITH owner_emails AS (
  SELECT DISTINCT 
    login_email,
    user_id as current_user_id,
    restaurant_name
  FROM auto_provisioning
  WHERE login_email IS NOT NULL 
    AND login_email != ''
)
-- Step 2: Check which ones have profiles
SELECT 
  oe.login_email,
  oe.restaurant_name,
  CASE 
    WHEN p.user_id IS NOT NULL THEN '✅ Has profile'
    ELSE '❌ Missing profile'
  END as profile_status,
  p.user_id as profile_user_id,
  oe.current_user_id as autoprov_user_id
FROM owner_emails oe
LEFT JOIN profiles p ON p.email = oe.login_email
ORDER BY profile_status, oe.login_email;

-- Also check auth.users to see if the users exist there
-- (Note: This requires service role access)
