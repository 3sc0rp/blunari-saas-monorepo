-- ================================================================
-- TENANT SYSTEM RESET AND OPTIMIZATION
-- Date: October 7, 2025
-- Purpose: Complete tenant data wipeout and schema improvements
-- ================================================================

-- This migration:
-- 1. Backs up admin data
-- 2. Wipes all tenant data
-- 3. Optimizes profiles table structure
-- 4. Removes unused user_roles table
-- 5. Adds email sync automation
-- 6. Improves data integrity constraints

BEGIN;

-- ================================================================
-- PHASE 1: BACKUP ADMIN DATA
-- ================================================================

-- Create backup table for admin employees (just in case)
CREATE TABLE IF NOT EXISTS _backup_admin_employees_20251007 AS
SELECT 
  e.id,
  e.user_id,
  e.employee_id,
  e.role,
  e.status,
  e.hire_date,
  e.permissions,
  e.metadata,
  e.department_id,
  e.last_login,
  e.last_activity,
  e.created_at,
  e.updated_at,
  p.email as profile_email,
  p.first_name as profile_first_name,
  p.last_name as profile_last_name,
  au.email as auth_email
FROM employees e
LEFT JOIN profiles p ON p.user_id = e.user_id
LEFT JOIN auth.users au ON au.id = e.user_id;

-- Log the backup
DO $$
DECLARE
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM _backup_admin_employees_20251007;
  RAISE NOTICE 'Backed up % admin employees', admin_count;
END $$;

-- ================================================================
-- PHASE 2: WIPE ALL TENANT DATA
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE 'Starting tenant data wipeout...';
END $$;

-- Delete all booking-related data first (to avoid FK issues)
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete booking holds (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_holds') THEN
    DELETE FROM booking_holds;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % booking holds', deleted_count;
  ELSE
    RAISE NOTICE 'Table booking_holds does not exist, skipping';
  END IF;
  
  -- Delete bookings (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
    DELETE FROM bookings;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % bookings', deleted_count;
  ELSE
    RAISE NOTICE 'Table bookings does not exist, skipping';
  END IF;
  
  -- Delete restaurant tables (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'restaurant_tables') THEN
    DELETE FROM restaurant_tables;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % restaurant tables', deleted_count;
  ELSE
    RAISE NOTICE 'Table restaurant_tables does not exist, skipping';
  END IF;
  
  -- Delete waitlist entries (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'waitlist_entries') THEN
    DELETE FROM waitlist_entries WHERE tenant_id IS NOT NULL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % waitlist entries', deleted_count;
  ELSE
    RAISE NOTICE 'Table waitlist_entries does not exist, skipping';
  END IF;
  
  -- Delete tenant features (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_features') THEN
    DELETE FROM tenant_features;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % tenant features', deleted_count;
  ELSE
    RAISE NOTICE 'Table tenant_features does not exist, skipping';
  END IF;
  
  -- Delete analytics events (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_events') THEN
    DELETE FROM analytics_events WHERE tenant_id IS NOT NULL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % analytics events', deleted_count;
  ELSE
    RAISE NOTICE 'Table analytics_events does not exist, skipping';
  END IF;
END $$;

-- Delete support tickets (if exists)
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_tickets') THEN
    DELETE FROM support_tickets WHERE tenant_id IS NOT NULL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % support tickets', deleted_count;
  ELSE
    RAISE NOTICE 'Table support_tickets does not exist, skipping';
  END IF;
END $$;

-- Delete auto_provisioning records
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM auto_provisioning;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % auto_provisioning records', deleted_count;
END $$;

-- Delete all tenants (this should cascade to remaining related tables)
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM tenants;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % tenants', deleted_count;
END $$;

-- Delete tenant owner profiles (keep admin profiles)
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM profiles 
  WHERE user_id NOT IN (
    SELECT user_id FROM employees WHERE user_id IS NOT NULL
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % tenant owner profiles', deleted_count;
END $$;

-- Delete tenant owner auth users (keep admin users)
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM auth.users
  WHERE id NOT IN (
    SELECT user_id FROM employees WHERE user_id IS NOT NULL
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % tenant owner auth users', deleted_count;
END $$;

-- Clean up orphaned user_roles (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
    DELETE FROM user_roles WHERE user_id NOT IN (SELECT id FROM auth.users);
    RAISE NOTICE 'Cleaned up orphaned user_roles';
  END IF;
END $$;

-- Clean up orphaned security events
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_events') THEN
    DELETE FROM security_events 
    WHERE event_data IS NOT NULL 
    AND event_data->>'tenant_id' IS NOT NULL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % tenant security events', deleted_count;
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'Tenant data wipeout complete!';
END $$;

-- ================================================================
-- PHASE 3: SCHEMA OPTIMIZATION
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE 'Starting schema optimization...';
END $$;

-- Step 1: Remove user_roles table (not actively used)
DROP TABLE IF EXISTS user_roles CASCADE;

DO $$
BEGIN
  RAISE NOTICE 'Removed unused user_roles table';
END $$;

-- Step 2: Optimize profiles table structure
-- Note: We need to be careful here since profiles might be referenced

-- First, fix any profiles with NULL user_id
DO $$
DECLARE
  null_count INTEGER;
  fixed_count INTEGER := 0;
BEGIN
  SELECT COUNT(*) INTO null_count FROM profiles WHERE user_id IS NULL;
  
  IF null_count > 0 THEN
    RAISE NOTICE 'Found % profiles with NULL user_id, attempting to fix...', null_count;
    
    -- Try to link profiles to auth users by matching email
    UPDATE profiles p
    SET user_id = au.id
    FROM auth.users au
    WHERE p.user_id IS NULL
    AND p.email = au.email;
    
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    RAISE NOTICE 'Fixed % profiles by linking to auth.users', fixed_count;
    
    -- Delete any remaining profiles that couldn't be linked
    DELETE FROM profiles WHERE user_id IS NULL;
    GET DIAGNOSTICS null_count = ROW_COUNT;
    
    IF null_count > 0 THEN
      RAISE NOTICE 'Deleted % orphaned profiles with NULL user_id', null_count;
    END IF;
  END IF;
  
  RAISE NOTICE 'All profiles now have valid user_id';
END $$;

-- Drop old RLS policies that depend on profiles.id
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update safe profile fields only" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile only" ON profiles;
DROP POLICY IF EXISTS "Users can view accessible profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Drop views that depend on profiles.id
DROP VIEW IF EXISTS employees_with_profiles CASCADE;

-- Drop the old primary key and id column
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_pkey CASCADE;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_key CASCADE;

-- Make user_id the primary key
ALTER TABLE profiles ADD PRIMARY KEY (user_id);

-- Drop the old id column if it exists and isn't user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'id'
    AND column_name != 'user_id'
  ) THEN
    ALTER TABLE profiles DROP COLUMN id CASCADE;
    RAISE NOTICE 'Dropped redundant profiles.id column and its dependencies';
  END IF;
END $$;

-- Make user_id NOT NULL
ALTER TABLE profiles ALTER COLUMN user_id SET NOT NULL;

-- Ensure email is NOT NULL and has proper constraint
ALTER TABLE profiles ALTER COLUMN email SET NOT NULL;
ALTER TABLE profiles ADD CONSTRAINT profiles_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

DO $$
BEGIN
  RAISE NOTICE 'Optimized profiles table structure';
END $$;

-- Step 3: Add email sync trigger (auth.users → profiles)
CREATE OR REPLACE FUNCTION sync_auth_email_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update profile email when auth.users email changes
  UPDATE public.profiles 
  SET email = NEW.email, updated_at = NOW()
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS sync_auth_email_to_profile_trigger ON auth.users;

-- Create trigger
CREATE TRIGGER sync_auth_email_to_profile_trigger
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
WHEN (OLD.email IS DISTINCT FROM NEW.email)
EXECUTE FUNCTION sync_auth_email_to_profile();

DO $$
BEGIN
  RAISE NOTICE 'Created email sync trigger';
END $$;

-- Step 4: Improve RLS policies for profiles
-- Note: Old policies were already dropped during schema optimization

-- Create improved policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE user_id = auth.uid() 
      AND role IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT')
      AND status = 'ACTIVE'
    )
  );

DO $$
BEGIN
  RAISE NOTICE 'Updated RLS policies for profiles';
END $$;

-- Step 5: Add better indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_provisioning_user_id ON auto_provisioning(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_provisioning_tenant_id ON auto_provisioning(tenant_id);
CREATE INDEX IF NOT EXISTS idx_auto_provisioning_status ON auto_provisioning(status);

DO $$
BEGIN
  RAISE NOTICE 'Added performance indexes';
END $$;

-- Step 6: Update handle_new_user function to use new schema
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email;
  
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  RAISE NOTICE 'Updated handle_new_user function';
END $$;

-- ================================================================
-- PHASE 4: VERIFICATION
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE 'Running verification checks...';
END $$;

-- Verify clean state
DO $$
DECLARE
  tenant_count INTEGER;
  profile_count INTEGER;
  employee_count INTEGER;
  auth_user_count INTEGER;
  provisioning_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO tenant_count FROM tenants;
  SELECT COUNT(*) INTO profile_count FROM profiles;
  SELECT COUNT(*) INTO employee_count FROM employees;
  SELECT COUNT(*) INTO auth_user_count FROM auth.users;
  SELECT COUNT(*) INTO provisioning_count FROM auto_provisioning;
  
  RAISE NOTICE 'Final counts:';
  RAISE NOTICE '  Tenants: %', tenant_count;
  RAISE NOTICE '  Profiles: %', profile_count;
  RAISE NOTICE '  Employees: %', employee_count;
  RAISE NOTICE '  Auth Users: %', auth_user_count;
  RAISE NOTICE '  Auto Provisioning: %', provisioning_count;
  
  -- Verify no NULL user_ids in profiles
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'Found profiles with NULL user_id after migration!';
  END IF;
  
  -- Verify all profiles have matching auth users
  IF EXISTS (
    SELECT 1 FROM profiles p 
    WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p.user_id)
  ) THEN
    RAISE EXCEPTION 'Found profiles without matching auth users!';
  END IF;
  
  RAISE NOTICE 'All verification checks passed!';
END $$;

-- ================================================================
-- PHASE 5: DOCUMENTATION
-- ================================================================

-- Create a summary table for reference
CREATE TABLE IF NOT EXISTS _migration_summary (
  migration_date TIMESTAMPTZ DEFAULT NOW(),
  migration_name TEXT,
  description TEXT
);

INSERT INTO _migration_summary (migration_name, description)
VALUES (
  '20251007000000_tenant_system_reset_and_optimization',
  'Complete tenant data wipeout and schema optimization. Removed unused user_roles table, optimized profiles structure, added email sync trigger.'
);

-- ================================================================
-- COMMIT
-- ================================================================

COMMIT;

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  ✅ All tenant data wiped';
  RAISE NOTICE '  ✅ Admin accounts preserved';
  RAISE NOTICE '  ✅ profiles.user_id is now PRIMARY KEY';
  RAISE NOTICE '  ✅ Email sync trigger added';
  RAISE NOTICE '  ✅ user_roles table removed';
  RAISE NOTICE '  ✅ RLS policies improved';
  RAISE NOTICE '  ✅ Performance indexes added';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Test tenant creation flow';
  RAISE NOTICE '  2. Test credential management';
  RAISE NOTICE '  3. Verify admin dashboard access';
  RAISE NOTICE '';
END $$;
