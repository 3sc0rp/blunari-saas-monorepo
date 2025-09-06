-- Make the specific user an admin (using the user ID from the network requests)
INSERT INTO admin_users (user_id, role, is_active) 
VALUES ('f8b33424-5f9d-4648-b952-7e3167c79ed1', 'super_admin', true)
ON CONFLICT (user_id) DO UPDATE SET 
  role = 'super_admin',
  is_active = true;

-- Now check if there are actually any tenants in the database
SELECT COUNT(*) as total_tenants FROM tenants;