-- Create missing profiles for owner users from auto_provisioning
-- This will allow the login email to display correctly in the admin UI

-- Step 1: Show which owners need profiles created
SELECT 
  ap.user_id,
  ap.login_email,
  ap.restaurant_name,
  ap.restaurant_slug,
  CASE 
    WHEN p.user_id IS NOT NULL THEN '✅ Profile exists'
    ELSE '❌ Profile missing - will be created'
  END as status
FROM auto_provisioning ap
LEFT JOIN profiles p ON ap.user_id = p.user_id
WHERE p.user_id IS NULL  -- Only show missing profiles
ORDER BY ap.created_at DESC;

-- Step 2: Create the missing profiles
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
  'Owner',  -- Default first name
  '',       -- Empty last name
  'owner',  -- Role
  ap.created_at,
  ap.created_at
FROM auto_provisioning ap
LEFT JOIN profiles p ON ap.user_id = p.user_id
WHERE p.user_id IS NULL  -- Only create if doesn't exist
  AND ap.user_id IS NOT NULL
  AND ap.login_email IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Verify all owners now have profiles
SELECT 
  'Owners with profiles' as category,
  COUNT(*) as count
FROM auto_provisioning ap
INNER JOIN profiles p ON ap.user_id = p.user_id

UNION ALL

SELECT 
  'Owners without profiles' as category,
  COUNT(*) as count
FROM auto_provisioning ap
LEFT JOIN profiles p ON ap.user_id = p.user_id
WHERE p.user_id IS NULL

UNION ALL

SELECT 
  'Total owners' as category,
  COUNT(DISTINCT ap.user_id) as count
FROM auto_provisioning ap;

-- Step 4: Verify login emails now match
SELECT 
  ap.restaurant_name,
  ap.login_email,
  p.email as profile_email,
  CASE 
    WHEN ap.login_email = p.email THEN '✅ Match'
    ELSE '❌ Mismatch'
  END as status
FROM auto_provisioning ap
INNER JOIN profiles p ON ap.user_id = p.user_id
ORDER BY status, ap.restaurant_name;
