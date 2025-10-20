-- Week 19-20: Role-Based Access Control (RBAC) Infrastructure
-- Comprehensive permission system with role inheritance and resource-level control
-- Author: AI Agent
-- Date: October 20, 2025

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE permission_action AS ENUM (
  'create',
  'read',
  'update',
  'delete',
  'approve',
  'export',
  'import',
  'manage',
  'execute'
);

CREATE TYPE permission_scope AS ENUM (
  'global',      -- Across all resources
  'tenant',      -- Tenant-wide
  'department',  -- Department-level
  'team',        -- Team-level
  'own'          -- Own resources only
);

CREATE TYPE role_type AS ENUM (
  'system',      -- Built-in system roles
  'custom'       -- Tenant-defined custom roles
);

-- =====================================================
-- TABLE: permission_groups
-- Purpose: Logical grouping of related permissions
-- =====================================================

CREATE TABLE IF NOT EXISTS permission_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_permission_groups_active ON permission_groups(is_active, display_order);

-- =====================================================
-- TABLE: permissions
-- Purpose: Define granular permissions for resources
-- =====================================================

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_group_id UUID REFERENCES permission_groups(id) ON DELETE CASCADE,
  
  -- Permission identification
  name TEXT NOT NULL UNIQUE, -- e.g., "bookings.create", "reports.export"
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- Permission details
  resource TEXT NOT NULL, -- Resource type: bookings, users, reports, etc.
  action permission_action NOT NULL,
  scope permission_scope DEFAULT 'tenant',
  
  -- Conditions (JSONB for flexible rules)
  conditions JSONB DEFAULT '{}',
  -- Examples:
  -- {"status": ["pending", "confirmed"]} - Only for certain statuses
  -- {"amount_max": 1000} - Only if amount <= 1000
  -- {"time_restriction": "business_hours"} - Only during business hours
  
  -- Metadata
  is_system_permission BOOLEAN DEFAULT false,
  is_dangerous BOOLEAN DEFAULT false, -- Flag dangerous permissions (delete, export sensitive data)
  requires_approval BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(resource, action, scope)
);

-- Indexes
CREATE INDEX idx_permissions_group ON permissions(permission_group_id);
CREATE INDEX idx_permissions_resource ON permissions(resource);
CREATE INDEX idx_permissions_action ON permissions(action);
CREATE INDEX idx_permissions_scope ON permissions(scope);
CREATE INDEX idx_permissions_system ON permissions(is_system_permission, is_active);

-- =====================================================
-- TABLE: roles
-- Purpose: Define roles that group permissions
-- =====================================================

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL for system roles
  
  -- Role identification
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- Role hierarchy
  role_type role_type DEFAULT 'custom',
  parent_role_id UUID REFERENCES roles(id) ON DELETE SET NULL, -- For role inheritance
  hierarchy_level INTEGER DEFAULT 0, -- 0 = top level, higher = lower in hierarchy
  
  -- Role properties
  is_default BOOLEAN DEFAULT false, -- Assigned to new users by default
  is_active BOOLEAN DEFAULT true,
  max_users INTEGER, -- Optional limit on users with this role
  
  -- Metadata
  color TEXT, -- For UI visualization
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT unique_role_name_per_tenant UNIQUE(tenant_id, name)
);

-- Indexes
CREATE INDEX idx_roles_tenant ON roles(tenant_id);
CREATE INDEX idx_roles_type ON roles(role_type, is_active);
CREATE INDEX idx_roles_parent ON roles(parent_role_id);
CREATE INDEX idx_roles_default ON roles(tenant_id, is_default) WHERE is_default = true;

-- RLS Policies
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System roles readable by all authenticated users"
  ON roles
  FOR SELECT
  USING (tenant_id IS NULL AND auth.uid() IS NOT NULL);

CREATE POLICY "Tenant isolation for roles"
  ON roles
  FOR ALL
  USING (
    tenant_id IS NULL OR -- System roles
    tenant_id IN (
      SELECT tenant_id FROM auto_provisioning 
      WHERE user_id = auth.uid() AND status = 'completed'
    )
  );

-- =====================================================
-- TABLE: role_permissions
-- Purpose: Map permissions to roles
-- =====================================================

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  
  -- Permission customization at role level
  is_granted BOOLEAN DEFAULT true, -- Allow explicit deny
  conditions JSONB DEFAULT '{}', -- Additional conditions beyond permission's base conditions
  
  -- Metadata
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  
  UNIQUE(role_id, permission_id)
);

-- Indexes
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX idx_role_permissions_granted ON role_permissions(role_id, is_granted);

-- RLS Policies
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for role_permissions"
  ON role_permissions
  FOR SELECT
  USING (
    role_id IN (
      SELECT id FROM roles WHERE 
        tenant_id IS NULL OR
        tenant_id IN (
          SELECT tenant_id FROM auto_provisioning 
          WHERE user_id = auth.uid() AND status = 'completed'
        )
    )
  );

-- =====================================================
-- TABLE: user_roles
-- Purpose: Assign roles to users
-- =====================================================

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  
  -- Scope limitations (optional)
  scope_type TEXT, -- 'department', 'team', 'location', etc.
  scope_id UUID, -- Reference to department_id, team_id, etc.
  
  -- Time-based restrictions (optional)
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ, -- NULL = no expiration
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_role_scope UNIQUE(tenant_id, user_id, role_id, scope_type, scope_id)
);

-- Indexes
CREATE INDEX idx_user_roles_tenant ON user_roles(tenant_id);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
CREATE INDEX idx_user_roles_active ON user_roles(tenant_id, user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_user_roles_scope ON user_roles(scope_type, scope_id);
CREATE INDEX idx_user_roles_validity ON user_roles(valid_from, valid_until);

-- RLS Policies
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own role assignments"
  ON user_roles
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    tenant_id IN (
      SELECT tenant_id FROM auto_provisioning 
      WHERE user_id = auth.uid() AND status = 'completed'
    )
  );

CREATE POLICY "Tenant admins can manage user roles"
  ON user_roles
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM auto_provisioning 
      WHERE user_id = auth.uid() AND status = 'completed'
    )
  );

-- =====================================================
-- TABLE: permission_audit_log
-- Purpose: Track permission checks and access attempts
-- =====================================================

CREATE TABLE IF NOT EXISTS permission_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Permission check details
  permission_name TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  action permission_action NOT NULL,
  scope permission_scope,
  
  -- Result
  is_granted BOOLEAN NOT NULL,
  denial_reason TEXT, -- Why permission was denied
  
  -- Context
  request_metadata JSONB DEFAULT '{}', -- IP, user agent, etc.
  conditions_evaluated JSONB DEFAULT '{}',
  
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_permission_audit_tenant ON permission_audit_log(tenant_id);
CREATE INDEX idx_permission_audit_user ON permission_audit_log(user_id);
CREATE INDEX idx_permission_audit_permission ON permission_audit_log(permission_name);
CREATE INDEX idx_permission_audit_granted ON permission_audit_log(is_granted, checked_at);
CREATE INDEX idx_permission_audit_time ON permission_audit_log(checked_at DESC);

-- Partitioning by month for better performance (commented out - implement if needed)
-- CREATE INDEX idx_permission_audit_time_month ON permission_audit_log(date_trunc('month', checked_at));

-- RLS Policies
ALTER TABLE permission_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for permission_audit_log"
  ON permission_audit_log
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM auto_provisioning 
      WHERE user_id = auth.uid() AND status = 'completed'
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Get all permissions for a user (with role inheritance)
CREATE OR REPLACE FUNCTION get_user_permissions(
  p_user_id UUID,
  p_tenant_id UUID
)
RETURNS TABLE (
  permission_name TEXT,
  resource TEXT,
  action permission_action,
  scope permission_scope,
  conditions JSONB,
  role_name TEXT,
  is_granted BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE role_hierarchy AS (
    -- Get user's direct roles
    SELECT 
      r.id as role_id,
      r.name as role_name,
      r.parent_role_id,
      r.hierarchy_level,
      ur.scope_type,
      ur.scope_id,
      ur.is_active,
      ur.valid_from,
      ur.valid_until
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.tenant_id = p_tenant_id
      AND ur.is_active = true
      AND (ur.valid_from IS NULL OR ur.valid_from <= NOW())
      AND (ur.valid_until IS NULL OR ur.valid_until > NOW())
    
    UNION ALL
    
    -- Get inherited roles
    SELECT 
      r.id,
      r.name,
      r.parent_role_id,
      r.hierarchy_level,
      rh.scope_type,
      rh.scope_id,
      rh.is_active,
      rh.valid_from,
      rh.valid_until
    FROM roles r
    JOIN role_hierarchy rh ON r.id = rh.parent_role_id
    WHERE r.is_active = true
  )
  SELECT DISTINCT
    p.name as permission_name,
    p.resource,
    p.action,
    p.scope,
    COALESCE(rp.conditions, p.conditions) as conditions,
    rh.role_name,
    rp.is_granted
  FROM role_hierarchy rh
  JOIN role_permissions rp ON rp.role_id = rh.role_id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE p.is_active = true
  ORDER BY rh.hierarchy_level ASC, p.resource, p.action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user has specific permission
CREATE OR REPLACE FUNCTION has_permission(
  p_user_id UUID,
  p_tenant_id UUID,
  p_permission_name TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_context JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN := false;
  v_permission_record RECORD;
BEGIN
  -- Get user's permissions
  FOR v_permission_record IN 
    SELECT * FROM get_user_permissions(p_user_id, p_tenant_id)
    WHERE permission_name = p_permission_name
      AND is_granted = true
  LOOP
    -- Check scope
    CASE v_permission_record.scope
      WHEN 'global' THEN
        v_has_permission := true;
      WHEN 'tenant' THEN
        v_has_permission := true;
      WHEN 'own' THEN
        -- Check if resource belongs to user
        IF p_context ? 'owner_id' THEN
          v_has_permission := (p_context->>'owner_id')::UUID = p_user_id;
        END IF;
      ELSE
        v_has_permission := false;
    END CASE;
    
    -- If permission granted at this level, exit early
    EXIT WHEN v_has_permission = true;
  END LOOP;
  
  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check resource-level permission
CREATE OR REPLACE FUNCTION check_resource_permission(
  p_user_id UUID,
  p_tenant_id UUID,
  p_resource_type TEXT,
  p_action permission_action,
  p_resource_id UUID DEFAULT NULL,
  p_context JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_permission_name TEXT;
  v_has_permission BOOLEAN;
BEGIN
  -- Build permission name
  v_permission_name := p_resource_type || '.' || p_action::TEXT;
  
  -- Check permission
  v_has_permission := has_permission(
    p_user_id,
    p_tenant_id,
    v_permission_name,
    p_resource_id,
    p_context
  );
  
  -- Log audit entry
  INSERT INTO permission_audit_log (
    tenant_id,
    user_id,
    permission_name,
    resource_type,
    resource_id,
    action,
    scope,
    is_granted,
    denial_reason,
    request_metadata,
    conditions_evaluated
  ) VALUES (
    p_tenant_id,
    p_user_id,
    v_permission_name,
    p_resource_type,
    p_resource_id,
    p_action,
    'tenant', -- Default scope for now
    v_has_permission,
    CASE WHEN NOT v_has_permission THEN 'Permission denied' ELSE NULL END,
    p_context,
    '{}'::JSONB
  );
  
  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user's roles with details
CREATE OR REPLACE FUNCTION get_user_roles(
  p_user_id UUID,
  p_tenant_id UUID
)
RETURNS TABLE (
  role_id UUID,
  role_name TEXT,
  role_display_name TEXT,
  role_type role_type,
  hierarchy_level INTEGER,
  scope_type TEXT,
  scope_id UUID,
  is_active BOOLEAN,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.display_name,
    r.role_type,
    r.hierarchy_level,
    ur.scope_type,
    ur.scope_id,
    ur.is_active,
    ur.valid_from,
    ur.valid_until
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id
    AND ur.tenant_id = p_tenant_id
    AND ur.is_active = true
    AND (ur.valid_from IS NULL OR ur.valid_from <= NOW())
    AND (ur.valid_until IS NULL OR ur.valid_until > NOW())
  ORDER BY r.hierarchy_level ASC, r.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get role with all inherited permissions
CREATE OR REPLACE FUNCTION get_role_all_permissions(
  p_role_id UUID
)
RETURNS TABLE (
  permission_id UUID,
  permission_name TEXT,
  resource TEXT,
  action permission_action,
  scope permission_scope,
  is_inherited BOOLEAN,
  inherited_from_role TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE role_hierarchy AS (
    -- Start with the specified role
    SELECT 
      id as role_id,
      name as role_name,
      parent_role_id,
      0 as depth
    FROM roles
    WHERE id = p_role_id
    
    UNION ALL
    
    -- Get parent roles
    SELECT 
      r.id,
      r.name,
      r.parent_role_id,
      rh.depth + 1
    FROM roles r
    JOIN role_hierarchy rh ON r.id = rh.parent_role_id
  )
  SELECT DISTINCT
    p.id as permission_id,
    p.name as permission_name,
    p.resource,
    p.action,
    p.scope,
    (rh.depth > 0) as is_inherited,
    CASE WHEN rh.depth > 0 THEN rh.role_name ELSE NULL END as inherited_from_role
  FROM role_hierarchy rh
  JOIN role_permissions rp ON rp.role_id = rh.role_id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE rp.is_granted = true
    AND p.is_active = true
  ORDER BY is_inherited ASC, p.resource, p.action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if role assignment would create circular dependency
CREATE OR REPLACE FUNCTION check_role_hierarchy_circular(
  p_role_id UUID,
  p_parent_role_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_circular BOOLEAN := false;
BEGIN
  -- Check if parent_role_id is in the hierarchy of role_id
  WITH RECURSIVE role_hierarchy AS (
    SELECT 
      id,
      parent_role_id
    FROM roles
    WHERE id = p_role_id
    
    UNION ALL
    
    SELECT 
      r.id,
      r.parent_role_id
    FROM roles r
    JOIN role_hierarchy rh ON r.parent_role_id = rh.id
  )
  SELECT EXISTS (
    SELECT 1 FROM role_hierarchy WHERE id = p_parent_role_id
  ) INTO v_is_circular;
  
  RETURN v_is_circular;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get permission usage statistics
CREATE OR REPLACE FUNCTION get_permission_stats(
  p_tenant_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  permission_name TEXT,
  total_checks BIGINT,
  granted_count BIGINT,
  denied_count BIGINT,
  grant_rate NUMERIC,
  unique_users BIGINT
) AS $$
DECLARE
  v_start_date TIMESTAMPTZ := NOW() - (p_days || ' days')::INTERVAL;
BEGIN
  RETURN QUERY
  SELECT 
    pal.permission_name,
    COUNT(*) as total_checks,
    COUNT(*) FILTER (WHERE pal.is_granted = true) as granted_count,
    COUNT(*) FILTER (WHERE pal.is_granted = false) as denied_count,
    ROUND((COUNT(*) FILTER (WHERE pal.is_granted = true)::NUMERIC / COUNT(*)) * 100, 2) as grant_rate,
    COUNT(DISTINCT pal.user_id) as unique_users
  FROM permission_audit_log pal
  WHERE pal.tenant_id = p_tenant_id
    AND pal.checked_at >= v_start_date
  GROUP BY pal.permission_name
  ORDER BY total_checks DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Update updated_at on record change
CREATE TRIGGER update_permission_groups_updated_at
  BEFORE UPDATE ON permission_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permissions_updated_at
  BEFORE UPDATE ON permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Prevent circular role hierarchy
CREATE OR REPLACE FUNCTION prevent_circular_role_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_role_id IS NOT NULL THEN
    IF check_role_hierarchy_circular(NEW.id, NEW.parent_role_id) THEN
      RAISE EXCEPTION 'Circular role hierarchy detected';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_circular_hierarchy_before_update
  BEFORE INSERT OR UPDATE OF parent_role_id ON roles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_circular_role_hierarchy();

-- =====================================================
-- SEED DATA: System Roles & Permissions
-- =====================================================

-- Insert permission groups
INSERT INTO permission_groups (name, description, icon, display_order) VALUES
  ('Bookings', 'Booking and reservation management', 'Calendar', 1),
  ('Customers', 'Customer data and communication', 'Users', 2),
  ('Reports', 'Analytics and reporting', 'BarChart', 3),
  ('Settings', 'System configuration', 'Settings', 4),
  ('Users', 'User and role management', 'UserCog', 5),
  ('Finance', 'Financial operations', 'DollarSign', 6),
  ('Marketing', 'Marketing and campaigns', 'Megaphone', 7),
  ('Inventory', 'Inventory management', 'Package', 8);

-- Get group IDs for reference
DO $$
DECLARE
  v_bookings_group_id UUID;
  v_customers_group_id UUID;
  v_reports_group_id UUID;
  v_settings_group_id UUID;
  v_users_group_id UUID;
  v_finance_group_id UUID;
BEGIN
  SELECT id INTO v_bookings_group_id FROM permission_groups WHERE name = 'Bookings';
  SELECT id INTO v_customers_group_id FROM permission_groups WHERE name = 'Customers';
  SELECT id INTO v_reports_group_id FROM permission_groups WHERE name = 'Reports';
  SELECT id INTO v_settings_group_id FROM permission_groups WHERE name = 'Settings';
  SELECT id INTO v_users_group_id FROM permission_groups WHERE name = 'Users';
  SELECT id INTO v_finance_group_id FROM permission_groups WHERE name = 'Finance';

  -- Insert system permissions
  INSERT INTO permissions (permission_group_id, name, display_name, description, resource, action, scope, is_system_permission, is_dangerous) VALUES
    -- Bookings
    (v_bookings_group_id, 'bookings.create', 'Create Bookings', 'Create new bookings', 'bookings', 'create', 'tenant', true, false),
    (v_bookings_group_id, 'bookings.read', 'View Bookings', 'View booking details', 'bookings', 'read', 'tenant', true, false),
    (v_bookings_group_id, 'bookings.read.own', 'View Own Bookings', 'View own bookings only', 'bookings', 'read', 'own', true, false),
    (v_bookings_group_id, 'bookings.update', 'Update Bookings', 'Modify existing bookings', 'bookings', 'update', 'tenant', true, false),
    (v_bookings_group_id, 'bookings.delete', 'Delete Bookings', 'Delete bookings', 'bookings', 'delete', 'tenant', true, true),
    (v_bookings_group_id, 'bookings.approve', 'Approve Bookings', 'Approve pending bookings', 'bookings', 'approve', 'tenant', true, false),
    
    -- Customers
    (v_customers_group_id, 'customers.create', 'Create Customers', 'Add new customers', 'customers', 'create', 'tenant', true, false),
    (v_customers_group_id, 'customers.read', 'View Customers', 'View customer profiles', 'customers', 'read', 'tenant', true, false),
    (v_customers_group_id, 'customers.update', 'Update Customers', 'Modify customer information', 'customers', 'update', 'tenant', true, false),
    (v_customers_group_id, 'customers.delete', 'Delete Customers', 'Delete customer records', 'customers', 'delete', 'tenant', true, true),
    (v_customers_group_id, 'customers.export', 'Export Customers', 'Export customer data', 'customers', 'export', 'tenant', true, true),
    
    -- Reports
    (v_reports_group_id, 'reports.read', 'View Reports', 'Access reports and analytics', 'reports', 'read', 'tenant', true, false),
    (v_reports_group_id, 'reports.export', 'Export Reports', 'Export report data', 'reports', 'export', 'tenant', true, false),
    (v_reports_group_id, 'reports.manage', 'Manage Reports', 'Create and modify reports', 'reports', 'manage', 'tenant', true, false),
    
    -- Settings
    (v_settings_group_id, 'settings.read', 'View Settings', 'View system settings', 'settings', 'read', 'tenant', true, false),
    (v_settings_group_id, 'settings.update', 'Update Settings', 'Modify system settings', 'settings', 'update', 'tenant', true, false),
    
    -- Users & Roles
    (v_users_group_id, 'users.create', 'Create Users', 'Add new users', 'users', 'create', 'tenant', true, false),
    (v_users_group_id, 'users.read', 'View Users', 'View user profiles', 'users', 'read', 'tenant', true, false),
    (v_users_group_id, 'users.update', 'Update Users', 'Modify user information', 'users', 'update', 'tenant', true, false),
    (v_users_group_id, 'users.delete', 'Delete Users', 'Delete user accounts', 'users', 'delete', 'tenant', true, true),
    (v_users_group_id, 'roles.manage', 'Manage Roles', 'Create and assign roles', 'roles', 'manage', 'tenant', true, false),
    (v_users_group_id, 'permissions.manage', 'Manage Permissions', 'Configure permissions', 'permissions', 'manage', 'tenant', true, true),
    
    -- Finance
    (v_finance_group_id, 'payments.read', 'View Payments', 'View payment records', 'payments', 'read', 'tenant', true, false),
    (v_finance_group_id, 'payments.create', 'Process Payments', 'Process payment transactions', 'payments', 'create', 'tenant', true, false),
    (v_finance_group_id, 'payments.export', 'Export Payments', 'Export financial data', 'payments', 'export', 'tenant', true, true),
    (v_finance_group_id, 'invoices.manage', 'Manage Invoices', 'Create and manage invoices', 'invoices', 'manage', 'tenant', true, false);
END $$;

-- Insert system roles
INSERT INTO roles (tenant_id, name, display_name, description, role_type, hierarchy_level, is_default, color, icon) VALUES
  (NULL, 'super_admin', 'Super Administrator', 'Full system access with all permissions', 'system', 0, false, '#FF0000', 'Shield'),
  (NULL, 'admin', 'Administrator', 'Full tenant administration access', 'system', 1, false, '#FF6B6B', 'UserCog'),
  (NULL, 'manager', 'Manager', 'Manage operations and team members', 'system', 2, false, '#4ECDC4', 'Briefcase'),
  (NULL, 'staff', 'Staff Member', 'Basic operational access', 'system', 3, true, '#95E1D3', 'User'),
  (NULL, 'viewer', 'Viewer', 'Read-only access to reports', 'system', 4, false, '#C7CEEA', 'Eye');

-- Assign permissions to system roles
DO $$
DECLARE
  v_super_admin_role_id UUID;
  v_admin_role_id UUID;
  v_manager_role_id UUID;
  v_staff_role_id UUID;
  v_viewer_role_id UUID;
  v_permission RECORD;
BEGIN
  SELECT id INTO v_super_admin_role_id FROM roles WHERE name = 'super_admin';
  SELECT id INTO v_admin_role_id FROM roles WHERE name = 'admin';
  SELECT id INTO v_manager_role_id FROM roles WHERE name = 'manager';
  SELECT id INTO v_staff_role_id FROM roles WHERE name = 'staff';
  SELECT id INTO v_viewer_role_id FROM roles WHERE name = 'viewer';

  -- Super Admin: All permissions
  FOR v_permission IN SELECT id FROM permissions WHERE is_active = true
  LOOP
    INSERT INTO role_permissions (role_id, permission_id, is_granted)
    VALUES (v_super_admin_role_id, v_permission.id, true);
  END LOOP;

  -- Admin: All except super dangerous permissions
  FOR v_permission IN 
    SELECT id FROM permissions 
    WHERE is_active = true 
      AND is_system_permission = true
      AND name NOT IN ('permissions.manage', 'users.delete')
  LOOP
    INSERT INTO role_permissions (role_id, permission_id, is_granted)
    VALUES (v_admin_role_id, v_permission.id, true);
  END LOOP;

  -- Manager: Operational permissions
  FOR v_permission IN 
    SELECT id FROM permissions 
    WHERE is_active = true 
      AND name IN (
        'bookings.create', 'bookings.read', 'bookings.update', 'bookings.approve',
        'customers.create', 'customers.read', 'customers.update',
        'reports.read', 'reports.export',
        'users.read',
        'payments.read'
      )
  LOOP
    INSERT INTO role_permissions (role_id, permission_id, is_granted)
    VALUES (v_manager_role_id, v_permission.id, true);
  END LOOP;

  -- Staff: Basic operational permissions
  FOR v_permission IN 
    SELECT id FROM permissions 
    WHERE is_active = true 
      AND name IN (
        'bookings.create', 'bookings.read.own', 'bookings.update',
        'customers.read',
        'reports.read'
      )
  LOOP
    INSERT INTO role_permissions (role_id, permission_id, is_granted)
    VALUES (v_staff_role_id, v_permission.id, true);
  END LOOP;

  -- Viewer: Read-only permissions
  FOR v_permission IN 
    SELECT id FROM permissions 
    WHERE is_active = true 
      AND action = 'read'
      AND is_dangerous = false
  LOOP
    INSERT INTO role_permissions (role_id, permission_id, is_granted)
    VALUES (v_viewer_role_id, v_permission.id, true);
  END LOOP;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE permission_groups IS 'Logical grouping of related permissions for UI organization';
COMMENT ON TABLE permissions IS 'Granular permissions with resource-level control and conditions';
COMMENT ON TABLE roles IS 'Roles that group permissions with hierarchy support';
COMMENT ON TABLE role_permissions IS 'Mapping between roles and permissions with explicit grant/deny';
COMMENT ON TABLE user_roles IS 'User role assignments with scope and time-based restrictions';
COMMENT ON TABLE permission_audit_log IS 'Audit trail of all permission checks for compliance';

COMMENT ON FUNCTION get_user_permissions IS 'Get all permissions for a user including inherited from parent roles';
COMMENT ON FUNCTION has_permission IS 'Check if user has a specific permission with context evaluation';
COMMENT ON FUNCTION check_resource_permission IS 'Check and log resource-level permission';
COMMENT ON FUNCTION get_user_roles IS 'Get active roles for a user with validity checks';
COMMENT ON FUNCTION get_role_all_permissions IS 'Get all permissions for a role including inherited';
COMMENT ON FUNCTION check_role_hierarchy_circular IS 'Prevent circular dependencies in role hierarchy';
COMMENT ON FUNCTION get_permission_stats IS 'Calculate permission usage statistics for auditing';
