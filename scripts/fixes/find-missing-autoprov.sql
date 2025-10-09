-- Find tenants that don't have auto_provisioning records
-- These won't show up in the admin UI

SELECT 
  t.id,
  t.name,
  t.slug,
  t.status,
  t.created_at,
  CASE 
    WHEN ap.id IS NULL THEN '❌ Missing'
    ELSE '✅ Exists'
  END as auto_provisioning_status
FROM tenants t
LEFT JOIN auto_provisioning ap ON t.id = ap.tenant_id
ORDER BY t.created_at DESC;

-- Count of tenants with and without auto_provisioning
SELECT 
  COUNT(*) FILTER (WHERE ap.id IS NOT NULL) as tenants_with_autoprov,
  COUNT(*) FILTER (WHERE ap.id IS NULL) as tenants_without_autoprov,
  COUNT(*) as total_tenants
FROM tenants t
LEFT JOIN auto_provisioning ap ON t.id = ap.tenant_id;
