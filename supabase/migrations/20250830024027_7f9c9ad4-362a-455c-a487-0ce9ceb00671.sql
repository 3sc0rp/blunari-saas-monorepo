-- Create auto_provisioning record for the test tenant
INSERT INTO auto_provisioning (
  user_id, 
  restaurant_name, 
  restaurant_slug, 
  timezone, 
  currency, 
  status, 
  tenant_id, 
  completed_at
) VALUES (
  'f8b33424-5f9d-4648-b952-7e3167c79ed1',
  'Test Restaurant',
  'test-restaurant',
  'America/New_York',
  'USD',
  'completed',
  '2e318c7f-e6cc-4995-9639-cfb77fe8cfa1',
  now()
);

-- Verify tenant is now visible
SELECT * FROM tenants;