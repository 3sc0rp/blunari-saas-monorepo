-- =============================================================================
-- CREATE AUTO_PROVISIONING RECORDS FOR EXISTING TENANTS
-- =============================================================================
-- This script creates auto_provisioning records for tenants that don't have them
-- Copy this entire script and paste it into Supabase SQL Editor, then click Run
-- =============================================================================

-- First, let's see what we have
SELECT 
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as divider,
  'STEP 1: Current Tenant Status' as step;

SELECT 
  t.name as tenant_name,
  t.slug,
  t.email,
  CASE 
    WHEN ap.id IS NULL THEN '❌ Missing auto_provisioning'
    ELSE '✅ Has auto_provisioning'
  END as status
FROM tenants t
LEFT JOIN auto_provisioning ap ON t.id = ap.tenant_id
ORDER BY t.created_at DESC;

-- Now create the missing records
SELECT 
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as divider,
  'STEP 2: Creating Missing Records' as step;

DO $$
DECLARE
  tenant_rec RECORD;
  first_user_id UUID;
  created_count INTEGER := 0;
BEGIN
  
  -- Get the first user from auth.users to use as provisioner
  SELECT id INTO first_user_id
  FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- If no users exist, we'll need to handle that
  IF first_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR: No users found in auth.users table. You need at least one user to create auto_provisioning records.';
  END IF;
  
  RAISE NOTICE 'Using user ID: % as provisioner', first_user_id;
  
  -- Loop through all tenants that don't have auto_provisioning
  FOR tenant_rec IN
    SELECT 
      t.id,
      t.name,
      t.slug,
      t.email,
      t.timezone,
      t.currency,
      t.created_at
    FROM tenants t
    WHERE NOT EXISTS (
      SELECT 1 
      FROM auto_provisioning ap 
      WHERE ap.tenant_id = t.id
    )
  LOOP
    
    RAISE NOTICE 'Creating auto_provisioning for: % (slug: %)', tenant_rec.name, tenant_rec.slug;
    
    -- Create the auto_provisioning record
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
    ) VALUES (
      first_user_id,
      tenant_rec.id,
      tenant_rec.name,
      tenant_rec.slug,
      COALESCE(tenant_rec.timezone, 'America/New_York'),
      COALESCE(tenant_rec.currency, 'USD'),
      'completed',
      COALESCE(tenant_rec.email, 'owner@' || tenant_rec.slug || '.blunari.ai'),
      COALESCE(tenant_rec.email, 'owner@' || tenant_rec.slug || '.blunari.ai'),
      tenant_rec.created_at,
      tenant_rec.created_at
    );
    
    created_count := created_count + 1;
    
    -- Ensure the user has a profile
    INSERT INTO profiles (
      user_id,
      email,
      first_name,
      last_name,
      role
    ) VALUES (
      first_user_id,
      COALESCE(tenant_rec.email, 'owner@' || tenant_rec.slug || '.blunari.ai'),
      'Restaurant',
      'Owner',
      'owner'
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      updated_at = NOW();
    
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ SUCCESS: Created % auto_provisioning records', created_count;
  
END $$;

-- Verify the results
SELECT 
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as divider,
  'STEP 3: Verification' as step;

SELECT 
  t.name as tenant_name,
  t.slug,
  ap.id as provisioning_id,
  ap.user_id,
  ap.login_email,
  ap.status,
  p.email as profile_email,
  p.role as profile_role,
  '✅ COMPLETE' as result
FROM tenants t
INNER JOIN auto_provisioning ap ON t.id = ap.tenant_id
LEFT JOIN profiles p ON ap.user_id = p.user_id
ORDER BY t.created_at DESC;

-- Summary
SELECT 
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as divider,
  'SUMMARY' as step;

SELECT 
  COUNT(*) as total_tenants,
  COUNT(ap.id) as with_auto_provisioning,
  COUNT(*) - COUNT(ap.id) as still_missing
FROM tenants t
LEFT JOIN auto_provisioning ap ON t.id = ap.tenant_id;

SELECT 
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as divider,
  '✅ Done! All tenants now have auto_provisioning records.' as final_message;
