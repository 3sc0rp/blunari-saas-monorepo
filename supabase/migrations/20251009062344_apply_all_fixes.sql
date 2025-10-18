-- =============================================================================
-- COMPREHENSIVE FIX: Apply All Database Migrations
-- =============================================================================
-- This script applies all critical fixes in the correct order
-- Run this in Supabase SQL Editor: 
-- https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/sql/new
-- =============================================================================

-- =============================================================================
-- FIX 1: Update provision_tenant Function
-- =============================================================================
-- This ensures NEW tenants get auto_provisioning records and profiles

CREATE OR REPLACE FUNCTION public.provision_tenant(
  p_tenant_data JSONB,
  p_owner_email TEXT,
  p_owner_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_tenant_id UUID;
  new_tenant_record RECORD;
  address_json JSONB;
  provisioning_id UUID;
BEGIN
  -- Build address JSON if components are provided
  IF p_tenant_data ? 'address' OR p_tenant_data ? 'city' OR p_tenant_data ? 'state' THEN
    address_json := jsonb_build_object(
      'street', COALESCE(p_tenant_data->>'address', ''),
      'city', COALESCE(p_tenant_data->>'city', ''),
      'state', COALESCE(p_tenant_data->>'state', ''),
      'country', COALESCE(p_tenant_data->>'country', ''),
      'postalCode', COALESCE(p_tenant_data->>'postal_code', '')
    );
  ELSE
    address_json := NULL;
  END IF;

  -- 1. Create auto_provisioning record (required for admin dashboard display)
  INSERT INTO public.auto_provisioning (
    user_id,
    restaurant_name,
    restaurant_slug,
    timezone,
    currency,
    status,
    login_email,
    business_email
  )
  VALUES (
    p_owner_user_id,
    p_tenant_data->>'name',
    p_tenant_data->>'slug',
    COALESCE(p_tenant_data->>'timezone', 'America/New_York'),
    COALESCE(p_tenant_data->>'currency', 'USD'),
    'processing',
    p_owner_email,
    p_tenant_data->>'email'
  )
  RETURNING id INTO provisioning_id;

  -- 2. Create tenant
  INSERT INTO public.tenants (
    slug,
    name,
    status,
    timezone,
    currency,
    email,
    phone,
    description,
    website,
    address
  )
  VALUES (
    p_tenant_data->>'slug',
    p_tenant_data->>'name',
    'active',
    COALESCE(p_tenant_data->>'timezone', 'America/New_York'),
    COALESCE(p_tenant_data->>'currency', 'USD'),
    p_owner_email,
    p_tenant_data->>'phone',
    p_tenant_data->>'description',
    p_tenant_data->>'website',
    address_json
  )
  RETURNING id, slug, name, status INTO new_tenant_record;
  
  new_tenant_id := new_tenant_record.id;

  -- 3. Update auto_provisioning with tenant_id and mark as completed
  UPDATE public.auto_provisioning
  SET 
    tenant_id = new_tenant_id,
    status = 'completed',
    completed_at = NOW()
  WHERE id = provisioning_id;

  -- 4. Create or update profile for owner
  INSERT INTO public.profiles (
    user_id,
    email,
    first_name,
    last_name,
    role
  )
  VALUES (
    p_owner_user_id,
    p_owner_email,
    SPLIT_PART(COALESCE(p_tenant_data->>'owner_name', 'Owner'), ' ', 1),
    NULLIF(SPLIT_PART(COALESCE(p_tenant_data->>'owner_name', 'Owner'), ' ', 2), ''),
    'owner'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- 5. Enable default features
  INSERT INTO public.tenant_features (tenant_id, feature_key, enabled, source)
  VALUES 
    (new_tenant_id, 'basic_booking', true, 'plan'),
    (new_tenant_id, 'email_notifications', true, 'plan'),
    (new_tenant_id, 'basic_analytics', true, 'plan'),
    (new_tenant_id, 'widget_integration', true, 'plan');

  -- 6. Create default restaurant tables
  INSERT INTO public.restaurant_tables (tenant_id, name, capacity, table_type, active)
  VALUES 
    (new_tenant_id, 'Table 1', 2, 'standard', true),
    (new_tenant_id, 'Table 2', 2, 'standard', true),
    (new_tenant_id, 'Table 3', 4, 'standard', true),
    (new_tenant_id, 'Table 4', 4, 'standard', true),
    (new_tenant_id, 'Table 5', 6, 'standard', true),
    (new_tenant_id, 'Table 6', 6, 'standard', true),
    (new_tenant_id, 'Table 7', 8, 'standard', true),
    (new_tenant_id, 'Table 8', 8, 'standard', true);

  -- 7. Create default business hours
  INSERT INTO public.business_hours (tenant_id, day_of_week, is_open, open_time, close_time)
  VALUES 
    (new_tenant_id, 0, false, NULL, NULL),
    (new_tenant_id, 1, true, '09:00', '22:00'),
    (new_tenant_id, 2, true, '09:00', '22:00'),
    (new_tenant_id, 3, true, '09:00', '22:00'),
    (new_tenant_id, 4, true, '09:00', '22:00'),
    (new_tenant_id, 5, true, '09:00', '23:00'),
    (new_tenant_id, 6, true, '09:00', '23:00');

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', new_tenant_id,
    'tenant_slug', new_tenant_record.slug,
    'tenant_name', new_tenant_record.name,
    'owner_user_id', p_owner_user_id,
    'provisioning_id', provisioning_id
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Update provisioning status to failed
    IF provisioning_id IS NOT NULL THEN
      UPDATE public.auto_provisioning
      SET 
        status = 'failed',
        error_message = SQLERRM
      WHERE id = provisioning_id;
    END IF;
    
    RAISE EXCEPTION 'Tenant provisioning failed: %', SQLERRM;
END;
$$;

-- Verify function was created
SELECT 'provision_tenant function updated ✅' as status;

-- =============================================================================
-- FIX 2: Create Missing auto_provisioning Records
-- =============================================================================
-- This fixes EXISTING tenants that don't show in the admin UI

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
    RAISE NOTICE 'All tenants already have auto_provisioning records! ✅';
  ELSE
    RAISE NOTICE 'Created % auto_provisioning records ✅', missing_count;
  END IF;
END $$;

-- =============================================================================
-- FIX 3: Create Missing Owner Profiles
-- =============================================================================
-- This fixes the "login email shows admin@blunari.ai" issue

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
  ap.user_id,
  ap.login_email,
  'Restaurant',
  'Owner',
  'owner',
  ap.created_at,
  NOW()
FROM auto_provisioning ap
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.user_id = ap.user_id
)
AND ap.user_id IS NOT NULL
AND ap.login_email IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();

-- =============================================================================
-- VERIFICATION REPORT
-- =============================================================================

-- Show tenant visibility status
SELECT 
  '=== TENANT VISIBILITY STATUS ===' as report;

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

-- Show email display status
SELECT 
  '' as separator;

SELECT 
  '=== EMAIL DISPLAY STATUS ===' as report;

SELECT 
  ap.restaurant_name,
  ap.login_email as owner_email,
  p.email as profile_email,
  p.role,
  CASE 
    WHEN ap.login_email = p.email THEN '✅ Correct'
    WHEN p.email IS NULL THEN '❌ Missing Profile'
    ELSE '⚠️ Wrong Email'
  END as status
FROM auto_provisioning ap
LEFT JOIN profiles p ON ap.user_id = p.user_id
ORDER BY ap.created_at DESC;

-- Summary counts
SELECT 
  '' as separator;

SELECT 
  '=== SUMMARY ===' as report;

SELECT 
  COUNT(*) as total_tenants,
  COUNT(CASE WHEN ap.login_email = p.email THEN 1 END) as correct_emails,
  COUNT(CASE WHEN p.email IS NULL THEN 1 END) as missing_profiles,
  COUNT(CASE WHEN ap.login_email != p.email AND p.email IS NOT NULL THEN 1 END) as wrong_emails
FROM auto_provisioning ap
LEFT JOIN profiles p ON ap.user_id = p.user_id;

SELECT 
  '' as separator;

SELECT '🎉 All fixes applied successfully! Check the report above for results.' as final_status;
