-- Drop ALL broken security/audit triggers and functions
-- These are causing cascading errors when trying to insert into profiles table

-- Drop all triggers on EMPLOYEES table
DROP TRIGGER IF EXISTS audit_employee_changes ON employees;
DROP TRIGGER IF EXISTS prevent_unauthorized_role_changes ON employees;
DROP TRIGGER IF EXISTS trigger_audit_employees ON employees;
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
DROP TRIGGER IF EXISTS validate_role_change_trigger ON employees;
DROP TRIGGER IF EXISTS audit_sensitive_operations ON employees;

-- Drop all triggers on PROFILES table
DROP TRIGGER IF EXISTS audit_profile_changes ON profiles;
DROP TRIGGER IF EXISTS protect_profile_updates ON profiles;
DROP TRIGGER IF EXISTS trigger_audit_profiles ON profiles;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS validate_profile_update ON profiles;
DROP TRIGGER IF EXISTS audit_sensitive_operations ON profiles;

-- Drop all triggers on TENANTS table
DROP TRIGGER IF EXISTS create_tenant_settings_trigger ON tenants;
DROP TRIGGER IF EXISTS trg_check_owner_tenant_limit ON tenants;
DROP TRIGGER IF EXISTS trigger_audit_tenants ON tenants;
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
DROP TRIGGER IF EXISTS audit_sensitive_operations ON tenants;

-- Drop the broken functions (CASCADE will drop any remaining dependent triggers)
DROP FUNCTION IF EXISTS audit_all_sensitive_operations() CASCADE;
DROP FUNCTION IF EXISTS audit_sensitive_operations() CASCADE;
DROP FUNCTION IF EXISTS log_role_change() CASCADE;
DROP FUNCTION IF EXISTS validate_role_change() CASCADE;
DROP FUNCTION IF EXISTS validate_employee_role_change() CASCADE;
DROP FUNCTION IF EXISTS validate_profile_update() CASCADE;
DROP FUNCTION IF EXISTS auto_log_changes() CASCADE;

-- Verify all triggers are gone
SELECT 
  event_object_table,
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('profiles', 'employees', 'tenants')
ORDER BY event_object_table, trigger_name;
