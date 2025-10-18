-- =============================================================================
-- FIX: Create auto_provisioning records for tenants missing them
-- =============================================================================
-- This fixes tenants that were created but don't have auto_provisioning records
-- Run this in Supabase SQL Editor
-- =============================================================================

DO $$
DECLARE
  tenant_record RECORD;
  admin_user_id UUID;
  created_count INTEGER := 0;
BEGIN
  -- Get first SUPER_ADMIN user to use as provisioner
  SELECT user_id INTO admin_user_id
  FROM employees
  WHERE role = 'SUPER_ADMIN'
  LIMIT 1;
  
  IF admin_user_id IS NULL THEN
    -- If no SUPER_ADMIN, try to get any admin user from auth.users
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE raw_user_meta_data->>'role' IN ('admin', 'super_admin')
    LIMIT 1;
  END IF;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'No admin user found to use as provisioner';
  END IF;
  
  RAISE NOTICE 'Using admin user_id: %', admin_user_id;
  
  -- Find all tenants without auto_provisioning records
  FOR tenant_record IN 
    SELECT 
      t.id, 
      t.name, 
      t.slug, 
      t.timezone, 
      t.currency, 
      t.email, 
      t.created_at
    FROM tenants t
    LEFT JOIN auto_provisioning ap ON t.id = ap.tenant_id
    WHERE ap.id IS NULL
  LOOP
    created_count := created_count + 1;
    
    RAISE NOTICE 'Creating auto_provisioning for: % (slug: %)', 
      tenant_record.name, tenant_record.slug;
    
    -- Create auto_provisioning record
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
    VALUES (
      admin_user_id,
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
    )
    ON CONFLICT DO NOTHING;
    
    -- Create profile for the admin user if it doesn't exist
    INSERT INTO profiles (
      user_id,
      email,
      first_name,
      last_name,
      role,
      created_at,
      updated_at
    )
    SELECT 
      admin_user_id,
      COALESCE(tenant_record.email, 'unknown@example.com'),
      'Restaurant',
      'Owner',
      'owner',
      tenant_record.created_at,
      NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM profiles WHERE user_id = admin_user_id
    )
    ON CONFLICT (user_id) DO NOTHING;
    
  END LOOP;
  
  IF created_count = 0 THEN
    RAISE NOTICE '✅ All tenants already have auto_provisioning records!';
  ELSE
    RAISE NOTICE '✅ Created % auto_provisioning records', created_count;
  END IF;
END $$;

-- Verify the fix
SELECT 
  '=== VERIFICATION ===' as status;

SELECT 
  t.name as tenant_name,
  t.slug,
  ap.id as provisioning_id,
  ap.login_email,
  ap.status,
  CASE 
    WHEN ap.id IS NOT NULL THEN '✅ Has record'
    ELSE '❌ Missing'
  END as status
FROM tenants t
LEFT JOIN auto_provisioning ap ON t.id = ap.tenant_id
ORDER BY t.created_at DESC;

SELECT 
  '' as separator;

SELECT 
  COUNT(*) as total_tenants,
  COUNT(ap.id) as tenants_with_provisioning,
  COUNT(*) - COUNT(ap.id) as tenants_missing_provisioning
FROM tenants t
LEFT JOIN auto_provisioning ap ON t.id = ap.tenant_id;

SELECT '✅ Fix applied successfully!' as final_status;
