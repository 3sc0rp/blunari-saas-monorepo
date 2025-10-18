-- Migration to add the missing get_current_user_tenant_id function
-- This function is essential for Row Level Security (RLS) policies

-- Create or replace the function to get the current user's tenant ID
CREATE OR REPLACE FUNCTION public.get_current_user_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    tenant_id uuid;
BEGIN
    -- First try to get tenant_id from user metadata (for authenticated users)
    SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid INTO tenant_id;
    
    -- If not found in metadata, try getting from user_tenant_access table
    IF tenant_id IS NULL THEN
        SELECT uta.tenant_id INTO tenant_id
        FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
        AND uta.active = true
        LIMIT 1;
    END IF;
    
    -- If still not found, try getting from profiles table if it exists and has tenant_id
    IF tenant_id IS NULL THEN
        BEGIN
            SELECT p.tenant_id INTO tenant_id
            FROM profiles p
            WHERE p.id = auth.uid()
            LIMIT 1;
        EXCEPTION
            WHEN undefined_table THEN
                -- profiles table doesn't exist or doesn't have tenant_id column
                NULL;
        END;
    END IF;
    
    -- For development/demo purposes, if user is authenticated but has no tenant,
    -- we can assign them to the demo tenant if it exists
    IF tenant_id IS NULL AND auth.uid() IS NOT NULL THEN
        SELECT t.id INTO tenant_id
        FROM tenants t
        WHERE t.slug = 'demo'
        AND t.active = true
        LIMIT 1;
    END IF;
    
    RETURN tenant_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_current_user_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_tenant_id() TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_current_user_tenant_id() IS 'Returns the tenant_id for the current authenticated user. Used for RLS policies.';

-- Test the function (this will be commented out in production)
-- SELECT public.get_current_user_tenant_id();
