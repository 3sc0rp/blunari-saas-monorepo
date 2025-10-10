-- =============================================================================
-- QUICK VERIFICATION SCRIPT - Check if everything is set up correctly
-- =============================================================================
-- Run this to verify your setup before testing the UI
-- =============================================================================

-- SECTION 1: Check Admin User
SELECT '==== ADMIN USER CHECK ====' as section;

SELECT 
  id as user_id,
  email,
  created_at,
  CASE 
    WHEN id IS NOT NULL THEN '✅ User exists'
    ELSE '❌ User not found'
  END as status
FROM auth.users
WHERE email = 'admin@blunari.ai';

-- SECTION 2: Check Employee Record
SELECT '' as separator;
SELECT '==== EMPLOYEE RECORD CHECK ====' as section;

SELECT 
  e.employee_id,
  e.user_id,
  e.email,
  e.role,
  e.status,
  CASE 
    WHEN e.id IS NOT NULL THEN '✅ Employee record exists'
    ELSE '❌ Employee record missing'
  END as status,
  CASE 
    WHEN e.role = 'SUPER_ADMIN' THEN '✅ Correct role'
    ELSE '⚠️ Role should be SUPER_ADMIN'
  END as role_check,
  CASE 
    WHEN e.status = 'ACTIVE' THEN '✅ Status is ACTIVE'
    ELSE '⚠️ Status should be ACTIVE'
  END as status_check
FROM auth.users au
LEFT JOIN employees e ON au.id = e.user_id
WHERE au.email = 'admin@blunari.ai';

-- SECTION 3: Check Profile Record
SELECT '' as separator;
SELECT '==== PROFILE RECORD CHECK ====' as section;

SELECT 
  p.user_id,
  p.email,
  p.first_name,
  p.last_name,
  p.avatar_url,
  p.phone,
  p.role,
  CASE 
    WHEN p.user_id IS NOT NULL THEN '✅ Profile exists'
    ELSE '❌ Profile missing'
  END as status,
  CASE 
    WHEN p.first_name IS NOT NULL AND p.last_name IS NOT NULL THEN '✅ Has name'
    ELSE '⚠️ Name is NULL (will show Admin User)'
  END as name_check,
  CASE 
    WHEN p.avatar_url IS NOT NULL THEN '✅ Has avatar'
    ELSE 'ℹ️ No avatar uploaded yet'
  END as avatar_check
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.user_id
WHERE au.email = 'admin@blunari.ai';

-- SECTION 4: Check Auto Provisioning
SELECT '' as separator;
SELECT '==== AUTO PROVISIONING CHECK ====' as section;

SELECT 
  ap.restaurant_name,
  ap.restaurant_slug,
  ap.status,
  au.email as provisioner_email,
  CASE 
    WHEN ap.user_id = (SELECT id FROM auth.users WHERE email = 'admin@blunari.ai') 
    THEN '✅ Linked to admin@blunari.ai'
    ELSE '⚠️ Linked to different user'
  END as provisioner_check
FROM auto_provisioning ap
INNER JOIN auth.users au ON ap.user_id = au.id;

-- SECTION 5: Check Storage Bucket
SELECT '' as separator;
SELECT '==== STORAGE BUCKET CHECK ====' as section;

SELECT 
  id as bucket_id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  CASE 
    WHEN id = 'avatars' THEN '✅ Bucket exists'
    ELSE '❌ Bucket not found'
  END as status,
  CASE 
    WHEN public = true THEN '✅ Public access enabled'
    ELSE '⚠️ Should be public'
  END as public_check,
  CASE 
    WHEN file_size_limit = 2097152 THEN '✅ 2MB limit set'
    ELSE '⚠️ Size limit incorrect'
  END as size_check
FROM storage.buckets
WHERE id = 'avatars'
UNION ALL
SELECT 
  'N/A', 'avatars', false, 0, ARRAY[]::text[], 
  '❌ Bucket does not exist - Run CREATE-AVATAR-STORAGE-BUCKET.sql', 
  '❌ Not configured',
  '❌ Not configured'
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars');

-- SECTION 6: Check Storage Policies
SELECT '' as separator;
SELECT '==== STORAGE POLICIES CHECK ====' as section;

SELECT 
  policyname as policy_name,
  cmd as operation,
  CASE 
    WHEN cmd = 'SELECT' THEN '✅ Public read policy'
    WHEN cmd = 'INSERT' THEN '✅ Upload policy'
    WHEN cmd = 'UPDATE' THEN '✅ Update policy'
    WHEN cmd = 'DELETE' THEN '✅ Delete policy'
  END as status
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%Avatar%'
ORDER BY cmd;

-- SECTION 7: Count Storage Policies
SELECT '' as separator;
SELECT 
  'Storage Policies Count' as check_name,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ All 4 policies exist'
    WHEN COUNT(*) = 0 THEN '❌ No policies found - Run CREATE-AVATAR-STORAGE-BUCKET.sql'
    ELSE '⚠️ Missing some policies - Should have 4'
  END as status
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%Avatar%';

-- SECTION 8: Check RLS Policies for Profiles
SELECT '' as separator;
SELECT '==== PROFILES RLS POLICIES CHECK ====' as section;

SELECT 
  policyname as policy_name,
  cmd as operation,
  '✅ Policy exists' as status
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY cmd;

-- SECTION 9: Summary
SELECT '' as separator;
SELECT '==== SETUP SUMMARY ====' as section;

WITH checks AS (
  SELECT 
    1 as order_num,
    'Admin User' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@blunari.ai') 
      THEN '✅ PASS' ELSE '❌ FAIL' END as status
  UNION ALL
  SELECT 
    2,
    'Employee Record',
    CASE WHEN EXISTS (SELECT 1 FROM employees e JOIN auth.users au ON e.user_id = au.id WHERE au.email = 'admin@blunari.ai') 
      THEN '✅ PASS' ELSE '❌ FAIL - Run FIX-ACTUAL-ADMIN-USER.sql' END
  UNION ALL
  SELECT 
    3,
    'Profile Record',
    CASE WHEN EXISTS (SELECT 1 FROM profiles p JOIN auth.users au ON p.user_id = au.id WHERE au.email = 'admin@blunari.ai') 
      THEN '✅ PASS' ELSE '❌ FAIL - Run FIX-ACTUAL-ADMIN-USER.sql' END
  UNION ALL
  SELECT 
    4,
    'Storage Bucket',
    CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') 
      THEN '✅ PASS' ELSE '❌ FAIL - Run CREATE-AVATAR-STORAGE-BUCKET.sql' END
  UNION ALL
  SELECT 
    5,
    'Storage Policies',
    CASE WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%Avatar%') = 4 
      THEN '✅ PASS' ELSE '❌ FAIL - Run CREATE-AVATAR-STORAGE-BUCKET.sql' END
  UNION ALL
  SELECT 
    6,
    'Auto Provisioning',
    CASE WHEN EXISTS (SELECT 1 FROM auto_provisioning ap JOIN auth.users au ON ap.user_id = au.id WHERE au.email = 'admin@blunari.ai') 
      THEN '✅ PASS' ELSE '⚠️ WARNING - Not linked to admin' END
)
SELECT * FROM checks ORDER BY order_num;

-- SECTION 10: Action Items
SELECT '' as separator;
SELECT '==== ACTION ITEMS ====' as section;

SELECT 
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM employees e JOIN auth.users au ON e.user_id = au.id WHERE au.email = 'admin@blunari.ai')
      THEN '📝 ACTION REQUIRED: Run FIX-ACTUAL-ADMIN-USER.sql'
    WHEN NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars')
      THEN '📝 ACTION REQUIRED: Run CREATE-AVATAR-STORAGE-BUCKET.sql'
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%Avatar%') != 4
      THEN '📝 ACTION REQUIRED: Run CREATE-AVATAR-STORAGE-BUCKET.sql'
    ELSE '✅ ALL SETUP COMPLETE - You can now test the UI!'
  END as next_steps;

SELECT '' as separator;
SELECT '🎯 Once all checks pass, refresh your admin dashboard and test the Profile Settings page!' as final_message;
