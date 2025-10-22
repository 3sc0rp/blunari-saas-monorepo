-- =============================================================================
-- FIX: Grant permissions for delete_tenant_complete function
-- =============================================================================

-- Grant execute permission to authenticated users (admins)
GRANT EXECUTE ON FUNCTION public.delete_tenant_complete(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_tenant_complete(uuid) TO service_role;

-- Verify the function exists and has correct signature
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as is_security_definer,
  'Should be true for SECURITY DEFINER' as note
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'delete_tenant_complete';

-- Test if you have permission to call it (replace with a test tenant ID)
-- DO NOT run this on production data!
-- SELECT delete_tenant_complete('00000000-0000-0000-0000-000000000000');
