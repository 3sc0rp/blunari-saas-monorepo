-- Create a test tenant directly using the provision_tenant function to verify it works
SELECT provision_tenant(
  'f8b33424-5f9d-4648-b952-7e3167c79ed1',
  'Test Restaurant',
  'test-restaurant',
  'America/New_York',
  'USD'
) as new_tenant_id;