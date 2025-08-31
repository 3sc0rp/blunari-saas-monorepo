-- Fix the security definer view issue

-- Drop the current view with security_barrier
DROP VIEW IF EXISTS public.tenant_public_info;

-- Recreate the view without SECURITY DEFINER to avoid bypassing RLS
CREATE VIEW public.tenant_public_info AS
SELECT 
  id,
  name,
  slug,
  status,
  timezone,
  currency
FROM public.tenants 
WHERE status = 'active';

-- Grant appropriate permissions
GRANT SELECT ON public.tenant_public_info TO public;
GRANT SELECT ON public.tenant_public_info TO authenticated;

-- Create a secure function for public tenant lookup that respects RLS
CREATE OR REPLACE FUNCTION public.get_public_tenant_info(tenant_slug text)
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  timezone text,
  currency text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT t.id, t.name, t.slug, t.timezone, t.currency
  FROM public.tenants t
  WHERE t.slug = tenant_slug 
    AND t.status = 'active';
$$;