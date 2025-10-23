-- Create helper function for Edge Function to bypass RLS
CREATE OR REPLACE FUNCTION get_employee_by_user_id(p_user_id UUID)
RETURNS TABLE (
  role TEXT,
  status TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.role::TEXT,
    e.status::TEXT
  FROM employees e
  WHERE e.user_id = p_user_id
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_employee_by_user_id IS 'Helper function for Edge Functions to check admin privileges without RLS interference';

-- Test it
SELECT * FROM get_employee_by_user_id('7d68eada-5b32-419f-aef8-f15afac43ed0');
-- Should return: role='SUPER_ADMIN', status='ACTIVE'
