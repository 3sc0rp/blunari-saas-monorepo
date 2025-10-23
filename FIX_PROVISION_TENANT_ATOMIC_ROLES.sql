-- Comprehensive fix: Update provision_tenant_atomic to accept lowercase roles
-- This makes it compatible with manage-tenant-credentials Edge Function

CREATE OR REPLACE FUNCTION provision_tenant_atomic(
  p_idempotency_key UUID,
  p_admin_user_id UUID,
  p_tenant_name TEXT,
  p_tenant_slug TEXT,
  p_owner_email TEXT,
  p_owner_password TEXT,
  p_tenant_data JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_owner_id UUID;
  v_tenant_id UUID;
  v_request_id UUID;
  v_email_check RECORD;
  v_existing_request RECORD;
  v_owner_user_metadata JSONB;
  v_result JSONB;
BEGIN
  -- FIX: Accept both uppercase AND lowercase admin roles
  -- Check profiles table (for UI consistency with manage-tenant-credentials)
  -- Also fallback to employees table (for actual platform admins)
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = p_admin_user_id 
    AND UPPER(role) IN ('SUPER_ADMIN', 'ADMIN', 'OWNER')  -- Accept admin/owner/ADMIN/SUPER_ADMIN
  ) AND NOT EXISTS (
    SELECT 1 FROM employees
    WHERE user_id = p_admin_user_id
    AND role IN ('SUPER_ADMIN', 'ADMIN')
    AND status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'User % is not authorized to provision tenants', p_admin_user_id;
  END IF;
  
  -- Check for existing request with same idempotency key
  SELECT * INTO v_existing_request
  FROM provisioning_requests
  WHERE idempotency_key = p_idempotency_key;
  
  IF v_existing_request.id IS NOT NULL THEN
    -- Request already exists
    IF v_existing_request.status = 'completed' THEN
      -- Return existing result
      RETURN jsonb_build_object(
        'success', true,
        'tenant_id', v_existing_request.tenant_id,
        'owner_id', v_existing_request.owner_id,
        'idempotent', true,
        'message', 'Tenant already provisioned (idempotent request)'
      );
    ELSIF v_existing_request.status = 'failed' THEN
      -- Previous attempt failed, retry
      UPDATE provisioning_requests
      SET status = 'processing', completed_at = NULL, error_message = NULL
      WHERE id = v_existing_request.id
      RETURNING id INTO v_request_id;
    ELSIF v_existing_request.status IN ('pending', 'processing') THEN
      -- Request is in progress
      RAISE EXCEPTION 'Provisioning request % is already in progress', p_idempotency_key;
    END IF;
  ELSE
    -- Create new provisioning request
    INSERT INTO provisioning_requests (
      idempotency_key,
      admin_user_id,
      tenant_slug,
      owner_email,
      status,
      request_data
    ) VALUES (
      p_idempotency_key,
      p_admin_user_id,
      p_tenant_slug,
      LOWER(TRIM(p_owner_email)),
      'processing',
      p_tenant_data
    ) RETURNING id INTO v_request_id;
  END IF;
  
  -- Normalize inputs
  p_owner_email := LOWER(TRIM(p_owner_email));
  p_tenant_slug := LOWER(TRIM(p_tenant_slug));
  
  -- Validate owner email availability
  SELECT * INTO v_email_check
  FROM check_owner_email_availability(p_owner_email);
  
  IF NOT v_email_check.available THEN
    UPDATE provisioning_requests
    SET status = 'failed', 
        error_message = v_email_check.reason,
        completed_at = NOW()
    WHERE id = v_request_id;
    
    RAISE EXCEPTION 'Email validation failed: %', v_email_check.reason;
  END IF;
  
  -- Check for slug conflicts
  IF EXISTS (
    SELECT 1 FROM tenants WHERE slug = p_tenant_slug
    UNION ALL
    SELECT 1 FROM auto_provisioning WHERE tenant_slug = p_tenant_slug AND status != 'failed'
  ) THEN
    UPDATE provisioning_requests
    SET status = 'failed',
        error_message = 'Slug already exists',
        completed_at = NOW()
    WHERE id = v_request_id;
    
    RAISE EXCEPTION 'Slug % already exists', p_tenant_slug;
  END IF;
  
  -- All steps below happen in a single transaction
  
  -- Step 1: Create owner auth user
  -- Note: This uses a helper function that calls Supabase Auth Admin API
  -- The actual user creation happens via Edge Function, not directly here
  -- For now, we'll generate an ID and the Edge Function will create the actual user
  v_owner_id := gen_random_uuid();
  
  -- Step 2: Create tenant with owner_id
  INSERT INTO tenants (
    name,
    slug,
    email,
    owner_id,
    status,
    config,
    created_at,
    updated_at
  ) VALUES (
    p_tenant_name,
    p_tenant_slug,
    p_owner_email,
    v_owner_id,  -- Set owner_id immediately
    'provisioning',
    COALESCE(p_tenant_data->'config', '{}'::JSONB),
    NOW(),
    NOW()
  ) RETURNING id INTO v_tenant_id;
  
  -- Step 3: Create auto_provisioning record
  INSERT INTO auto_provisioning (
    user_id,
    tenant_id,
    tenant_slug,
    status,
    role_granted,
    granted_by,
    created_at
  ) VALUES (
    v_owner_id,  -- Will be updated by Edge Function after user creation
    v_tenant_id,
    p_tenant_slug,
    'pending',  -- Edge Function will update to 'completed' after user creation
    'owner',
    p_admin_user_id,
    NOW()
  );
  
  -- Step 4: Mark provisioning request as completed
  UPDATE provisioning_requests
  SET 
    status = 'completed',
    tenant_id = v_tenant_id,
    owner_id = v_owner_id,
    completed_at = NOW()
  WHERE id = v_request_id;
  
  -- Return success with IDs
  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', v_tenant_id,
    'owner_id', v_owner_id,
    'request_id', v_request_id,
    'message', 'Tenant provisioning initiated successfully'
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Mark request as failed
  IF v_request_id IS NOT NULL THEN
    UPDATE provisioning_requests
    SET 
      status = 'failed',
      error_message = SQLERRM,
      completed_at = NOW()
    WHERE id = v_request_id;
  END IF;
  
  -- Re-raise the exception
  RAISE;
END;
$$;

COMMENT ON FUNCTION provision_tenant_atomic IS 'Atomically provisions a tenant with owner account. Accepts both uppercase and lowercase admin roles in profiles table. Also checks employees table for platform admins.';
