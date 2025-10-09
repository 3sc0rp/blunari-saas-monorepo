-- Check all tenants and their auto_provisioning records
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  t.slug as tenant_slug,
  t.status as tenant_status,
  t.created_at as tenant_created,
  ap.id as provisioning_id,
  ap.user_id as provisioning_user_id,
  ap.status as provisioning_status,
  ap.restaurant_name,
  ap.restaurant_slug,
  ap.created_at as provisioning_created
FROM tenants t
LEFT JOIN auto_provisioning ap ON t.id = ap.tenant_id
ORDER BY t.created_at DESC
LIMIT 20;

-- Check auto_provisioning records without tenants
SELECT 
  ap.id,
  ap.user_id,
  ap.tenant_id,
  ap.restaurant_name,
  ap.restaurant_slug,
  ap.status,
  ap.error_message,
  ap.created_at,
  ap.completed_at
FROM auto_provisioning ap
WHERE ap.tenant_id IS NULL
ORDER BY ap.created_at DESC
LIMIT 10;

-- Count stats
SELECT 
  'Total Tenants' as metric,
  COUNT(*) as count
FROM tenants
UNION ALL
SELECT 
  'Total Auto-provisioning' as metric,
  COUNT(*) as count
FROM auto_provisioning
UNION ALL
SELECT 
  'Tenants with auto_provisioning' as metric,
  COUNT(DISTINCT t.id) as count
FROM tenants t
INNER JOIN auto_provisioning ap ON t.id = ap.tenant_id;
