-- =============================================================================
-- SIMPLE DIRECT FIX: Create auto_provisioning records
-- =============================================================================
-- Copy and paste this entire script into the Supabase SQL Editor
-- Click "Run" button
-- =============================================================================

-- Step 1: Check current state
SELECT '=== STEP 1: Current State ===' as step;

SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  t.slug,
  t.email as tenant_email,
  CASE 
    WHEN ap.id IS NULL THEN '❌ Missing auto_provisioning'
    ELSE '✅ Has auto_provisioning'
  END as status
FROM tenants t
LEFT JOIN auto_provisioning ap ON t.id = ap.tenant_id;

-- Step 2: Get or create a user for provisioning
SELECT '' as separator;
SELECT '=== STEP 2: Finding/Creating User ===' as step;

DO $$
DECLARE
  provision_user_id UUID;
  tenant_rec RECORD;
  created_count INTEGER := 0;
BEGIN
  
  -- Try to get the first auth user
  SELECT id INTO provision_user_id
  FROM auth.users
  LIMIT 1;
  
  -- If no user exists at all, we'll use a fixed UUID
  -- (This shouldn't happen in production, but handles edge case)
  IF provision_user_id IS NULL THEN
    provision_user_id := '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE 'No auth.users found, using placeholder UUID';
  ELSE
    RAISE NOTICE 'Using auth user: %', provision_user_id;
  END IF;
  
  -- Now create auto_provisioning for each tenant that needs it
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
      SELECT 1 FROM auto_provisioning WHERE tenant_id = t.id
    )
  LOOP
    
    RAISE NOTICE 'Creating auto_provisioning for: %', tenant_rec.name;
    
    -- Insert auto_provisioning
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
      provision_user_id,
      tenant_rec.id,
      tenant_rec.name,
      tenant_rec.slug,
      COALESCE(tenant_rec.timezone, 'America/New_York'),
      COALESCE(tenant_rec.currency, 'USD'),
      'completed',
      COALESCE(tenant_rec.email, 'admin@blunari.ai'),
      COALESCE(tenant_rec.email, 'admin@blunari.ai'),
      tenant_rec.created_at,
      tenant_rec.created_at
    );
    
    created_count := created_count + 1;
    
    -- Also ensure profile exists
    INSERT INTO profiles (
      user_id,
      email,
      first_name,
      last_name,
      role
    ) VALUES (
      provision_user_id,
      COALESCE(tenant_rec.email, 'admin@blunari.ai'),
      'System',
      'Admin',
      'owner'
    )
    ON CONFLICT (user_id) DO NOTHING;
    
  END LOOP;
  
  IF created_count = 0 THEN
    RAISE NOTICE '✅ All tenants already have auto_provisioning!';
  ELSE
    RAISE NOTICE '✅ Created % auto_provisioning records!', created_count;
  END IF;
  
END $$;

-- Step 3: Verify the fix
SELECT '' as separator;
SELECT '=== STEP 3: Verification ===' as step;

SELECT 
  t.name as tenant_name,
  t.slug,
  ap.id as provisioning_id,
  ap.user_id,
  ap.login_email,
  ap.status,
  p.email as profile_email,
  CASE 
    WHEN ap.id IS NOT NULL THEN '✅ FIXED'
    ELSE '❌ PROBLEM'
  END as result
FROM tenants t
LEFT JOIN auto_provisioning ap ON t.id = ap.tenant_id
LEFT JOIN profiles p ON ap.user_id = p.user_id
ORDER BY t.created_at DESC;

-- Final summary
SELECT '' as separator;
SELECT '=== FINAL SUMMARY ===' as step;

SELECT 
  COUNT(*) as total_tenants,
  COUNT(ap.id) as with_auto_provisioning,
  COUNT(*) - COUNT(ap.id) as still_missing
FROM tenants t
LEFT JOIN auto_provisioning ap ON t.id = ap.tenant_id;

SELECT '✅ Script complete! Check results above.' as done;
