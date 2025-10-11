-- Check if deewav3@gmail.com already exists as a user
SELECT 
  'EMAIL CONFLICT CHECK' as check_type,
  id,
  email,
  created_at,
  email_confirmed_at,
  CASE 
    WHEN id = '7d68eada-5b32-419f-aef8-f15afac43ed0' THEN '🚨 THIS IS YOUR ADMIN!'
    ELSE '✅ Different user'
  END as user_type
FROM auth.users
WHERE email = 'deewav3@gmail.com' OR email = 'drood.tech@gmail.com'
ORDER BY email;

-- Check profiles for this email
SELECT 
  'PROFILE CHECK' as check_type,
  user_id,
  email,
  role
FROM profiles
WHERE email IN ('deewav3@gmail.com', 'drood.tech@gmail.com')
ORDER BY email;
