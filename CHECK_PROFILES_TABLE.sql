-- Check if admin user exists in profiles table
SELECT 
  user_id,
  role,
  email,
  full_name,
  created_at
FROM profiles
WHERE user_id = '7d68eada-5b32-419f-aef8-f15afac43ed0';

-- Check all admin profiles
SELECT 
  user_id,
  role,
  email,
  full_name
FROM profiles
WHERE role IN ('SUPER_ADMIN', 'ADMIN')
ORDER BY created_at DESC;
