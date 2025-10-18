-- Query to get the actual provision_tenant function body from the database
-- Run this in Supabase SQL Editor to see what's currently deployed

SELECT 
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'provision_tenant'
AND n.nspname = 'public';
