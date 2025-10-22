-- Fix script for tenant with wrong email in auto_provisioning
-- Tenant: f8201737-3b21-4a68-b32b-101629bbdla8 (Warrior Factory)
-- Problem: auto_provisioning linked to naturevillage2024@gmail.com instead of wfactory@gmail.com

-- Step 1: Verify the current state
SELECT 
  'Current State' as check_name,
  t.id as tenant_id,
  t.name,
  t.email as tenant_email,
  t.owner_id,
  ap.user_id as autoprov_user_id,
  u1.email as owner_email,
  u2.email as autoprov_email
FROM tenants t
LEFT JOIN auto_provisioning ap ON ap.tenant_id = t.id
LEFT JOIN auth.users u1 ON u1.id = t.owner_id
LEFT JOIN auth.users u2 ON u2.id = ap.user_id
WHERE t.id = 'f8201737-3b21-4a68-b32b-101629bbdla8';

-- Step 2: Find the correct user for wfactory@gmail.com
SELECT 
  'Find wfactory user' as check_name,
  u.id as user_id,
  u.email,
  u.created_at,
  e.role as employee_role,
  CASE 
    WHEN e.id IS NOT NULL THEN '⚠️ This is an admin user!'
    ELSE '✅ Regular user'
  END as status
FROM auth.users u
LEFT JOIN employees e ON e.user_id = u.id AND e.status = 'ACTIVE'
WHERE u.email = 'wfactory@gmail.com';

-- Step 3: Check what other tenants are using naturevillage2024@gmail.com
SELECT 
  'Tenants using naturevillage email' as check_name,
  t.id as tenant_id,
  t.name,
  t.email as tenant_email,
  ap.user_id,
  u.email as user_email
FROM tenants t
LEFT JOIN auto_provisioning ap ON ap.tenant_id = t.id
LEFT JOIN auth.users u ON u.id = ap.user_id
WHERE u.email = 'naturevillage2024@gmail.com';

-- ============================================================================
-- FIX OPTIONS (Choose ONE based on the results above)
-- ============================================================================

-- OPTION 1: If wfactory@gmail.com exists and is NOT an admin
-- This updates the tenant to use the correct user
/*
-- First, get the correct user ID
DO $$
DECLARE
  correct_user_id uuid;
BEGIN
  -- Find wfactory@gmail.com user
  SELECT id INTO correct_user_id FROM auth.users WHERE email = 'wfactory@gmail.com';
  
  IF correct_user_id IS NULL THEN
    RAISE EXCEPTION 'wfactory@gmail.com user not found in auth.users';
  END IF;
  
  -- Update tenant owner_id
  UPDATE tenants 
  SET owner_id = correct_user_id,
      email = 'wfactory@gmail.com'
  WHERE id = 'f8201737-3b21-4a68-b32b-101629bbdla8';
  
  -- Update auto_provisioning
  UPDATE auto_provisioning
  SET user_id = correct_user_id
  WHERE tenant_id = 'f8201737-3b21-4a68-b32b-101629bbdla8';
  
  -- Update profile email if exists
  UPDATE profiles
  SET email = 'wfactory@gmail.com'
  WHERE user_id = correct_user_id;
  
  RAISE NOTICE 'Tenant updated to use wfactory@gmail.com (user_id: %)', correct_user_id;
END $$;
*/

-- OPTION 2: If wfactory@gmail.com does NOT exist
-- This will make the Edge Function create a new owner with wfactory@gmail.com
/*
-- Clear the existing owner_id and auto_provisioning
UPDATE tenants 
SET owner_id = NULL,
    email = 'wfactory@gmail.com'
WHERE id = 'f8201737-3b21-4a68-b32b-101629bbdla8';

-- Delete the incorrect auto_provisioning record
DELETE FROM auto_provisioning 
WHERE tenant_id = 'f8201737-3b21-4a68-b32b-101629bbdla8';

-- Now go to admin dashboard and update the tenant email to wfactory@gmail.com
-- The Edge Function will create a new owner account
*/

-- OPTION 3: If wfactory@gmail.com is an ADMIN user (CRITICAL)
-- This requires creating a separate tenant owner account
/*
-- This will force creation of system email for the tenant
UPDATE tenants 
SET owner_id = NULL,
    email = 'wfactory@gmail.com'  -- Keep this for reference
WHERE id = 'f8201737-3b21-4a68-b32b-101629bbdla8';

-- Delete the incorrect auto_provisioning
DELETE FROM auto_provisioning 
WHERE tenant_id = 'f8201737-3b21-4a68-b32b-101629bbdla8';

-- The Edge Function will detect that wfactory@gmail.com is an admin
-- and will create: tenant-f8201737-3b21-4a68-b32b-101629bbdla8@blunari-system.local
*/

-- ============================================================================
-- VERIFICATION (Run after applying fix)
-- ============================================================================
/*
SELECT 
  'After Fix' as check_name,
  t.id as tenant_id,
  t.name,
  t.email as tenant_email,
  t.owner_id,
  u.email as owner_auth_email,
  ap.user_id as autoprov_user_id,
  CASE 
    WHEN t.owner_id = ap.user_id THEN '✅ owner_id matches auto_provisioning'
    ELSE '❌ Mismatch!'
  END as status
FROM tenants t
LEFT JOIN auth.users u ON u.id = t.owner_id
LEFT JOIN auto_provisioning ap ON ap.tenant_id = t.id
WHERE t.id = 'f8201737-3b21-4a68-b32b-101629bbdla8';
*/
