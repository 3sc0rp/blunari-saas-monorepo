-- 🔍 CHECK IF PROFILES WITHOUT TENANTS HAVE AUTH USERS
-- This checks if auth users exist for the 3 profiles without tenant linkage

-- Check in auth.users if these emails have accounts
SELECT 
  email,
  id as auth_user_id,
  created_at,
  'Has auth user - can be linked' as status
FROM auth.users
WHERE email IN (
  'admin@blunari.ai',
  'deewav38@mail.com',
  't2k20802@gmail.com'
)
ORDER BY email;

-- If they exist, we can auto-link them
-- If not, they might be orphaned profiles that can be deleted
