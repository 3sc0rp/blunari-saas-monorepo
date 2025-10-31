-- ============================================================================
-- PROFESSIONAL TENANT PROVISIONING V2 - PART 6: ROLLBACK FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION rollback_provisioning_v2(
  p_audit_id UUID,
  p_tenant_id UUID DEFAULT NULL,
  p_owner_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  deleted_tenant BOOLEAN,
  deleted_provisioning BOOLEAN,
  deleted_profile BOOLEAN,
  auth_user_cleanup_required BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_tenant BOOLEAN := FALSE;
  v_deleted_provisioning BOOLEAN := FALSE;
  v_deleted_profile BOOLEAN := FALSE;
  v_auth_cleanup BOOLEAN := FALSE;
BEGIN
  UPDATE tenant_provisioning_audit_v2
  SET status = 'rolling_back', rollback_reason = p_reason
  WHERE id = p_audit_id;
  
  IF p_tenant_id IS NOT NULL THEN
    DELETE FROM auto_provisioning WHERE tenant_id = p_tenant_id;
    v_deleted_provisioning := (SELECT EXISTS(SELECT 1));
  END IF;
  
  IF p_tenant_id IS NOT NULL THEN
    UPDATE tenants 
    SET deleted_at = NOW(), status = 'deleted'
    WHERE id = p_tenant_id;
    v_deleted_tenant := (SELECT EXISTS(SELECT 1));
  END IF;
  
  IF p_owner_id IS NOT NULL THEN
    DELETE FROM profiles WHERE user_id = p_owner_id;
    v_deleted_profile := (SELECT EXISTS(SELECT 1));
    v_auth_cleanup := TRUE;
  END IF;
  
  UPDATE tenant_provisioning_audit_v2
  SET status = 'rolled_back', completed_at = NOW()
  WHERE id = p_audit_id;
  
  RETURN QUERY SELECT 
    TRUE, v_deleted_tenant, v_deleted_provisioning,
    v_deleted_profile, v_auth_cleanup, NULL::TEXT;
    
EXCEPTION WHEN OTHERS THEN
  UPDATE tenant_provisioning_audit_v2
  SET status = 'failed', error_code = 'ROLLBACK_FAILED', error_message = SQLERRM
  WHERE id = p_audit_id;
  
  RETURN QUERY SELECT 
    FALSE, v_deleted_tenant, v_deleted_provisioning,
    v_deleted_profile, v_auth_cleanup, SQLERRM;
END;
$$;
