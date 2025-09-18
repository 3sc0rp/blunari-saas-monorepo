-- Security Fix 1: Secure public data access in domains table
-- Remove overly permissive public access
DROP POLICY IF EXISTS "Public access to domains" ON public.domains;

-- Create restricted public access for domains (only active verified domains)
CREATE POLICY "Public can view active verified domains" ON public.domains
FOR SELECT 
USING (status = 'active'::domain_status AND verification_status = 'verified');

-- Security Fix 2: Create secure public view for tenant information
-- This allows public access to only essential tenant data for booking widgets
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

-- Allow public access to the view
GRANT SELECT ON public.tenant_public_info TO anon;

-- Security Fix 3: Secure API keys table with better isolation
DROP POLICY IF EXISTS "Users can manage their own API keys" ON public.api_keys;

CREATE POLICY "Secure API key management" ON public.api_keys
FOR ALL 
USING (auth.uid() = user_id OR has_employee_role('SUPER_ADMIN'::employee_role))
WITH CHECK (auth.uid() = user_id OR has_employee_role('SUPER_ADMIN'::employee_role));

-- Security Fix 4: Create function to validate sensitive operations
CREATE OR REPLACE FUNCTION public.validate_sensitive_operation(operation_type text, resource_id text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role employee_role;
BEGIN
  -- Check if user has valid employee role
  SELECT role INTO user_role
  FROM public.employees
  WHERE user_id = auth.uid() 
    AND status = 'ACTIVE';
  
  IF user_role IS NULL THEN
    -- Log suspicious activity
    PERFORM log_security_event(
      'unauthorized_sensitive_operation_attempt',
      'high',
      auth.uid(),
      NULL,
      NULL::inet,
      NULL,
      jsonb_build_object(
        'operation_type', operation_type,
        'resource_id', resource_id,
        'timestamp', now()
      )
    );
    RETURN false;
  END IF;
  
  -- For high-privilege operations, require ADMIN or SUPER_ADMIN
  IF operation_type IN ('delete_tenant', 'modify_employee_role', 'access_api_keys') THEN
    IF user_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
      PERFORM log_security_event(
        'insufficient_privileges_for_operation',
        'medium',
        auth.uid(),
        NULL,
        NULL::inet,
        NULL,
        jsonb_build_object(
          'operation_type', operation_type,
          'user_role', user_role,
          'required_role', 'ADMIN_OR_HIGHER'
        )
      );
      RETURN false;
    END IF;
  END IF;
  
  RETURN true;
END;
$function$;

-- Security Fix 5: Create security monitoring trigger
CREATE OR REPLACE FUNCTION public.monitor_sensitive_table_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Monitor access to sensitive tables
  IF TG_TABLE_NAME IN ('employees', 'api_keys', 'tenants', 'security_events') THEN
    -- Log access to sensitive tables
    PERFORM log_security_event(
      'sensitive_table_access',
      'info',
      auth.uid(),
      NULL,
      NULL::inet,
      NULL,
      jsonb_build_object(
        'table_name', TG_TABLE_NAME,
        'operation', TG_OP,
        'timestamp', now()
      )
    );
  END IF;
  
  -- For DELETE operations on critical tables, require additional validation
  IF TG_OP = 'DELETE' AND TG_TABLE_NAME IN ('tenants', 'employees') THEN
    IF NOT validate_sensitive_operation('delete_' || TG_TABLE_NAME, OLD.id::text) THEN
      RAISE EXCEPTION 'Access denied: Insufficient privileges for % operation', TG_OP;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Apply monitoring triggers to sensitive tables
DROP TRIGGER IF EXISTS monitor_employees_access ON public.employees;
CREATE TRIGGER monitor_employees_access
  BEFORE INSERT OR UPDATE OR DELETE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION monitor_sensitive_table_access();

DROP TRIGGER IF EXISTS monitor_api_keys_access ON public.api_keys;
CREATE TRIGGER monitor_api_keys_access
  BEFORE INSERT OR UPDATE OR DELETE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION monitor_sensitive_table_access();

-- Security Fix 6: Add rate limiting for sensitive operations
CREATE TABLE IF NOT EXISTS public.operation_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  operation_type text NOT NULL,
  attempts_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, operation_type, window_start)
);

ALTER TABLE public.operation_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits" ON public.operation_rate_limits
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage rate limits" ON public.operation_rate_limits
FOR ALL USING (true) WITH CHECK (true);

-- Security Fix 7: Harden remaining database functions
CREATE OR REPLACE FUNCTION public.enhanced_security_audit(operation_type text, resource_type text DEFAULT NULL::text, resource_id text DEFAULT NULL::text, sensitive_data_accessed boolean DEFAULT false, risk_level text DEFAULT 'low'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Log to security events with enhanced metadata
  PERFORM log_security_event(
    operation_type,
    CASE 
      WHEN sensitive_data_accessed THEN 'high'
      WHEN risk_level = 'high' THEN 'high'
      WHEN risk_level = 'medium' THEN 'medium'
      ELSE 'info'
    END,
    auth.uid(),
    NULL,
    NULL::inet,
    NULL,
    jsonb_build_object(
      'resource_type', resource_type,
      'resource_id', resource_id,
      'sensitive_data_accessed', sensitive_data_accessed,
      'risk_level', risk_level,
      'timestamp', now(),
      'session_id', current_setting('application_name', true)
    )
  );
END;
$function$;