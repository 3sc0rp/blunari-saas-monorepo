-- 🔍 SHOW WHICH PROFILES NEED FIXING
-- Run this to see the exact list of profiles with NULL user_id

SELECT 
  p.email,
  p.id as profile_id,
  t.name as tenant_name,
  t.id as tenant_id,
  '⚠️ NULL user_id - Use Regenerate Credentials' as action_needed
FROM profiles p
LEFT JOIN tenants t ON t.email = p.email
WHERE p.user_id IS NULL
ORDER BY p.email;

-- Count how many need fixing
SELECT 
  COUNT(*) as total_profiles_needing_fix
FROM profiles
WHERE user_id IS NULL;
