-- =============================================================================
-- FIX: Create auto_provisioning records WITHOUT needing existing admin
-- =============================================================================
-- This creates auto_provisioning records using the tenant's own auth user
-- Run this in Supabase SQL Editor
-- =============================================================================

-- First, let's see what we're working with
SELECT 
  '=== CURRENT STATE ===' as info;

SELECT 
  t.id as tenant_id,
  t.name,
  t.slug,
  t.email as tenant_email,
  ap.id as has_provisioning,
  CASE 
    WHEN ap.id IS NULL THEN '❌ MISSING'
    ELSE '✅ EXISTS'
  END as status
FROM tenants t
LEFT JOIN auto_provisioning ap ON t.id = ap.tenant_id
ORDER BY t.created_at DESC;

-- Now let's find auth users who might be owners
SELECT 
  '' as separator;

SELECT 
  '=== AUTH USERS ===' as info;

SELECT 
  au.id as user_id,
  au.email,
  au.raw_user_meta_data->>'role' as role,
  au.created_at
FROM auth.users au
ORDER BY au.created_at DESC;

-- =============================================================================
-- THE FIX: Create auto_provisioning for tenants
-- =============================================================================

DO $$
DECLARE
  tenant_rec RECORD;
  owner_user_id UUID;
  created_count INTEGER := 0;
BEGIN
  
  -- For each tenant without auto_provisioning
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
    LEFT JOIN auto_provisioning ap ON t.id = ap.tenant_id
    WHERE ap.id IS NULL
  LOOP
    
    -- Try to find the owner user by email
    SELECT id INTO owner_user_id
    FROM auth.users
    WHERE email = tenant_rec.email
    LIMIT 1;
    
    -- If no user found by email, use the first available user
    IF owner_user_id IS NULL THEN
      SELECT id INTO owner_user_id
      FROM auth.users
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;
    
    -- If still no user, create a placeholder UUID
    IF owner_user_id IS NULL THEN
      owner_user_id := gen_random_uuid();
      RAISE NOTICE 'WARNING: No auth user found, using placeholder UUID for tenant: %', tenant_rec.name;
    END IF;
    
    RAISE NOTICE 'Creating auto_provisioning for: % (user_id: %)', tenant_rec.name, owner_user_id;
    
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
    )
    VALUES (
      owner_user_id,
      tenant_rec.id,
      tenant_rec.name,
      tenant_rec.slug,
      COALESCE(tenant_rec.timezone, 'America/New_York'),
      COALESCE(tenant_rec.currency, 'USD'),
      'completed',
      COALESCE(tenant_rec.email, 'owner@' || tenant_rec.slug || '.com'),
      COALESCE(tenant_rec.email, 'owner@' || tenant_rec.slug || '.com'),
      tenant_rec.created_at,
      tenant_rec.created_at
    )
    ON CONFLICT DO NOTHING;
    
    created_count := created_count + 1;
    
    -- Also create/update profile for this user
    INSERT INTO profiles (
      user_id,
      email,
      first_name,
      last_name,
      role,
      created_at,
      updated_at
    )
    VALUES (
      owner_user_id,
      COALESCE(tenant_rec.email, 'owner@' || tenant_rec.slug || '.com'),
      'Restaurant',
      'Owner',
      'owner',
      tenant_rec.created_at,
      NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      email = EXCLUDED.email,
      role = EXCLUDED.role,
      updated_at = NOW();
    
  END LOOP;
  
  RAISE NOTICE '✅ Created % auto_provisioning records', created_count;
  
END $$;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT 
  '' as separator;

SELECT 
  '=== AFTER FIX ===' as info;

SELECT 
  t.name,
  t.slug,
  ap.id as provisioning_id,
  ap.user_id,
  ap.login_email,
  ap.status,
  p.email as profile_email,
  p.role as profile_role,
  CASE 
    WHEN ap.id IS NOT NULL THEN '✅ FIXED'
    ELSE '❌ STILL MISSING'
  END as status
FROM tenants t
LEFT JOIN auto_provisioning ap ON t.id = ap.tenant_id
LEFT JOIN profiles p ON ap.user_id = p.user_id
ORDER BY t.created_at DESC;

-- Summary
SELECT 
  '' as separator;

SELECT 
  '=== SUMMARY ===' as info;

SELECT 
  COUNT(*) as total_tenants,
  COUNT(ap.id) as with_provisioning,
  COUNT(*) - COUNT(ap.id) as missing_provisioning
FROM tenants t
LEFT JOIN auto_provisioning ap ON t.id = ap.tenant_id;

SELECT '🎉 Fix complete! Check the results above.' as final_message;
