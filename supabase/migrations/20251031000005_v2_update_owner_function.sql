-- ============================================================================
-- PROFESSIONAL TENANT PROVISIONING V2 - PART 5: UPDATE OWNER ID FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_provisioning_owner_id(
  p_tenant_id UUID,
  p_owner_id UUID,
  p_owner_email TEXT,
  p_audit_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auto_provisioning
  SET user_id = p_owner_id, status = 'completed', completed_at = NOW()
  WHERE tenant_id = p_tenant_id;
  
  UPDATE tenants
  SET owner_id = p_owner_id
  WHERE id = p_tenant_id;
  
  INSERT INTO profiles (
    user_id, email, role, first_name, last_name, onboarding_completed
  ) VALUES (
    p_owner_id, p_owner_email, 'tenant_owner',
    split_part(p_owner_email, '@', 1), '', FALSE
  ) ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email, role = EXCLUDED.role;
  
  UPDATE tenant_provisioning_audit_v2
  SET owner_id = p_owner_id
  WHERE id = p_audit_id;
  
  RETURN QUERY SELECT TRUE, NULL::TEXT;
  
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$;
