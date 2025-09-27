-- Critical Security Fixes: Database Functions and RLS Policies

-- Fix function search_path security issues
ALTER FUNCTION public.validate_role_change() SET search_path = 'public';
ALTER FUNCTION public.validate_role_assignment(employee_role, employee_role) SET search_path = 'public';
ALTER FUNCTION public.audit_sensitive_operations() SET search_path = 'public';
ALTER FUNCTION public.log_role_change() SET search_path = 'public';
ALTER FUNCTION public.has_employee_role(employee_role) SET search_path = 'public';

-- Create secure RLS policies for publicly exposed business data
-- pos_providers table - restrict access to authenticated users only
DROP POLICY IF EXISTS "Anyone can view POS providers" ON public.pos_providers;
CREATE POLICY "Authenticated users can view POS providers" 
ON public.pos_providers 
FOR SELECT 
TO authenticated
USING (true);

-- support_categories table - restrict to employees only
DROP POLICY IF EXISTS "Anyone can view support categories" ON public.support_categories;
CREATE POLICY "Employees can view support categories" 
ON public.support_categories 
FOR SELECT 
USING (has_employee_role('VIEWER'::employee_role));

-- dns_templates table - restrict to admin employees only
DROP POLICY IF EXISTS "Anyone can view DNS templates" ON public.dns_templates;
CREATE POLICY "Admins can view DNS templates" 
ON public.dns_templates 
FOR SELECT 
USING (has_employee_role('ADMIN'::employee_role));

-- Enhanced role change validation to prevent privilege escalation
CREATE OR REPLACE FUNCTION public.validate_employee_role_change()
RETURNS TRIGGER AS $$
DECLARE
  current_user_role employee_role;
  current_user_employee_id uuid;
BEGIN
  -- Get current user's role and employee ID
  SELECT role, id INTO current_user_role, current_user_employee_id
  FROM public.employees
  WHERE user_id = auth.uid()
    AND status = 'ACTIVE';
  
  -- If no employee record found, deny the change
  IF current_user_role IS NULL THEN
    RAISE EXCEPTION 'Access denied: No valid employee record found';
  END IF;
  
  -- Users cannot change their own role under any circumstances
  IF OLD.id = current_user_employee_id THEN
    RAISE EXCEPTION 'Access denied: Cannot modify your own role or privileges';
  END IF;
  
  -- Only allow role changes if user has proper authority
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- SUPER_ADMIN can assign any role
    IF current_user_role = 'SUPER_ADMIN' THEN
      -- Allow the change
      NULL;
    -- ADMIN can assign SUPPORT, OPS, VIEWER but not SUPER_ADMIN or ADMIN
    ELSIF current_user_role = 'ADMIN' THEN
      IF NEW.role NOT IN ('SUPPORT', 'OPS', 'VIEWER') THEN
        RAISE EXCEPTION 'Access denied: Cannot assign role % with ADMIN privileges', NEW.role;
      END IF;
    -- SUPPORT can assign OPS, VIEWER
    ELSIF current_user_role = 'SUPPORT' THEN
      IF NEW.role NOT IN ('OPS', 'VIEWER') THEN
        RAISE EXCEPTION 'Access denied: Cannot assign role % with SUPPORT privileges', NEW.role;
      END IF;
    ELSE
      RAISE EXCEPTION 'Access denied: Insufficient privileges to change user roles';
    END IF;
    
    -- Log the role change
    PERFORM log_security_event(
      'role_change_attempted',
      'high',
      NEW.user_id,
      NEW.id,
      NULL::inet,
      NULL,
      jsonb_build_object(
        'old_role', OLD.role,
        'new_role', NEW.role,
        'changed_by', auth.uid(),
        'changed_by_role', current_user_role
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Replace the existing trigger with the enhanced one
DROP TRIGGER IF EXISTS validate_role_change_trigger ON public.employees;
CREATE TRIGGER validate_role_change_trigger
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_employee_role_change();

-- Create comprehensive audit logging for sensitive operations
CREATE OR REPLACE FUNCTION public.audit_all_sensitive_operations()
RETURNS TRIGGER AS $$
BEGIN
  -- Role changes
  IF TG_TABLE_NAME = 'employees' AND OLD.role IS DISTINCT FROM NEW.role THEN
    PERFORM log_security_event(
      'role_change_completed',
      'high',
      NEW.user_id,
      NEW.id,
      NULL::inet,
      NULL,
      jsonb_build_object(
        'old_role', OLD.role,
        'new_role', NEW.role,
        'changed_by', auth.uid(),
        'table', TG_TABLE_NAME,
        'timestamp', now()
      )
    );
  END IF;
  
  -- Status changes
  IF TG_TABLE_NAME = 'employees' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_security_event(
      'employee_status_change',
      'medium',
      NEW.user_id,
      NEW.id,
      NULL::inet,
      NULL,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'changed_by', auth.uid(),
        'table', TG_TABLE_NAME
      )
    );
  END IF;
  
  -- Profile updates
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
        'table', TG_TABLE_NAME,
        'updated_fields', CASE 
          WHEN OLD.first_name IS DISTINCT FROM NEW.first_name OR 
               OLD.last_name IS DISTINCT FROM NEW.last_name OR
               OLD.email IS DISTINCT FROM NEW.email
          THEN 'personal_info'
          ELSE 'other'
        END
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Apply the audit trigger to sensitive tables
DROP TRIGGER IF EXISTS audit_sensitive_operations_trigger ON public.employees;
CREATE TRIGGER audit_sensitive_operations_trigger
  AFTER UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_all_sensitive_operations();

DROP TRIGGER IF EXISTS audit_profile_changes_trigger ON public.profiles;
CREATE TRIGGER audit_profile_changes_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_all_sensitive_operations();