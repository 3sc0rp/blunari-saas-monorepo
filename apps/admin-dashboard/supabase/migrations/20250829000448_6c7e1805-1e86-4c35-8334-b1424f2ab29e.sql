-- CRITICAL SECURITY FIXES

-- 1. Fix Profile Role Escalation - Remove ability for users to update their own roles
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create separate policies for profile updates vs role updates
CREATE POLICY "Users can update their own profile info" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND (role IS NULL OR role = (SELECT role FROM public.profiles WHERE user_id = auth.uid()))
);

-- Only super admins can update roles
CREATE POLICY "Super admins can update user roles" 
ON public.profiles 
FOR UPDATE 
USING (
  has_employee_role('SUPER_ADMIN'::employee_role)
  AND auth.uid() != user_id  -- Cannot change own role
)
WITH CHECK (has_employee_role('SUPER_ADMIN'::employee_role));

-- 2. Secure Employee Role Management
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;

-- Separate policies for viewing vs role changes
CREATE POLICY "Admins can view and update employee info" 
ON public.employees 
FOR UPDATE 
USING (has_employee_role('ADMIN'::employee_role))
WITH CHECK (
  has_employee_role('ADMIN'::employee_role)
  AND (
    -- Regular admins cannot promote to SUPER_ADMIN
    (role != 'SUPER_ADMIN' OR has_employee_role('SUPER_ADMIN'::employee_role))
    -- Cannot change own role 
    AND user_id != auth.uid()
  )
);

CREATE POLICY "Admins can create employees" 
ON public.employees 
FOR INSERT 
WITH CHECK (
  has_employee_role('ADMIN'::employee_role)
  AND (role != 'SUPER_ADMIN' OR has_employee_role('SUPER_ADMIN'::employee_role))
);

-- 3. Secure Public Data - Make business_metrics require authentication
DROP POLICY IF EXISTS "System can manage business metrics" ON public.business_metrics;
DROP POLICY IF EXISTS "Users can view own tenant business metrics" ON public.business_metrics;

CREATE POLICY "Authenticated users can view business metrics" 
ON public.business_metrics 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (user_has_tenant_access(tenant_id) OR has_employee_role('SUPPORT'::employee_role))
);

CREATE POLICY "System can insert business metrics" 
ON public.business_metrics 
FOR INSERT 
WITH CHECK (auth.uid() IS NULL OR has_employee_role('SUPPORT'::employee_role));

-- 4. Create audit logging function for role changes
CREATE OR REPLACE FUNCTION public.audit_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log role changes in activity_logs
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.activity_logs (
      employee_id, action, resource_type, resource_id, details
    ) VALUES (
      get_current_employee(),
      'role_changed',
      'employee',
      NEW.id::text,
      jsonb_build_object(
        'old_role', OLD.role,
        'new_role', NEW.role,
        'target_user_id', NEW.user_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for employee role changes
DROP TRIGGER IF EXISTS audit_employee_role_changes ON public.employees;
CREATE TRIGGER audit_employee_role_changes
  AFTER UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_role_change();

-- 5. Create secure role update function
CREATE OR REPLACE FUNCTION public.update_user_role(
  target_user_id UUID,
  new_role employee_role
)
RETURNS BOOLEAN AS $$
DECLARE
  current_employee_role employee_role;
  target_current_role employee_role;
BEGIN
  -- Get current user's role
  SELECT role INTO current_employee_role
  FROM public.employees
  WHERE user_id = auth.uid() AND status = 'ACTIVE';
  
  -- Get target user's current role
  SELECT role INTO target_current_role
  FROM public.employees
  WHERE user_id = target_user_id AND status = 'ACTIVE';
  
  -- Security checks
  IF current_employee_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: No active employee record';
  END IF;
  
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot change your own role';
  END IF;
  
  -- Only SUPER_ADMIN can promote to SUPER_ADMIN
  IF new_role = 'SUPER_ADMIN' AND current_employee_role != 'SUPER_ADMIN' THEN
    RAISE EXCEPTION 'Only super admins can promote to super admin role';
  END IF;
  
  -- Only ADMIN or SUPER_ADMIN can change roles
  IF current_employee_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions to change roles';
  END IF;
  
  -- Update the role
  UPDATE public.employees
  SET role = new_role, updated_at = now()
  WHERE user_id = target_user_id AND status = 'ACTIVE';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;