-- Create a view that joins employees with auth.users to get email
-- This avoids the need for admin API calls from frontend

CREATE OR REPLACE VIEW public.employees_with_profiles AS
SELECT 
  e.*,
  au.email,
  p.first_name,
  p.last_name,
  p.avatar_url,
  d.name as department_name
FROM public.employees e
LEFT JOIN auth.users au ON e.user_id = au.id
LEFT JOIN public.profiles p ON e.user_id = p.user_id
LEFT JOIN public.departments d ON e.department_id = d.id;

-- Enable RLS on the view (inherits from employees table)
-- Grant access to authenticated users with proper employee role
GRANT SELECT ON public.employees_with_profiles TO authenticated;

-- Add RLS policy
ALTER VIEW public.employees_with_profiles SET (security_invoker = true);

-- Comment
COMMENT ON VIEW public.employees_with_profiles IS 'Employees joined with auth.users email and profiles data for admin dashboard';

