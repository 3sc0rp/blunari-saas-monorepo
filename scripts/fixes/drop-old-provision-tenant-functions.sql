-- Drop the old overloaded versions of provision_tenant that use 'large' table type
-- Keep only the correct version with signature (p_tenant_data jsonb, p_owner_email text, p_owner_user_id uuid)

-- Drop the 5-parameter version
DROP FUNCTION IF EXISTS public.provision_tenant(uuid, text, text, text, text);

-- Drop the 11-parameter version
DROP FUNCTION IF EXISTS public.provision_tenant(uuid, text, text, text, text, text, text, text, text, jsonb, uuid);

-- Verify the correct function remains
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as parameters
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'provision_tenant'
AND n.nspname = 'public';
