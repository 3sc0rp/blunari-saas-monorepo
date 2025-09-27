-- Check current tenants in the database
SELECT COUNT(*) as tenant_count FROM tenants;

-- Check if current user has admin access
SELECT has_admin_access() as is_admin, get_user_admin_role() as admin_role;

-- Update RLS policy for tenants to allow admin users to view all tenants
DROP POLICY IF EXISTS "Admin users can view all tenants" ON tenants;
CREATE POLICY "Admin users can view all tenants" ON tenants
  FOR ALL TO authenticated
  USING (has_admin_access());

-- Also ensure admins can insert/update tenants
DROP POLICY IF EXISTS "System can manage tenants" ON tenants;
CREATE POLICY "System can manage tenants" ON tenants
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);