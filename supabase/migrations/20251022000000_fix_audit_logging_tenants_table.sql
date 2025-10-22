-- Fix audit logging for tenants table
-- The tenants table doesn't have a tenant_id column, it uses 'id' as the tenant identifier

CREATE OR REPLACE FUNCTION public.auto_log_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_action TEXT;
  v_old_values JSONB;
  v_new_values JSONB;
BEGIN
  -- Get user ID from session
  v_user_id := auth.uid();
  
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new_values := to_jsonb(NEW);
    -- Special case: for tenants table, use 'id' as tenant_id
    IF TG_TABLE_NAME = 'tenants' THEN
      v_tenant_id := (v_new_values->>'id')::UUID;
    ELSE
      v_tenant_id := (v_new_values->>'tenant_id')::UUID;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
    -- Special case: for tenants table, use 'id' as tenant_id
    IF TG_TABLE_NAME = 'tenants' THEN
      v_tenant_id := (v_new_values->>'id')::UUID;
    ELSE
      v_tenant_id := (v_new_values->>'tenant_id')::UUID;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old_values := to_jsonb(OLD);
    -- Special case: for tenants table, use 'id' as tenant_id
    IF TG_TABLE_NAME = 'tenants' THEN
      v_tenant_id := (v_old_values->>'id')::UUID;
    ELSE
      v_tenant_id := (v_old_values->>'tenant_id')::UUID;
    END IF;
  END IF;

  -- Log the activity (async via PERFORM to avoid blocking)
  PERFORM public.log_activity(
    p_tenant_id := v_tenant_id,
    p_user_id := v_user_id,
    p_action := v_action,
    p_resource_type := TG_TABLE_NAME,
    p_resource_id := COALESCE(
      (v_new_values->>'id')::UUID,
      (v_old_values->>'id')::UUID
    ),
    p_old_values := v_old_values,
    p_new_values := v_new_values
  );

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.auto_log_changes IS 'Generic trigger function to auto-log changes on critical tables. Handles special case for tenants table.';
