-- 🔧 AUTOMATIC FIX FOR NULL user_id PROFILES
-- This script automatically links profiles to existing auth users
-- Run this AFTER confirming auth users exist (use CHECK_ORPHANED_PROFILES.sql first)

BEGIN;

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

-- Step 2: Perform the update
UPDATE profiles p
SET user_id = au.id,
    updated_at = NOW()
FROM auth.users au
WHERE p.email = au.email
  AND p.user_id IS NULL
  AND au.id IS NOT NULL;

-- Step 3: Show results
SELECT 
  'AFTER UPDATE - Profiles that were fixed:' as status;

SELECT 
  p.email,
  p.id as profile_id,
  p.user_id as linked_user_id,
  '✅ FIXED' as status
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
  'Remaining profiles with NULL user_id:' as status;

SELECT 
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

COMMIT;

-- Summary
SELECT 
  '✅ AUTO-FIX COMPLETE!' as status,
  'Profiles with matching auth users have been linked.' as message,
  'If any remain with NULL user_id, use "Regenerate Credentials" or delete them.' as next_step;
