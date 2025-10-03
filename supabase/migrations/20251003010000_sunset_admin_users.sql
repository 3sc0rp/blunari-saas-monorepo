-- Migration: Sunset admin_users table and migrate to employees
-- This migration creates a compatibility layer and migration path

-- ============================================================================
-- Step 1: Ensure has_admin_access uses employees table (not admin_users)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_admin_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  -- Check employees table (primary source of truth)
  RETURN EXISTS (
    SELECT 1 
    FROM public.employees e
    WHERE e.user_id = auth.uid()
      AND e.status = 'ACTIVE'
      AND e.role IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'OPS')
  );
END;
$$;

COMMENT ON FUNCTION public.has_admin_access IS 'Check if current user has admin access via employees table';

-- ============================================================================
-- Step 2: Create compatibility view for backward compatibility
-- ============================================================================

-- Drop view if exists (to recreate)
DROP VIEW IF EXISTS public.admin_users_compat CASCADE;

-- Create view that maps employees to admin_users structure
CREATE VIEW public.admin_users_compat AS
SELECT 
  e.id,
  e.user_id,
  CASE 
    WHEN e.role = 'SUPER_ADMIN' THEN 'super_admin'
    WHEN e.role = 'ADMIN' THEN 'admin'
    WHEN e.role = 'SUPPORT' THEN 'support'
    WHEN e.role = 'OPS' THEN 'ops'
    ELSE 'viewer'
  END AS role,
  (e.status = 'ACTIVE') AS is_active,
  e.created_at,
  e.updated_at
FROM public.employees e;

COMMENT ON VIEW public.admin_users_compat IS 'Compatibility view mapping employees to legacy admin_users structure';

-- Grant appropriate access
GRANT SELECT ON public.admin_users_compat TO authenticated;

-- ============================================================================
-- Step 3: Migrate any existing admin_users data to employees (if table exists)
-- ============================================================================

DO $$
DECLARE
  admin_users_exists BOOLEAN;
  migration_count INTEGER := 0;
BEGIN
  -- Check if admin_users table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'admin_users'
  ) INTO admin_users_exists;

  IF admin_users_exists THEN
    RAISE NOTICE 'Found admin_users table, migrating data to employees...';

    -- Migrate admin_users to employees (skip if already exists)
    INSERT INTO public.employees (
      user_id,
      employee_id,
      role,
      status,
      hire_date,
      permissions,
      metadata
    )
    SELECT 
      au.user_id,
      'EMP-MIGRATED-' || SUBSTRING(au.user_id::TEXT, 1, 8),
      CASE 
        WHEN au.role = 'super_admin' THEN 'SUPER_ADMIN'::employee_role
        WHEN au.role = 'admin' THEN 'ADMIN'::employee_role
        WHEN au.role = 'support' THEN 'SUPPORT'::employee_role
        WHEN au.role = 'ops' THEN 'OPS'::employee_role
        ELSE 'VIEWER'::employee_role
      END,
      CASE 
        WHEN au.is_active THEN 'ACTIVE'::employee_status
        ELSE 'INACTIVE'::employee_status
      END,
      COALESCE(au.created_at::DATE, CURRENT_DATE),
      '{}'::JSONB,
      jsonb_build_object(
        'migrated_from_admin_users', true,
        'migration_date', NOW()
      )
    FROM public.admin_users au
    WHERE NOT EXISTS (
      SELECT 1 FROM public.employees e 
      WHERE e.user_id = au.user_id
    );

    GET DIAGNOSTICS migration_count = ROW_COUNT;
    RAISE NOTICE 'Migrated % records from admin_users to employees', migration_count;

    -- Log migration event
    IF migration_count > 0 THEN
      PERFORM public.log_security_event(
        'admin_users_migration',
        'info',
        auth.uid(),
        NULL,
        NULL,
        NULL,
        jsonb_build_object('migrated_count', migration_count)
      );
    END IF;
  ELSE
    RAISE NOTICE 'admin_users table not found, skipping migration';
  END IF;
END;
$$;

-- ============================================================================
-- Step 4: Create function to get employee role (replaces admin_users queries)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_current_employee_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  emp_role TEXT;
BEGIN
  SELECT role::TEXT INTO emp_role
  FROM public.employees
  WHERE user_id = auth.uid()
    AND status = 'ACTIVE';
  
  RETURN emp_role;
END;
$$;

COMMENT ON FUNCTION public.get_current_employee_role IS 'Get current user employee role (replaces admin_users.role queries)';

-- ============================================================================
-- Step 5: Update any policies or functions still referencing admin_users
-- ============================================================================

-- Update get_user_admin_role if it exists
CREATE OR REPLACE FUNCTION public.get_user_admin_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN get_current_employee_role();
END;
$$;

-- ============================================================================
-- Step 6: Add deprecation warnings for admin_users table
-- ============================================================================

DO $$
DECLARE
  admin_users_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'admin_users'
  ) INTO admin_users_exists;

  IF admin_users_exists THEN
    -- Add comment to table indicating deprecation
    COMMENT ON TABLE public.admin_users IS 
      'DEPRECATED: Use employees table instead. This table is maintained for backward compatibility only. Will be removed in future version.';
    
    RAISE WARNING 'admin_users table is deprecated. Please use employees table. Run DEPRECATION_CHECK to see affected code.';
  END IF;
END;
$$;

-- ============================================================================
-- Step 7: Create helper function to check for admin_users usage
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_admin_users_deprecation()
RETURNS TABLE (
  object_type TEXT,
  object_name TEXT,
  definition TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  -- Check functions
  SELECT 
    'function'::TEXT,
    p.proname::TEXT,
    pg_get_functiondef(p.oid)::TEXT
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND pg_get_functiondef(p.oid) LIKE '%admin_users%'
    AND p.proname NOT LIKE '%check_admin_users%'
  
  UNION ALL
  
  -- Check views
  SELECT 
    'view'::TEXT,
    c.relname::TEXT,
    pg_get_viewdef(c.oid)::TEXT
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND c.relkind = 'v'
    AND pg_get_viewdef(c.oid) LIKE '%admin_users%'
    AND c.relname NOT LIKE '%admin_users_compat%';
END;
$$;

COMMENT ON FUNCTION public.check_admin_users_deprecation IS 'Identify code still using deprecated admin_users table';

-- ============================================================================
-- Step 8: Grant permissions for compatibility
-- ============================================================================

-- Ensure authenticated users can query employees for admin checks
GRANT SELECT ON public.employees TO authenticated;

-- ============================================================================
-- Final notes and instructions
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '
╔══════════════════════════════════════════════════════════════════════════╗
║                   ADMIN_USERS SUNSET MIGRATION COMPLETE                  ║
╚══════════════════════════════════════════════════════════════════════════╝

✅ Completed Actions:
  • has_admin_access() now uses employees table
  • Created admin_users_compat view for backward compatibility
  • Migrated existing admin_users data to employees
  • Created get_current_employee_role() helper function

📋 Next Steps:
  1. Update client code to use employees table instead of admin_users
  2. Run: SELECT * FROM check_admin_users_deprecation();
     to identify remaining usage
  3. Test all admin authentication flows
  4. Once verified, drop admin_users table in future migration

⚠️  Backward Compatibility:
  • admin_users_compat view available for legacy code
  • Will be removed in 30 days (next major release)

📚 Documentation:
  • See IMPLEMENTATION_SUMMARY for migration guide
  • Update AuthContext.tsx to remove admin_users fallback
';
END;
$$;

