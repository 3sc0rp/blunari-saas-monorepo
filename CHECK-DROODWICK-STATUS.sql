-- Check what happened with droodwick tenant
SELECT 
  'TENANT INFO' as check_type,
  t.id as tenant_id,
  t.name,
  t.email as tenant_email,
  t.owner_id,
  au.email as owner_email,
  CASE 
    WHEN t.owner_id = '7d68eada-5b32-419f-aef8-f15afac43ed0' THEN '🚨 STILL YOUR ADMIN!'
    WHEN t.owner_id IS NULL THEN '❌ NO OWNER'
    ELSE '✅ SEPARATE OWNER'
  END as status
FROM tenants t
LEFT JOIN auth.users au ON au.id = t.owner_id
WHERE t.name = 'droodwick';

-- Check auto_provisioning
SELECT 
  'AUTO_PROVISIONING' as check_type,
  ap.user_id,
  au.email,
  ap.status,
  CASE 
    WHEN ap.user_id = '7d68eada-5b32-419f-aef8-f15afac43ed0' THEN '🚨 YOUR ADMIN USER!'
    ELSE '✅ Other user'
  END as user_check
FROM auto_provisioning ap
LEFT JOIN auth.users au ON au.id = ap.user_id
WHERE ap.tenant_id IN (SELECT id FROM tenants WHERE name = 'droodwick');

-- Check if your admin email got changed
SELECT 
  'YOUR ADMIN EMAIL CHECK' as check_type,
  id,
  email,
  CASE 
    WHEN email = 'drood.tech@gmail.com' THEN '✅ UNCHANGED'
    ELSE '🚨 CHANGED TO: ' || email
  END as status
FROM auth.users
WHERE id = '7d68eada-5b32-419f-aef8-f15afac43ed0';
