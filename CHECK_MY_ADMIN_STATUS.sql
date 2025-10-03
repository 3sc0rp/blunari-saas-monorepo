-- Run this to check if you have proper admin access

-- Check your current user
SELECT 
  'Your User ID:' as label,
  auth.uid() as value;

-- Check if you have an employee record
SELECT 
  'Your Employee Record:' as label,
  id, employee_id, role, status
FROM employees 
WHERE user_id = auth.uid();

-- Check if has_admin_access works
SELECT 
  'Do you have admin access?' as question,
  has_admin_access() as answer;

-- Check your employee role
SELECT 
  'Your Employee Role:' as question,
  get_current_employee_role() as answer;

-- If no employee record, you need to create one:
-- Run this if the employee query above returned nothing:
/*
INSERT INTO employees (user_id, employee_id, role, status, hire_date)
VALUES (
  auth.uid(),
  'EMP-ADMIN-' || SUBSTRING(auth.uid()::TEXT, 1, 8),
  'SUPER_ADMIN',
  'ACTIVE',
  CURRENT_DATE
);
*/

