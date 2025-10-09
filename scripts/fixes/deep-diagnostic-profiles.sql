-- Deep diagnostic: Why didn't profiles get created?

-- Step 1: Check what's in auto_provisioning
SELECT 
  'auto_provisioning data' as source,
  ap.id,
  ap.user_id,
  ap.login_email,
  ap.restaurant_name,
  ap.status
FROM auto_provisioning ap
ORDER BY ap.created_at DESC
LIMIT 5;

-- Step 2: Check if those user_ids exist in profiles already
SELECT 
  'Existing profiles' as source,
  p.user_id,
  p.email,
  p.role,
  p.created_at
FROM profiles p
WHERE p.user_id IN (
  SELECT user_id FROM auto_provisioning WHERE user_id IS NOT NULL
)
ORDER BY p.created_at DESC;

-- Step 3: Check if there are profiles for those emails
SELECT 
  'Profiles by email' as source,
  p.user_id,
  p.email,
  p.role
FROM profiles p
WHERE p.email IN (
  SELECT login_email FROM auto_provisioning WHERE login_email IS NOT NULL
);

-- Step 4: Check the profiles table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Step 5: Try to understand why INSERT failed
-- Check if there are any constraints or triggers
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public' 
  AND table_name = 'profiles';
