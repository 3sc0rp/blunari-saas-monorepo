-- Check if the provision_tenant function is using the correct auto_provisioning logic
-- This will show us the current function definition

SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'provision_tenant'
  AND routine_definition LIKE '%auto_provisioning%';

-- Also check what user_ids are in auto_provisioning vs what should be there
SELECT 
  ap.id as provisioning_id,
  ap.restaurant_name,
  ap.restaurant_slug,
  ap.user_id as provisioning_user_id,
  ap.login_email,
  p1.email as provisioning_user_email,
  t.email as tenant_email,
  t.id as tenant_id
FROM auto_provisioning ap
JOIN tenants t ON ap.tenant_id = t.id
LEFT JOIN profiles p1 ON ap.user_id = p1.user_id
ORDER BY ap.created_at DESC
LIMIT 10;
