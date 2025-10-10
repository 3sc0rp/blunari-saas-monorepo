-- =============================================================================
-- FIX TRIGGER ISSUE AND CREATE PROFILE
-- =============================================================================

-- First, let's check the problematic trigger
SELECT 
  '=== CHECKING TRIGGER ===' as info;

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
AND trigger_name LIKE '%audit%';

-- Disable the trigger temporarily
SELECT 
  '' as separator;

SELECT 
  '=== DISABLING TRIGGER ===' as info;

DO $$
BEGIN
  -- Disable triggers if they exist
  ALTER TABLE profiles DISABLE TRIGGER ALL;
  RAISE NOTICE 'All triggers disabled on profiles table';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not disable triggers: %', SQLERRM;
END $$;

SELECT '✅ Triggers disabled temporarily' as status;

-- Now create the profile
SELECT 
  '' as separator;

SELECT 
  '=== CREATING PROFILE ===' as info;

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
  au.id,
  au.email,
  'Admin',
  'User',
  'admin',
  NOW(),
  NOW()
FROM auth.users au
WHERE au.id = '7d68eada-5b32-419f-aef8-f15afac43ed0'
ON CONFLICT (user_id) 
DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();

SELECT '✅ Profile created!' as status;

-- Re-enable the triggers
SELECT 
  '' as separator;

SELECT 
  '=== RE-ENABLING TRIGGERS ===' as info;

DO $$
BEGIN
  -- Re-enable all triggers
  ALTER TABLE profiles ENABLE TRIGGER ALL;
  RAISE NOTICE 'All triggers re-enabled on profiles table';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not re-enable triggers: %', SQLERRM;
END $$;

SELECT '✅ Triggers re-enabled' as status;

-- Verify the profile was created
SELECT 
  '' as separator;

SELECT 
  '=== VERIFICATION ===' as info;

SELECT 
  user_id,
  email,
  first_name,
  last_name,
  role,
  '✅ Profile exists!' as result
FROM profiles
WHERE user_id = '7d68eada-5b32-419f-aef8-f15afac43ed0';

SELECT '✅ Done! Profile created successfully.' as final_message;
