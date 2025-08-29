-- CRITICAL SECURITY FIXES

-- 1. Fix database functions search_path security
ALTER FUNCTION public.validate_api_key_permissions(text, text) SET search_path TO 'public';
ALTER FUNCTION public.log_security_event(text, text, uuid, uuid, inet, text, jsonb) SET search_path TO 'public';
ALTER FUNCTION public.handle_new_user() SET search_path TO 'public';
ALTER FUNCTION public.provision_tenant(uuid, text, text, text, text, text, text, text, text, jsonb, uuid) SET search_path TO 'public';

-- 2. Create function to validate role changes (prevent role escalation)
CREATE OR REPLACE FUNCTION public.validate_role_change()
RETURNS TRIGGER AS $$
DECLARE
  current_user_role employee_role;
  target_user_role employee_role;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role
  FROM public.employees
  WHERE user_id = auth.uid()
    AND status = 'ACTIVE';
  
  -- If no employee record found, deny the change
  IF current_user_role IS NULL THEN
    RAISE EXCEPTION 'Access denied: No valid employee record found';
  END IF;
  
  -- If trying to change someone else's role, check if authorized
  IF OLD.user_id != auth.uid() THEN
    -- Only SUPER_ADMIN and ADMIN can change other users' roles
    IF current_user_role NOT IN ('SUPER_ADMIN', 'ADMIN') THEN
      RAISE EXCEPTION 'Access denied: Insufficient privileges to change user roles';
    END IF;
    
    -- Validate the role assignment is within allowed scope
    IF NOT validate_role_assignment(current_user_role, NEW.role) THEN
      RAISE EXCEPTION 'Access denied: Cannot assign role % with current privileges', NEW.role;
    END IF;
  ELSE
    -- Users cannot change their own role
    RAISE EXCEPTION 'Access denied: Cannot change your own role';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 3. Create trigger to prevent unauthorized role changes on employees table
CREATE TRIGGER prevent_unauthorized_role_changes
  BEFORE UPDATE OF role ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_role_change();

-- 4. Create function to validate profile updates (prevent unauthorized access)
CREATE OR REPLACE FUNCTION public.validate_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Users can only update their own profile
  IF OLD.id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: Cannot update other users profiles';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 5. Create trigger to protect profile updates
CREATE TRIGGER protect_profile_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_update();

-- 6. Create function for secure tenant access validation
CREATE OR REPLACE FUNCTION public.validate_tenant_access(tenant_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- 7. Update RLS policies to use secure tenant validation
DROP POLICY IF EXISTS "Tenant bookings isolation" ON public.bookings;
CREATE POLICY "Secure tenant bookings isolation" 
ON public.bookings 
FOR ALL
USING (validate_tenant_access(tenant_id))
WITH CHECK (validate_tenant_access(tenant_id));

DROP POLICY IF EXISTS "Tenant domains isolation" ON public.domains;
CREATE POLICY "Secure tenant domains isolation" 
ON public.domains 
FOR ALL
USING (validate_tenant_access(tenant_id))
WITH CHECK (validate_tenant_access(tenant_id));

DROP POLICY IF EXISTS "Tenant business hours isolation" ON public.business_hours;
CREATE POLICY "Secure tenant business hours isolation" 
ON public.business_hours 
FOR ALL
USING (validate_tenant_access(tenant_id))
WITH CHECK (validate_tenant_access(tenant_id));

-- 8. Secure business metrics access (remove overly permissive employee access)
DROP POLICY IF EXISTS "Employees can view business metrics" ON public.business_metrics;
CREATE POLICY "Secure business metrics access" 
ON public.business_metrics 
FOR SELECT
USING (
  validate_tenant_access(tenant_id) OR 
  has_employee_role('ADMIN'::employee_role)
);

-- 9. Create audit function for security events
CREATE OR REPLACE FUNCTION public.audit_sensitive_operations()
RETURNS TRIGGER AS $$
BEGIN
  -- Log all role changes
  IF TG_TABLE_NAME = 'employees' AND OLD.role IS DISTINCT FROM NEW.role THEN
    PERFORM log_security_event(
      'role_change',
      'high',
      NEW.user_id,
      NEW.id,
      NULL::inet,
      NULL,
      jsonb_build_object(
        'old_role', OLD.role,
        'new_role', NEW.role,
        'changed_by', auth.uid(),
        'table', TG_TABLE_NAME
      )
    );
  END IF;
  
  -- Log profile updates
  IF TG_TABLE_NAME = 'profiles' THEN
    PERFORM log_security_event(
      'profile_update',
      'info',
      NEW.id,
      NULL,
      NULL::inet,
      NULL,
      jsonb_build_object(
        'updated_by', auth.uid(),
        'table', TG_TABLE_NAME
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 10. Add audit triggers
CREATE TRIGGER audit_employee_changes
  AFTER UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_operations();

CREATE TRIGGER audit_profile_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_operations();