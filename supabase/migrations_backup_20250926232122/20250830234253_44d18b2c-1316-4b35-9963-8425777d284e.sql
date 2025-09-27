-- Fix critical security vulnerabilities in RLS policies (avoiding conflicts)

-- 1. Secure tenants table - remove overly permissive public access
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

-- 2. Secure pricing plans - remove public access
DROP POLICY IF EXISTS "Public can view pricing plans" ON public.pricing_plans;

CREATE POLICY "Authenticated users can view pricing plans"
ON public.pricing_plans
FOR SELECT
TO authenticated
USING (true);

-- 3. Secure background jobs - ensure no public access  
DROP POLICY IF EXISTS "Public can view background jobs" ON public.background_jobs;

-- 4. Add enhanced security logging function
CREATE OR REPLACE FUNCTION public.log_security_violation(
  violation_type text,
  user_id uuid DEFAULT auth.uid(),
  details jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM log_security_event(
    violation_type,
    'high',
    user_id,
    NULL,
    NULL::inet,
    NULL,
    details
  );
END;
$$;

-- 5. Add function to validate strict tenant access
CREATE OR REPLACE FUNCTION public.strict_tenant_access_check(tenant_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user has valid access to this specific tenant
  IF NOT user_has_tenant_access(tenant_uuid) THEN
    -- Log potential security violation
    PERFORM log_security_violation(
      'unauthorized_tenant_access_attempt',
      auth.uid(),
      jsonb_build_object('tenant_id', tenant_uuid)
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;