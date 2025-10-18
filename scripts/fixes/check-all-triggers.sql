-- Find all triggers on tables we're using
SELECT 
  t.tgname AS trigger_name,
  c.relname AS table_name,
  p.proname AS function_name,
  pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname IN ('tenants', 'profiles', 'tenant_settings', 'tenant_features', 'restaurant_tables', 'business_hours')
  AND t.tgisinternal = false
ORDER BY c.relname, t.tgname;
