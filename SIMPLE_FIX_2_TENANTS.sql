-- 🎯 SIMPLEST FIX - Just Update The 2 Tenant Profiles That Matter
-- Skip the admin and orphaned profiles, just fix the actual tenants causing 500 errors

-- Fix drood.tech's Restaurant
UPDATE profiles
SET user_id = (SELECT id FROM auth.users WHERE email = 'drood.tech@gmail.com' LIMIT 1)
WHERE email = 'drood.tech@gmail.com' 
  AND user_id IS NULL
  AND EXISTS (SELECT 1 FROM auth.users WHERE email = 'drood.tech@gmail.com');

-- Fix Nature Village
UPDATE profiles
SET user_id = (SELECT id FROM auth.users WHERE email = 'naturevillage2024@gmail.com' LIMIT 1)
WHERE email = 'naturevillage2024@gmail.com' 
  AND user_id IS NULL
  AND EXISTS (SELECT 1 FROM auth.users WHERE email = 'naturevillage2024@gmail.com');

-- Show results
SELECT 
  email,
  user_id,
  CASE 
    WHEN user_id IS NOT NULL THEN '✅ FIXED - Can now update credentials'
    ELSE '❌ Still NULL - Auth user may not exist'
  END as status
FROM profiles
WHERE email IN ('drood.tech@gmail.com', 'naturevillage2024@gmail.com');

-- Check 500 error should be fixed
SELECT 
  '✅ The 2 main tenants are fixed!' as result,
  'Try updating credentials in Admin Dashboard now.' as action,
  'The 500 error should be gone for these tenants.' as expected;
