-- Quick diagnostic to check current state
-- Run this to verify the fixes are still in place

-- 1. Check if profiles have user_id set
SELECT 
  'Profile Status:' as check_type,
  email,
  CASE 
    WHEN user_id IS NOT NULL THEN '✅ Has user_id'
    ELSE '❌ NULL user_id'
  END as status
FROM profiles
WHERE email IN (
  'drood.tech@gmail.com',
  'naturevillage2024@gmail.com',
  'admin@blunari.ai'
)
ORDER BY email;

-- 2. Count profiles with NULL user_id
SELECT 
  'Total NULL user_id profiles:' as check_type,
  COUNT(*) as count
FROM profiles
WHERE user_id IS NULL;

-- 3. Check if audit trigger exists
SELECT 
  'Audit Trigger Status:' as check_type,
  proname as function_name,
  CASE 
    WHEN prosrc LIKE '%has_status_column%' THEN '✅ Fixed version'
    ELSE '⚠️ Old version'
  END as status
FROM pg_proc
WHERE proname = 'audit_all_sensitive_operations';
