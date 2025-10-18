-- PRACTICAL FIX: Create profiles for all owner users from auto_provisioning
-- The owner users exist in auth.users, they just don't have profiles

-- This is the COMPLETE fix that will work:

-- Step 1: Create profiles for ALL owner users from auto_provisioning
-- Using the user_id that's already in auto_provisioning (which came from the edge function)
INSERT INTO profiles (
  user_id,
  email,
  first_name,
  last_name,
  role,
  created_at,
  updated_at
)
SELECT 
  ap.user_id,
  ap.login_email,
  'Restaurant',  -- First name
  'Owner',       -- Last name
  'owner',       -- Role
  ap.created_at,
  NOW()
FROM auto_provisioning ap
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.user_id = ap.user_id
)
AND ap.user_id IS NOT NULL
AND ap.login_email IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();

-- Step 2: Verify the fix
SELECT 
  ap.restaurant_name,
  ap.login_email as owner_email,
  p.email as profile_email,
  p.role,
  CASE 
    WHEN ap.login_email = p.email THEN '✅ Fixed!'
    ELSE '❌ Still wrong'
  END as status
FROM auto_provisioning ap
LEFT JOIN profiles p ON ap.user_id = p.user_id
ORDER BY ap.created_at DESC;

-- Step 3: Count fixed records
SELECT 
  COUNT(*) as total_tenants,
  COUNT(CASE WHEN ap.login_email = p.email THEN 1 END) as correct_emails,
  COUNT(CASE WHEN ap.login_email != p.email OR p.email IS NULL THEN 1 END) as incorrect_emails
FROM auto_provisioning ap
LEFT JOIN profiles p ON ap.user_id = p.user_id;
