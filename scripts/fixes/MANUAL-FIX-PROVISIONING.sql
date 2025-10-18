-- =============================================================================
-- DIRECT FIX: Create auto_provisioning records for missing tenants
-- =============================================================================
-- Run this in Supabase SQL Editor with RLS disabled
-- =============================================================================

-- Temporarily disable RLS for insert
ALTER TABLE auto_provisioning DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Insert auto_provisioning for droodpizza
INSERT INTO auto_provisioning (
  user_id,
  tenant_id,
  restaurant_name,
  restaurant_slug,
  timezone,
  currency,
  status,
  login_email,
  business_email,
  created_at,
  completed_at
)
SELECT 
  (SELECT user_id FROM employees WHERE role = 'SUPER_ADMIN' LIMIT 1),
  t.id,
  t.name,
  t.slug,
  COALESCE(t.timezone, 'America/New_York'),
  COALESCE(t.currency, 'USD'),
  'completed',
  COALESCE(t.email, 'admin@blunari.ai'),
  COALESCE(t.email, 'admin@blunari.ai'),
  t.created_at,
  t.created_at
FROM tenants t
WHERE t.slug = 'dspizza'
AND NOT EXISTS (
  SELECT 1 FROM auto_provisioning WHERE tenant_id = t.id
);

-- Insert auto_provisioning for test restaurant
INSERT INTO auto_provisioning (
  user_id,
  tenant_id,
  restaurant_name,
  restaurant_slug,
  timezone,
  currency,
  status,
  login_email,
  business_email,
  created_at,
  completed_at
)
SELECT 
  (SELECT user_id FROM employees WHERE role = 'SUPER_ADMIN' LIMIT 1),
  t.id,
  t.name,
  t.slug,
  COALESCE(t.timezone, 'America/New_York'),
  COALESCE(t.currency, 'USD'),
  'completed',
  COALESCE(t.email, 'admin@blunari.ai'),
  COALESCE(t.email, 'admin@blunari.ai'),
  t.created_at,
  t.created_at
FROM tenants t
WHERE t.slug = 'test-1759905296975'
AND NOT EXISTS (
  SELECT 1 FROM auto_provisioning WHERE tenant_id = t.id
);

-- Re-enable RLS
ALTER TABLE auto_provisioning ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Verify
SELECT 
  t.name,
  t.slug,
  ap.id as provisioning_id,
  ap.login_email,
  ap.status,
  CASE WHEN ap.id IS NOT NULL THEN '✅' ELSE '❌' END
FROM tenants t
LEFT JOIN auto_provisioning ap ON t.id = ap.tenant_id
ORDER BY t.created_at DESC;

SELECT '✅ Manual fix applied!' as status;
