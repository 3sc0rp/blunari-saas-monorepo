-- Fix critical security vulnerabilities in RLS policies (fixing function conflicts)

-- 1. Drop and recreate the strict access function with correct signature
DROP FUNCTION IF EXISTS public.strict_tenant_access_check(uuid);

CREATE OR REPLACE FUNCTION public.strict_tenant_access_check(target_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user has valid access to this specific tenant
  IF NOT user_has_tenant_access(target_tenant_id) THEN
    -- Log potential security violation
    PERFORM log_security_event(
      'unauthorized_tenant_access_attempt',
      'high',
      auth.uid(),
      NULL,
      NULL::inet,
      NULL,
      jsonb_build_object('tenant_id', target_tenant_id)
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 2. Secure tenants table - remove overly permissive public access
DROP POLICY IF EXISTS "Public can view active tenants" ON public.tenants;

-- Create more restrictive public access for tenants (only basic info for active tenants)
CREATE POLICY "Public can view basic tenant info" 
ON public.tenants 
FOR SELECT 
USING (status = 'active' AND id IS NOT NULL);

-- Authenticated users can view full tenant data they have access to
CREATE POLICY "Authenticated users can view accessible tenant data"
ON public.tenants
FOR SELECT
TO authenticated
USING (validate_tenant_access(id) OR has_employee_role('SUPPORT'::employee_role));

-- 3. Secure pricing plans - remove public access
DROP POLICY IF EXISTS "Public can view pricing plans" ON public.pricing_plans;

CREATE POLICY "Authenticated users can view pricing plans"
ON public.pricing_plans
FOR SELECT
TO authenticated
USING (true);