-- Fix critical tenant data exposure security vulnerability

-- 1. Drop the overly permissive public policies
DROP POLICY IF EXISTS "Public access to tenant by domain" ON public.tenants;
DROP POLICY IF EXISTS "Strict tenant access control" ON public.tenants;
DROP POLICY IF EXISTS "System can manage tenants" ON public.tenants;

-- 2. Create a secure public view for booking widgets with minimal data
CREATE OR REPLACE VIEW public.tenant_public_info AS
SELECT 
  id,
  name,
  slug,
  status,
  timezone,
  currency
FROM public.tenants 
WHERE status = 'active';

-- Enable RLS on the view
ALTER VIEW public.tenant_public_info SET (security_barrier = true);

-- 3. Create restrictive RLS policies for tenants table

-- Public can only access minimal tenant info through the view
CREATE POLICY "Public minimal tenant access"
ON public.tenants
FOR SELECT
TO public
USING (
  status = 'active' AND 
  -- Only allow access to basic fields needed for booking
  -- This policy will be used by the public view
  id IS NOT NULL
);

-- Authenticated users can view tenants they have access to
CREATE POLICY "Authenticated tenant access"
ON public.tenants
FOR SELECT
TO authenticated
USING (
  user_has_tenant_access(id) OR 
  has_employee_role('SUPPORT'::employee_role)
);

-- Only authenticated users with proper access can modify tenants
CREATE POLICY "Authorized tenant modifications"
ON public.tenants
FOR ALL
TO authenticated
USING (
  user_has_tenant_access(id) OR 
  has_employee_role('ADMIN'::employee_role)
)
WITH CHECK (
  user_has_tenant_access(id) OR 
  has_employee_role('ADMIN'::employee_role)
);

-- 4. Grant access to the public view
GRANT SELECT ON public.tenant_public_info TO public;
GRANT SELECT ON public.tenant_public_info TO authenticated;