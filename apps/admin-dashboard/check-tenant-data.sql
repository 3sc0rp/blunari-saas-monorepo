-- Check current tenant data to see if any need fixing
SELECT 
  t.id,
  t.name,
  t.email,
  t.created_at,
  ap.user_id,
  ap.status as provisioning_status
FROM tenants t
LEFT JOIN auto_provisioning ap ON t.id = ap.tenant_id
ORDER BY t.created_at DESC
LIMIT 20;

-- Check if any tenants still have admin email
SELECT COUNT(*) as admin_email_count
FROM tenants 
WHERE email = 'admin@blunari.ai';

-- Check profiles table consistency
SELECT 
  p.id as profile_id,
  p.user_id,
  p.email,
  t.id as tenant_id,
  t.name as tenant_name
FROM profiles p
LEFT JOIN tenants t ON p.email = t.email
WHERE p.email LIKE '%@%'
ORDER BY p.created_at DESC
LIMIT 20;
