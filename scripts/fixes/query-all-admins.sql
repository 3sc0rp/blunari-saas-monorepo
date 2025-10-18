-- ============================================================================
-- QUERY ADMIN USERS - Run this in Supabase SQL Editor
-- ============================================================================
-- This query shows all SUPER_ADMIN and ADMIN users with their auth details
-- Bypasses RLS policies when run in SQL Editor
-- ============================================================================

SELECT 
  '🔍 ADMIN USERS REPORT' as report_title,
  current_timestamp as generated_at;

-- Main Query: Show all admin users with auth details
SELECT 
  e.id as employee_id,
  e.user_id,
  e.email as employee_email,
  e.first_name,
  e.last_name,
  e.role,
  e.status,
  e.created_at as employee_created,
  u.email as auth_email,
  u.email_confirmed_at,
  u.last_sign_in_at,
  u.created_at as auth_created,
  CASE 
    WHEN u.banned_until IS NOT NULL AND u.banned_until > now() THEN 'BANNED'
    WHEN u.deleted_at IS NOT NULL THEN 'DELETED'
    WHEN e.status = 'ACTIVE' THEN 'ACTIVE'
    ELSE 'INACTIVE'
  END as account_status,
  u.confirmation_sent_at,
  u.recovery_sent_at
FROM public.employees e
LEFT JOIN auth.users u ON u.id = e.user_id
WHERE e.role IN ('SUPER_ADMIN', 'ADMIN')
ORDER BY 
  CASE e.role 
    WHEN 'SUPER_ADMIN' THEN 1 
    WHEN 'ADMIN' THEN 2 
    ELSE 3 
  END,
  e.created_at ASC;

-- Summary Statistics
SELECT 
  '📊 SUMMARY' as section,
  COUNT(*) as total_admin_users,
  COUNT(*) FILTER (WHERE role = 'SUPER_ADMIN') as super_admins,
  COUNT(*) FILTER (WHERE role = 'ADMIN') as admins,
  COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_users,
  COUNT(*) FILTER (WHERE status = 'INACTIVE') as inactive_users
FROM public.employees
WHERE role IN ('SUPER_ADMIN', 'ADMIN');

-- Check if default admin exists
SELECT 
  '🔍 DEFAULT ADMIN CHECK' as section,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM auth.users 
      WHERE email = 'admin@admin.com'
    ) THEN '✅ admin@admin.com EXISTS in auth.users'
    ELSE '❌ admin@admin.com NOT FOUND in auth.users'
  END as auth_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.employees 
      WHERE email = 'admin@admin.com' 
      AND role = 'SUPER_ADMIN'
    ) THEN '✅ admin@admin.com EXISTS in employees as SUPER_ADMIN'
    ELSE '❌ admin@admin.com NOT FOUND in employees'
  END as employee_status;

-- Alternative admin check
SELECT 
  '🔍 ALTERNATIVE ADMIN CHECK' as section,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM auth.users 
      WHERE email = 'admin@blunari.ai'
    ) THEN '✅ admin@blunari.ai EXISTS in auth.users'
    ELSE '❌ admin@blunari.ai NOT FOUND in auth.users'
  END as auth_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.employees 
      WHERE email = 'admin@blunari.ai' 
      AND role IN ('SUPER_ADMIN', 'ADMIN')
    ) THEN '✅ admin@blunari.ai EXISTS in employees'
    ELSE '❌ admin@blunari.ai NOT FOUND in employees'
  END as employee_status;

-- Show ALL users in auth.users (first 10)
SELECT 
  '📋 ALL AUTH USERS (Sample)' as section,
  id,
  email,
  email_confirmed_at,
  last_sign_in_at,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Show ALL employees (first 10)
SELECT 
  '📋 ALL EMPLOYEES (Sample)' as section,
  id,
  email,
  first_name,
  last_name,
  role,
  status,
  created_at
FROM public.employees
ORDER BY created_at DESC
LIMIT 10;
