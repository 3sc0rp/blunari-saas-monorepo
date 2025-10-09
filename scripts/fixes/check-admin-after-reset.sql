-- Check if the admin employee was created properly
SELECT 
  '🔍 ADMIN USER CHECK' as check_type,
  e.id as employee_id,
  e.user_id,
  e.email,
  e.first_name,
  e.last_name,
  e.role,
  e.status,
  u.email as auth_email,
  u.email_confirmed_at,
  u.last_sign_in_at,
  CASE 
    WHEN e.role IN ('SUPER_ADMIN', 'ADMIN') THEN '✅ Is Admin'
    ELSE '❌ Not Admin'
  END as role_check,
  CASE 
    WHEN e.status = 'ACTIVE' THEN '✅ Is Active'
    ELSE '❌ Not Active'
  END as status_check
FROM public.employees e
LEFT JOIN auth.users u ON u.id = e.user_id
WHERE u.email = 'admin@blunari.ai';

-- Check if there are ANY employees at all
SELECT 
  '📊 ALL EMPLOYEES COUNT' as check_type,
  COUNT(*) as total_employees,
  COUNT(*) FILTER (WHERE role = 'SUPER_ADMIN') as super_admins,
  COUNT(*) FILTER (WHERE role = 'ADMIN') as admins,
  COUNT(*) FILTER (WHERE status = 'ACTIVE') as active
FROM public.employees;
