-- Create employee roles enum
CREATE TYPE public.employee_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'OPS', 'VIEWER');

-- Create employee status enum
CREATE TYPE public.employee_status AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED');

-- Create departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  manager_id UUID,
  parent_department_id UUID REFERENCES public.departments(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employees table (extends profiles)
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL UNIQUE,
  role employee_role NOT NULL DEFAULT 'VIEWER',
  status employee_status NOT NULL DEFAULT 'PENDING',
  department_id UUID REFERENCES public.departments(id),
  manager_id UUID REFERENCES public.employees(id),
  hire_date DATE,
  last_login TIMESTAMP WITH TIME ZONE,
  last_activity TIMESTAMP WITH TIME ZONE,
  permissions JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employee invitations table
CREATE TABLE public.employee_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role employee_role NOT NULL,
  department_id UUID REFERENCES public.departments(id),
  invited_by UUID NOT NULL REFERENCES public.employees(id),
  invitation_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activity logs table
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create function to get current employee
CREATE OR REPLACE FUNCTION public.get_current_employee()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  employee_uuid UUID;
BEGIN
  SELECT id INTO employee_uuid
  FROM public.employees
  WHERE user_id = auth.uid()
    AND status = 'ACTIVE';
  
  RETURN employee_uuid;
END;
$$;

-- Create function to check employee role
CREATE OR REPLACE FUNCTION public.has_employee_role(required_role employee_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- RLS Policies for departments
CREATE POLICY "Employees can view departments"
ON public.departments
FOR SELECT
TO authenticated
USING (has_employee_role('VIEWER'));

CREATE POLICY "Admins can manage departments"
ON public.departments
FOR ALL
TO authenticated
USING (has_employee_role('ADMIN'));

-- RLS Policies for employees
CREATE POLICY "Employees can view other employees"
ON public.employees
FOR SELECT
TO authenticated
USING (has_employee_role('VIEWER'));

CREATE POLICY "Users can view their own employee record"
ON public.employees
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage employees"
ON public.employees
FOR ALL
TO authenticated
USING (has_employee_role('ADMIN'));

-- RLS Policies for employee invitations
CREATE POLICY "Admins can manage invitations"
ON public.employee_invitations
FOR ALL
TO authenticated
USING (has_employee_role('ADMIN'));

-- RLS Policies for activity logs
CREATE POLICY "Users can view their own activity"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (employee_id = get_current_employee());

CREATE POLICY "Admins can view all activity"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (has_employee_role('SUPPORT'));

CREATE POLICY "System can insert activity logs"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (employee_id = get_current_employee());

-- Create triggers for updated_at
CREATE TRIGGER update_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default departments
INSERT INTO public.departments (name, description) VALUES
('Engineering', 'Software development and technical operations'),
('Customer Success', 'Customer support and success management'),
('Operations', 'Business operations and system administration'),
('Leadership', 'Executive and management team');

-- Create function to log employee activity
CREATE OR REPLACE FUNCTION public.log_employee_activity(
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_employee_id UUID;
BEGIN
  current_employee_id := get_current_employee();
  
  IF current_employee_id IS NOT NULL THEN
    INSERT INTO public.activity_logs (
      employee_id, action, resource_type, resource_id, details
    ) VALUES (
      current_employee_id, p_action, p_resource_type, p_resource_id, p_details
    );
  END IF;
END;
$$;