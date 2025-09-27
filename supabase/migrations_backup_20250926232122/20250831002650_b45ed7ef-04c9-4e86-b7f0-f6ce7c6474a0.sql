-- Fix remaining security linter warnings

-- Security Fix: Add SET search_path to remaining functions that need it
CREATE OR REPLACE FUNCTION public.get_current_user_tenant_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  tenant_uuid UUID;
BEGIN
  SELECT t.id INTO tenant_uuid
  FROM public.auto_provisioning ap
  JOIN public.tenants t ON t.id = ap.tenant_id
  WHERE ap.user_id = auth.uid()
    AND ap.status = 'completed'
  ORDER BY ap.created_at DESC
  LIMIT 1;
  
  RETURN tenant_uuid;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_current_employee()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  employee_uuid UUID;
BEGIN
  SELECT id INTO employee_uuid
  FROM public.employees
  WHERE user_id = auth.uid()
    AND status = 'ACTIVE';
  
  RETURN employee_uuid;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_employee_role(required_role employee_role)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_role employee_role;
BEGIN
  SELECT role INTO user_role
  FROM public.employees
  WHERE user_id = auth.uid()
    AND status = 'ACTIVE';
  
  -- Role hierarchy: SUPER_ADMIN > ADMIN > SUPPORT > OPS > VIEWER
  CASE required_role
    WHEN 'VIEWER' THEN
      RETURN user_role IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'OPS', 'VIEWER');
    WHEN 'OPS' THEN
      RETURN user_role IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'OPS');
    WHEN 'SUPPORT' THEN
      RETURN user_role IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT');
    WHEN 'ADMIN' THEN
      RETURN user_role IN ('SUPER_ADMIN', 'ADMIN');
    WHEN 'SUPER_ADMIN' THEN
      RETURN user_role = 'SUPER_ADMIN';
    ELSE
      RETURN FALSE;
  END CASE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_has_tenant_access(target_tenant_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.auto_provisioning ap
    WHERE ap.user_id = auth.uid()
      AND ap.tenant_id = target_tenant_id
      AND ap.status = 'completed'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_tenant_access(tenant_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  has_access boolean := false;
BEGIN
  -- Check if user has direct tenant access through auto_provisioning
  SELECT EXISTS (
    SELECT 1
    FROM public.auto_provisioning ap
    WHERE ap.user_id = auth.uid()
      AND ap.tenant_id = tenant_uuid
      AND ap.status = 'completed'
  ) INTO has_access;
  
  -- If no direct access, check employee access
  IF NOT has_access THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.employees e
      JOIN public.auto_provisioning ap ON ap.user_id = e.user_id
      WHERE e.user_id = auth.uid()
        AND e.status = 'ACTIVE'
        AND ap.tenant_id = tenant_uuid
        AND ap.status = 'completed'
    ) INTO has_access;
  END IF;
  
  RETURN has_access;
END;
$function$;

CREATE OR REPLACE FUNCTION public.strict_tenant_access_check(target_tenant_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Must be authenticated
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check direct tenant ownership
  RETURN EXISTS (
    SELECT 1
    FROM public.auto_provisioning ap
    WHERE ap.user_id = auth.uid()
      AND ap.tenant_id = target_tenant_id
      AND ap.status = 'completed'
  ) OR has_employee_role('ADMIN'::employee_role);
END;
$function$;

-- Remove the security definer view if it exists (per linter recommendation)
DROP VIEW IF EXISTS public.tenant_public_info_secure;

-- Ensure the public view has proper grants but no security definer
DROP VIEW IF EXISTS public.tenant_public_info;
CREATE VIEW public.tenant_public_info AS
SELECT 
  t.id,
  t.name,
  t.slug,
  t.timezone,
  t.currency,
  t.description,
  t.cuisine_type_id
FROM public.tenants t 
WHERE t.status = 'active';

-- Grant access to the view
GRANT SELECT ON public.tenant_public_info TO authenticated;
GRANT SELECT ON public.tenant_public_info TO anon;