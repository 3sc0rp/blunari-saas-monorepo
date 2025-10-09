-- Create missing auto_provisioning records for existing tenants
-- This will make all tenants visible in the admin UI

-- First, let's see which tenants are missing records
DO $$
DECLARE
  tenant_record RECORD;
  missing_count INTEGER := 0;
BEGIN
  -- Find all tenants without auto_provisioning records
  FOR tenant_record IN 
    SELECT t.id, t.name, t.slug, t.timezone, t.currency, t.email, t.created_at
    FROM tenants t
    LEFT JOIN auto_provisioning ap ON t.id = ap.tenant_id
    WHERE ap.id IS NULL
  LOOP
    missing_count := missing_count + 1;
    
    RAISE NOTICE 'Creating auto_provisioning for tenant: % (slug: %)', 
      tenant_record.name, tenant_record.slug;
    
    -- Create auto_provisioning record with placeholder user_id
    -- Note: We use the first admin user as the provisioner
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
      tenant_record.id,
      tenant_record.name,
      tenant_record.slug,
      COALESCE(tenant_record.timezone, 'America/New_York'),
      COALESCE(tenant_record.currency, 'USD'),
      'completed',
      COALESCE(tenant_record.email, 'unknown@example.com'),
      COALESCE(tenant_record.email, 'unknown@example.com'),
      tenant_record.created_at,
      tenant_record.created_at
    ON CONFLICT DO NOTHING;
    
  END LOOP;
  
  IF missing_count = 0 THEN
    RAISE NOTICE 'All tenants already have auto_provisioning records!';
  ELSE
    RAISE NOTICE 'Created % auto_provisioning records', missing_count;
  END IF;
END $$;

-- Verify the results
SELECT 
  'Tenants with auto_provisioning' as category,
  COUNT(*) as count
FROM tenants t
INNER JOIN auto_provisioning ap ON t.id = ap.tenant_id

UNION ALL

SELECT 
  'Tenants without auto_provisioning' as category,
  COUNT(*) as count
FROM tenants t
LEFT JOIN auto_provisioning ap ON t.id = ap.tenant_id
WHERE ap.id IS NULL

UNION ALL

SELECT 
  'Total tenants' as category,
  COUNT(*) as count
FROM tenants;
