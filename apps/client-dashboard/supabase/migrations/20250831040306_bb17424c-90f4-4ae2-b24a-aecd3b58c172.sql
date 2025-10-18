-- Fix RLS policies for employees table to allow initial staff creation

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Employees can view other employees" ON public.employees;  
DROP POLICY IF EXISTS "Users can view their own employee record" ON public.employees;

-- Allow authenticated users to view employees if they have viewer role or higher
CREATE POLICY "Employees can view employees"
ON public.employees
FOR SELECT
TO authenticated
USING (
  has_employee_role('VIEWER'::employee_role) OR 
  user_id = auth.uid()
);

-- Allow authenticated users to insert employees if they have admin role OR if no employees exist yet (bootstrap case)
CREATE POLICY "Admins can create employees"
ON public.employees  
FOR INSERT
TO authenticated
WITH CHECK (
  has_employee_role('ADMIN'::employee_role) OR
  NOT EXISTS (SELECT 1 FROM public.employees WHERE status = 'ACTIVE')
);

-- Allow admins to update employees
CREATE POLICY "Admins can update employees"
ON public.employees
FOR UPDATE  
TO authenticated
USING (has_employee_role('ADMIN'::employee_role))
WITH CHECK (has_employee_role('ADMIN'::employee_role));

-- Allow admins to delete employees
CREATE POLICY "Admins can delete employees"
ON public.employees
FOR DELETE
TO authenticated  
USING (has_employee_role('ADMIN'::employee_role));