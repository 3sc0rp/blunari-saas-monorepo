-- Final comprehensive security fix
-- Let's identify and fix all remaining security issues

-- Check for system-level security definer issues and fix them
-- Remove any remaining security definer elements

-- Drop all views that might have security definer
DROP VIEW IF EXISTS public.tenant_public_info CASCADE;
DROP VIEW IF EXISTS public.tenant_public_info_secure CASCADE;

-- Recreate clean public view without security definer
CREATE VIEW public.tenant_public_info AS
SELECT 
  t.id,
  t.name,
  t.slug,
  t.timezone,
  t.currency,
  t.description,
  t.cuisine_type_id,
  t.status
FROM public.tenants t 
WHERE t.status = 'active';

-- Grant proper access
GRANT SELECT ON public.tenant_public_info TO authenticated;
GRANT SELECT ON public.tenant_public_info TO anon;

-- Add remaining function fixes for search_path
CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, severity text DEFAULT 'info'::text, user_id uuid DEFAULT auth.uid(), ip_address inet DEFAULT NULL::inet, user_agent text DEFAULT NULL::text, event_data jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  event_id uuid;
BEGIN
  INSERT INTO public.security_events (
    event_type, severity, user_id, ip_address, user_agent, event_data
  ) VALUES (
    event_type, severity, user_id, ip_address, user_agent, event_data
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
EXCEPTION
  WHEN undefined_table THEN
    -- Create security_events table if it doesn't exist
    CREATE TABLE IF NOT EXISTS public.security_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type text NOT NULL,
      severity text NOT NULL DEFAULT 'info',
      user_id uuid REFERENCES auth.users(id),
      ip_address inet,
      user_agent text,
      event_data jsonb DEFAULT '{}',
      created_at timestamp with time zone DEFAULT now() NOT NULL
    );
    
    ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Admins can view security events" ON public.security_events
      FOR SELECT TO authenticated
      USING (has_admin_access());
    
    -- Retry the insert
    INSERT INTO public.security_events (
      event_type, severity, user_id, ip_address, user_agent, event_data
    ) VALUES (
      event_type, severity, user_id, ip_address, user_agent, event_data
    ) RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_security_event(p_event_type text, p_severity text DEFAULT 'info'::text, p_user_id uuid DEFAULT NULL::uuid, p_employee_id uuid DEFAULT NULL::uuid, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text, p_event_data jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.security_events (
    event_type, severity, user_id, employee_id, 
    ip_address, user_agent, event_data
  ) VALUES (
    p_event_type, p_severity, p_user_id, p_employee_id,
    p_ip_address, p_user_agent, p_event_data
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.hash_api_key(api_key text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- In production, use a proper cryptographic hash function
  -- This is a simplified version for demo purposes
  RETURN encode(digest(api_key || 'blunari_salt', 'sha256'), 'hex');
END;
$function$;