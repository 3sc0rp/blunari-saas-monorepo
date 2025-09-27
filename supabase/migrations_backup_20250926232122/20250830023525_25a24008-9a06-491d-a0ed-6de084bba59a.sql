-- First, make the current user an admin
INSERT INTO admin_users (user_id, role, is_active) 
VALUES (auth.uid(), 'super_admin', true)
ON CONFLICT (user_id) DO UPDATE SET 
  role = 'super_admin',
  is_active = true;

-- Drop the problematic tenant policies and create simpler ones
DROP POLICY IF EXISTS "Admin users can view all tenants" ON tenants;
DROP POLICY IF EXISTS "System can manage tenants" ON tenants;
DROP POLICY IF EXISTS "Secure tenant business hours isolation" ON tenants;
DROP POLICY IF EXISTS "Secure tenant domains isolation" ON tenants;

-- Create new admin-friendly policies for tenants
CREATE POLICY "Admins can manage all tenants" ON tenants
  FOR ALL TO authenticated
  USING (has_admin_access())
  WITH CHECK (has_admin_access());

-- Create policy for regular users to see their own tenants
CREATE POLICY "Users can view their own tenants" ON tenants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auto_provisioning ap 
      WHERE ap.tenant_id = tenants.id 
      AND ap.user_id = auth.uid() 
      AND ap.status = 'completed'
    )
  );