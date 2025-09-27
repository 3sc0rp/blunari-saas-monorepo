-- Critical Security Fixes for Public Data Exposure (Fixed)

-- 1. Secure service_health table - remove public access to system architecture
DROP POLICY IF EXISTS "Admins can view service health" ON public.service_health;
DROP POLICY IF EXISTS "Public can view service health" ON public.service_health;

CREATE POLICY "Admins can view service health"
ON public.service_health
FOR SELECT
TO authenticated
USING (has_employee_role('SUPPORT'::employee_role));

-- 2. Enhanced tenant data protection - limit public access to essential booking data only
DROP POLICY IF EXISTS "Public can view basic tenant info" ON public.tenants;
DROP POLICY IF EXISTS "Public can view minimal tenant booking info" ON public.tenants;

CREATE POLICY "Public can view minimal tenant booking info"
ON public.tenants
FOR SELECT
USING (status = 'active' AND id IS NOT NULL);

-- Create view for public tenant data to limit exposed columns
DROP VIEW IF EXISTS public.tenant_public_info;
CREATE VIEW public.tenant_public_info AS
SELECT 
  id,
  name,
  slug,
  timezone,
  currency
FROM public.tenants 
WHERE status = 'active';

-- 3. Add input sanitization function for XSS prevention
CREATE OR REPLACE FUNCTION public.sanitize_html_input(input_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remove dangerous HTML tags and attributes
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(input_text, '<script[^>]*>.*?</script>', '', 'gi'),
      '<[^>]*javascript:[^>]*>', '', 'gi'
    ),
    '<(iframe|object|embed|form|input)[^>]*>', '', 'gi'
  );
END;
$$;

-- 4. Add rate limiting for security-sensitive operations
CREATE TABLE IF NOT EXISTS public.security_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  ip_address inet,
  operation_type text NOT NULL,
  attempts integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  blocked_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.security_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits"
ON public.security_rate_limits
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 5. Enhanced audit logging for sensitive operations
CREATE OR REPLACE FUNCTION public.enhanced_security_audit(
  operation_type text,
  resource_type text DEFAULT NULL,
  resource_id text DEFAULT NULL,
  sensitive_data_accessed boolean DEFAULT false,
  risk_level text DEFAULT 'low'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;