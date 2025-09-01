-- Check if user_roles table exists in your database
-- Run this first to diagnose the issue

SELECT 
  schemaname,
  tablename
FROM pg_tables 
WHERE tablename = 'user_roles' AND schemaname = 'public';

-- If the above returns no rows, then user_roles doesn't exist
-- If it returns a row, then the issue is with RLS policies

-- Also check what tables DO exist:
SELECT 
  schemaname,
  tablename
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
