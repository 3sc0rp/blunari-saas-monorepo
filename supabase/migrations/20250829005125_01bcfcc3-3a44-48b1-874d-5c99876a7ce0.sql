-- Comprehensive Security Hardening - Critical Fixes
-- Fix function search paths and implement secure data access controls

-- Fix all functions with mutable search paths
ALTER FUNCTION public.check_rate_limit(uuid, text, integer) SET search_path = 'public';
ALTER FUNCTION public.get_cached_availability(uuid, date, integer) SET search_path = 'public';
ALTER FUNCTION public.cache_availability(uuid, date, integer, jsonb, integer) SET search_path = 'public';
ALTER FUNCTION public.log_api_request(uuid, uuid, text, text, integer, integer, text) SET search_path = 'public';
ALTER FUNCTION public.create_notification(uuid, uuid, text, text, text, jsonb, text[]) SET search_path = 'public';

-- Create enhanced tenant access validation function
CREATE OR REPLACE FUNCTION public.strict_tenant_access_check(target_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if user owns the tenant through auto_provisioning
  RETURN EXISTS (
    SELECT 1
    FROM public.auto_provisioning ap
    WHERE ap.user_id = auth.uid()
      AND ap.tenant_id = target_tenant_id
      AND ap.status = 'completed'
  ) OR EXISTS (
    -- Check if user is an active employee with access to this tenant
    SELECT 1
    FROM public.employees e
    JOIN public.auto_provisioning ap ON ap.user_id = e.user_id
    WHERE e.user_id = auth.uid()
      AND e.status = 'ACTIVE'
      AND ap.tenant_id = target_tenant_id
      AND ap.status = 'completed'
  );
END;
$$;

-- Create function to check if user can access profile
CREATE OR REPLACE FUNCTION public.can_access_profile(profile_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Users can access their own profile or admins can access any profile
  RETURN profile_user_id = auth.uid() OR has_employee_role('ADMIN'::employee_role);
END;
$$;

-- Create function to check booking access
CREATE OR REPLACE FUNCTION public.can_access_booking(booking_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Must have valid tenant access
  RETURN strict_tenant_access_check(booking_tenant_id);
END;
$$;

-- Secure bookings table with strict tenant isolation
DROP POLICY IF EXISTS "Secure tenant bookings isolation" ON public.bookings;
CREATE POLICY "Secure tenant bookings isolation" 
ON public.bookings 
FOR ALL 
USING (can_access_booking(tenant_id))
WITH CHECK (can_access_booking(tenant_id));

-- Secure profiles table - users can only access their own profile
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view accessible profiles" 
ON public.profiles 
FOR SELECT 
USING (can_access_profile(id));

CREATE POLICY "Users can update their own profile only" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Secure tenants table with strict access control
DROP POLICY IF EXISTS "Users can view their tenant" ON public.tenants;
DROP POLICY IF EXISTS "Users can update their tenant" ON public.tenants;
DROP POLICY IF EXISTS "Secure tenant isolation" ON public.tenants;

CREATE POLICY "Strict tenant access control" 
ON public.tenants 
FOR ALL 
USING (strict_tenant_access_check(id))
WITH CHECK (strict_tenant_access_check(id));

-- Secure API keys - only owner and system admins
DROP POLICY IF EXISTS "Users can view their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can view their own API keys metadata" ON public.api_keys;
DROP POLICY IF EXISTS "Admins can view all API keys" ON public.api_keys;

CREATE POLICY "Secure API key access" 
ON public.api_keys 
FOR SELECT 
USING (auth.uid() = user_id OR has_employee_role('SUPER_ADMIN'::employee_role));

CREATE POLICY "Users can manage their own API keys" 
ON public.api_keys 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Secure support tickets and messages
CREATE POLICY "Support ticket privacy" 
ON public.support_tickets 
FOR ALL 
USING (
  requester_id = auth.uid() OR 
  assigned_to = auth.uid() OR 
  has_employee_role('SUPPORT'::employee_role)
);

CREATE POLICY "Support message privacy" 
ON public.support_ticket_messages 
FOR ALL 
USING (
  author_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.support_tickets st 
    WHERE st.id = ticket_id AND (
      st.requester_id = auth.uid() OR 
      st.assigned_to = auth.uid() OR 
      has_employee_role('SUPPORT'::employee_role)
    )
  )
);

-- Enhanced security logging for sensitive operations
CREATE OR REPLACE FUNCTION public.log_data_access_attempt(
  p_table_name text,
  p_operation text,
  p_resource_id text DEFAULT NULL,
  p_success boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM log_security_event(
    'data_access_attempt',
    CASE WHEN p_success THEN 'info' ELSE 'high' END,
    auth.uid(),
    get_current_employee(),
    NULL::inet,
    NULL,
    jsonb_build_object(
      'table', p_table_name,
      'operation', p_operation,
      'resource_id', p_resource_id,
      'success', p_success,
      'timestamp', now()
    )
  );
END;
$$;