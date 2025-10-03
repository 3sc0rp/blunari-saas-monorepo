-- Find all users in the system to identify yours

SELECT 
  id as user_id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;

-- Also check if there are any existing employees
SELECT 
  e.id,
  e.employee_id,
  e.role,
  e.status,
  au.email
FROM employees e
LEFT JOIN auth.users au ON e.user_id = au.id
ORDER BY e.created_at DESC;

