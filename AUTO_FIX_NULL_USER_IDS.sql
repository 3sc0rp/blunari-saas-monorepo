-- 🔧 AUTOMATIC FIX FOR NULL user_id PROFILES
-- This script automatically links profiles to existing auth users
-- SAFE VERSION: Updates one at a time to avoid trigger issues

-- Step 1: Show what will be updated
SELECT 
  'BEFORE UPDATE - Profiles with NULL user_id:' as status;

SELECT 
  p.email,
  p.id as profile_id,
  p.user_id as current_user_id,
  au.id as auth_user_id_to_link
FROM profiles p
LEFT JOIN auth.users au ON au.email = p.email
WHERE p.user_id IS NULL
  AND au.id IS NOT NULL;  -- Only show profiles where auth user exists

-- Step 2: Perform the updates ONE BY ONE (safer, avoids trigger issues)
-- Update admin@blunari.ai
UPDATE profiles
SET user_id = (SELECT id FROM auth.users WHERE email = 'admin@blunari.ai' LIMIT 1)
WHERE email = 'admin@blunari.ai' AND user_id IS NULL
  AND EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@blunari.ai');

-- Update deewav38@mail.com
UPDATE profiles
SET user_id = (SELECT id FROM auth.users WHERE email = 'deewav38@mail.com' LIMIT 1)
WHERE email = 'deewav38@mail.com' AND user_id IS NULL
  AND EXISTS (SELECT 1 FROM auth.users WHERE email = 'deewav38@mail.com');

-- Update drood.tech@gmail.com
UPDATE profiles
SET user_id = (SELECT id FROM auth.users WHERE email = 'drood.tech@gmail.com' LIMIT 1)
WHERE email = 'drood.tech@gmail.com' AND user_id IS NULL
  AND EXISTS (SELECT 1 FROM auth.users WHERE email = 'drood.tech@gmail.com');

-- Update naturevillage2024@gmail.com
UPDATE profiles
SET user_id = (SELECT id FROM auth.users WHERE email = 'naturevillage2024@gmail.com' LIMIT 1)
WHERE email = 'naturevillage2024@gmail.com' AND user_id IS NULL
  AND EXISTS (SELECT 1 FROM auth.users WHERE email = 'naturevillage2024@gmail.com');

-- Update t2k20802@gmail.com
UPDATE profiles
SET user_id = (SELECT id FROM auth.users WHERE email = 't2k20802@gmail.com' LIMIT 1)
WHERE email = 't2k20802@gmail.com' AND user_id IS NULL
  AND EXISTS (SELECT 1 FROM auth.users WHERE email = 't2k20802@gmail.com');


-- Step 3: Show results
SELECT 
  'AFTER UPDATE - Profiles that were fixed:' as status;

SELECT 
  p.email,
  p.id as profile_id,
  p.user_id as linked_user_id,
  CASE 
    WHEN p.user_id IS NOT NULL THEN '✅ FIXED'
    ELSE '⚠️ Still NULL'
  END as status
FROM profiles p
WHERE p.email IN (
  'admin@blunari.ai',
  'deewav38@mail.com',
  'drood.tech@gmail.com',
  'naturevillage2024@gmail.com',
  't2k20802@gmail.com'
)
ORDER BY p.email;

-- Step 4: Check if any still need fixing
SELECT 
  'Remaining profiles with NULL user_id:' as status,
  COUNT(*) as remaining_null_user_ids
FROM profiles
WHERE user_id IS NULL;

-- Step 5: Show which ones still need manual fix (if any)
SELECT 
  p.email,
  p.id as profile_id,
  '⚠️ No auth user found - needs manual creation or deletion' as status
FROM profiles p
LEFT JOIN auth.users au ON au.email = p.email
WHERE p.user_id IS NULL
  AND au.id IS NULL;

-- Summary
SELECT 
  '✅ AUTO-FIX COMPLETE!' as result,
  'Check the results above to see which profiles were fixed.' as message,
  'If any remain with NULL user_id, use "Regenerate Credentials" in Admin Dashboard.' as next_step;

