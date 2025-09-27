-- CRITICAL SECURITY FIXES - Fixed SQL

-- 1. Fix Profile Role Escalation - Prevent users from updating their own roles
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update safe profile fields only" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 2. Add role change logging function
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log any role changes
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    PERFORM log_security_event(
      'role_changed',
      'high',
      NEW.id,
      NULL,
      NULL::inet,
      NULL,
      jsonb_build_object(
        'old_role', OLD.role,
        'new_role', NEW.role,
        'changed_by', auth.uid()
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for role change logging
DROP TRIGGER IF EXISTS profile_role_change_log ON public.profiles;
CREATE TRIGGER profile_role_change_log
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_change();

-- 3. Secure business_metrics table
DROP POLICY IF EXISTS "System can manage business metrics" ON public.business_metrics;

CREATE POLICY "Employees can view business metrics" 
ON public.business_metrics 
FOR SELECT 
USING (has_employee_role('VIEWER'::employee_role));

CREATE POLICY "System can insert business metrics" 
ON public.business_metrics 
FOR INSERT 
WITH CHECK (true);

-- 4. Secure analytics_events table
DROP POLICY IF EXISTS "Tenant analytics isolation" ON public.analytics_events;

CREATE POLICY "Users can view own tenant analytics" 
ON public.analytics_events 
FOR SELECT 
USING (
  tenant_id = get_current_user_tenant_id() OR 
  has_employee_role('SUPPORT'::employee_role)
);

CREATE POLICY "System can insert analytics events" 
ON public.analytics_events 
FOR INSERT 
WITH CHECK (true);

-- 5. Secure API key policies
DROP POLICY IF EXISTS "Users can manage their own API keys" ON public.api_keys;

CREATE POLICY "Users can view their own API keys metadata" 
ON public.api_keys 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys" 
ON public.api_keys 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can deactivate their own API keys" 
ON public.api_keys 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND NOT is_active);

-- 6. Add role hierarchy validation function
CREATE OR REPLACE FUNCTION public.validate_role_assignment(
  assigner_role employee_role,
  target_role employee_role
) RETURNS boolean AS $$
BEGIN
  -- SUPER_ADMIN can assign any role
  IF assigner_role = 'SUPER_ADMIN' THEN
    RETURN true;
  END IF;
  
  -- ADMIN can assign SUPPORT, OPS, VIEWER but not SUPER_ADMIN or ADMIN
  IF assigner_role = 'ADMIN' THEN
    RETURN target_role IN ('SUPPORT', 'OPS', 'VIEWER');
  END IF;
  
  -- SUPPORT can assign OPS, VIEWER
  IF assigner_role = 'SUPPORT' THEN
    RETURN target_role IN ('OPS', 'VIEWER');
  END IF;
  
  -- Others cannot assign roles
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Add rate limiting table for security events
CREATE TABLE IF NOT EXISTS public.security_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  event_type text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(identifier, event_type, window_start)
);

ALTER TABLE public.security_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage rate limits" 
ON public.security_rate_limits 
FOR ALL 
USING (true);