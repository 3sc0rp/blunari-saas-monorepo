-- Check employees in database to find admin users
SELECT 
  e.id,
  e.user_id,
  e.email,
  e.role,
  e.status,
  u.email as auth_email,
  u.created_at as user_created_at
FROM employees e
LEFT JOIN auth.users u ON u.id = e.user_id
WHERE e.role IN ('SUPER_ADMIN', 'ADMIN')
ORDER BY e.created_at DESC
LIMIT 10;
