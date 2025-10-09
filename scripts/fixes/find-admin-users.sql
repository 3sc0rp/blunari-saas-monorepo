-- Query to find admin users in the database
-- Run this in Supabase SQL Editor or via psql

SELECT 
  e.id,
  e.email,
  e.first_name,
  e.last_name,
  e.role,
  e.status,
  e.created_at,
  u.email as auth_email,
  u.created_at as auth_created_at,
  u.last_sign_in_at
FROM employees e
LEFT JOIN auth.users u ON u.id = e.user_id
WHERE e.role IN ('SUPER_ADMIN', 'ADMIN')
  AND e.status = 'ACTIVE'
ORDER BY e.created_at ASC
LIMIT 10;
