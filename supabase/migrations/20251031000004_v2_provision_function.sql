-- ============================================================================
-- PROFESSIONAL TENANT PROVISIONING V2 - PART 4: ATOMIC PROVISIONING FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION provision_tenant_atomic_v2(
  p_admin_user_id UUID,
  p_admin_email TEXT,
  p_tenant_name TEXT,
  p_tenant_slug TEXT,
  p_owner_email TEXT,
  p_owner_name TEXT DEFAULT NULL,
  p_timezone TEXT DEFAULT 'UTC',
  p_currency TEXT DEFAULT 'USD',
  p_tenant_email TEXT DEFAULT NULL,
  p_tenant_phone TEXT DEFAULT NULL,
  p_address JSONB DEFAULT NULL,
  p_settings JSONB DEFAULT NULL,
  p_idempotency_key UUID DEFAULT NULL,
  p_request_id UUID DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  tenant_id UUID,
  owner_id UUID,
  audit_id UUID,
  error_code TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_owner_id UUID;
  v_audit_id UUID;
  v_error_code TEXT;
  v_error_message TEXT;
  v_started_at TIMESTAMP := NOW();
  v_email_check RECORD;
  v_slug_check RECORD;
  v_idempotency_key UUID := COALESCE(p_idempotency_key, gen_random_uuid());
  v_request_id UUID := COALESCE(p_request_id, gen_random_uuid());
BEGIN
  INSERT INTO tenant_provisioning_audit_v2 (
    idempotency_key, request_id, admin_user_id, admin_email,
    tenant_slug, tenant_name, owner_email, status,
    request_data
  ) VALUES (
    v_idempotency_key, v_request_id, p_admin_user_id, p_admin_email,
    p_tenant_slug, p_tenant_name, p_owner_email, 'initiated',
    jsonb_build_object(
      'tenant_name', p_tenant_name, 'tenant_slug', p_tenant_slug,
      'owner_email', p_owner_email, 'owner_name', p_owner_name,
      'timezone', p_timezone, 'currency', p_currency,
      'address', p_address, 'settings', p_settings
    )
  ) RETURNING id INTO v_audit_id;
  
  UPDATE tenant_provisioning_audit_v2 SET status = 'validating' WHERE id = v_audit_id;
  
  SELECT * INTO v_email_check FROM validate_owner_email_realtime(p_owner_email);
  IF NOT v_email_check.available THEN
    v_error_code := 'EMAIL_UNAVAILABLE';
    v_error_message := v_email_check.reason;
    RAISE EXCEPTION 'EMAIL_UNAVAILABLE: %', v_email_check.reason;
  END IF;
  
  SELECT * INTO v_slug_check FROM validate_tenant_slug_realtime(p_tenant_slug);
  IF NOT v_slug_check.available THEN
    v_error_code := 'SLUG_UNAVAILABLE';
    v_error_message := v_slug_check.reason;
    RAISE EXCEPTION 'SLUG_UNAVAILABLE: %', v_slug_check.reason;
  END IF;
  
  UPDATE tenant_provisioning_audit_v2 SET status = 'creating_tenant' WHERE id = v_audit_id;
  
  INSERT INTO tenants (
    name, slug, email, phone, address, settings,
    timezone, currency, status, owner_id
  ) VALUES (
    p_tenant_name, p_tenant_slug,
    COALESCE(p_tenant_email, p_owner_email),
    p_tenant_phone,
    COALESCE(p_address, '{}'::JSONB),
    COALESCE(p_settings, '{}'::JSONB),
    p_timezone, p_currency, 'active', NULL
  ) RETURNING id INTO v_tenant_id;
  
  UPDATE tenant_provisioning_audit_v2 
  SET tenant_id = v_tenant_id 
  WHERE id = v_audit_id;
  
  UPDATE tenant_provisioning_audit_v2 SET status = 'creating_records' WHERE id = v_audit_id;
  
  INSERT INTO auto_provisioning (
    user_id, tenant_id, tenant_slug, status, role_granted, granted_by
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::UUID,
    v_tenant_id, p_tenant_slug, 'pending', 'owner', p_admin_user_id
  );
  
  UPDATE tenant_provisioning_audit_v2 SET status = 'verifying' WHERE id = v_audit_id;
  
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = v_tenant_id) THEN
    RAISE EXCEPTION 'VERIFICATION_FAILED: Tenant record not found after creation';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM auto_provisioning WHERE tenant_id = v_tenant_id) THEN
    RAISE EXCEPTION 'VERIFICATION_FAILED: Auto-provisioning record not found after creation';
  END IF;
  
  UPDATE tenant_provisioning_audit_v2 
  SET 
    status = 'completed',
    completed_at = NOW(),
    duration_ms = EXTRACT(MILLISECONDS FROM (NOW() - v_started_at))::INTEGER
  WHERE id = v_audit_id;
  
  RETURN QUERY SELECT 
    TRUE, v_tenant_id, NULL::UUID, v_audit_id, NULL::TEXT, NULL::TEXT;
    
EXCEPTION WHEN OTHERS THEN
  v_error_code := COALESCE(v_error_code, SQLSTATE);
  v_error_message := COALESCE(v_error_message, SQLERRM);
  
  UPDATE tenant_provisioning_audit_v2 
  SET 
    status = 'failed', completed_at = NOW(),
    duration_ms = EXTRACT(MILLISECONDS FROM (NOW() - v_started_at))::INTEGER,
    error_code = v_error_code, error_message = v_error_message,
    error_details = jsonb_build_object('sqlstate', SQLSTATE, 'sqlerrm', SQLERRM, 'context', PG_EXCEPTION_CONTEXT)
  WHERE id = v_audit_id;
  
  RETURN QUERY SELECT 
    FALSE, v_tenant_id, NULL::UUID, v_audit_id, v_error_code, v_error_message;
END;
$$;
