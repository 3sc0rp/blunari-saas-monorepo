-- Check available provision_tenant functions
SELECT 
  routine_name,
  specific_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'provision_tenant'
AND routine_schema = 'public';

-- Create a simple test tenant directly
INSERT INTO tenants (name, slug, timezone, currency, status)
VALUES ('Test Restaurant', 'test-restaurant', 'America/New_York', 'USD', 'active')
RETURNING id, name, status;