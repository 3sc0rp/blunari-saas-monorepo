-- Updated provision_tenant function with auto_provisioning record creation
-- This ensures tenants show up in the admin dashboard

CREATE OR REPLACE FUNCTION public.provision_tenant(
  p_tenant_data JSONB,
  p_owner_email TEXT,
  p_owner_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_tenant_id UUID;
  new_tenant_record RECORD;
  address_json JSONB;
  provisioning_id UUID;
BEGIN
  -- Build address JSON if components are provided
  IF p_tenant_data ? 'address' OR p_tenant_data ? 'city' OR p_tenant_data ? 'state' THEN
    address_json := jsonb_build_object(
      'street', COALESCE(p_tenant_data->>'address', ''),
      'city', COALESCE(p_tenant_data->>'city', ''),
      'state', COALESCE(p_tenant_data->>'state', ''),
      'country', COALESCE(p_tenant_data->>'country', ''),
      'postalCode', COALESCE(p_tenant_data->>'postal_code', '')
    );
  ELSE
    address_json := NULL;
  END IF;

  -- 1. Create auto_provisioning record (required for admin dashboard display)
  INSERT INTO public.auto_provisioning (
    user_id,
    restaurant_name,
    restaurant_slug,
    timezone,
    currency,
    status,
    login_email,
    business_email
  )
  VALUES (
    p_owner_user_id,
    p_tenant_data->>'name',
    p_tenant_data->>'slug',
    COALESCE(p_tenant_data->>'timezone', 'America/New_York'),
    COALESCE(p_tenant_data->>'currency', 'USD'),
    'processing',
    p_owner_email,
    p_tenant_data->>'email'
  )
  RETURNING id INTO provisioning_id;

  -- 2. Create tenant
  INSERT INTO public.tenants (
    slug,
    name,
    status,
    timezone,
    currency,
    email,
    phone,
    description,
    website,
    address
  )
  VALUES (
    p_tenant_data->>'slug',
    p_tenant_data->>'name',
    'active',
    COALESCE(p_tenant_data->>'timezone', 'America/New_York'),
    COALESCE(p_tenant_data->>'currency', 'USD'),
    p_owner_email,
    p_tenant_data->>'phone',
    p_tenant_data->>'description',
    p_tenant_data->>'website',
    address_json
  )
  RETURNING id, slug, name, status INTO new_tenant_record;
  
  new_tenant_id := new_tenant_record.id;

  -- 3. Update auto_provisioning with tenant_id and mark as completed
  UPDATE public.auto_provisioning
  SET 
    tenant_id = new_tenant_id,
    status = 'completed',
    completed_at = NOW()
  WHERE id = provisioning_id;

  -- 4. Create or update profile for owner
  INSERT INTO public.profiles (
    user_id,
    email,
    first_name,
    last_name,
    role
  )
  VALUES (
    p_owner_user_id,
    p_owner_email,
    SPLIT_PART(COALESCE(p_tenant_data->>'owner_name', 'Owner'), ' ', 1),
    NULLIF(SPLIT_PART(COALESCE(p_tenant_data->>'owner_name', 'Owner'), ' ', 2), ''),
    'owner'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- 5. Enable default features
  INSERT INTO public.tenant_features (tenant_id, feature_key, enabled, source)
  VALUES 
    (new_tenant_id, 'basic_booking', true, 'plan'),
    (new_tenant_id, 'email_notifications', true, 'plan'),
    (new_tenant_id, 'basic_analytics', true, 'plan'),
    (new_tenant_id, 'widget_integration', true, 'plan');

  -- 6. Create default restaurant tables
  INSERT INTO public.restaurant_tables (tenant_id, name, capacity, table_type, active)
  VALUES 
    (new_tenant_id, 'Table 1', 2, 'standard', true),
    (new_tenant_id, 'Table 2', 2, 'standard', true),
    (new_tenant_id, 'Table 3', 4, 'standard', true),
    (new_tenant_id, 'Table 4', 4, 'standard', true),
    (new_tenant_id, 'Table 5', 6, 'standard', true),
    (new_tenant_id, 'Table 6', 6, 'standard', true),
    (new_tenant_id, 'Table 7', 8, 'standard', true),
    (new_tenant_id, 'Table 8', 8, 'standard', true);

  -- 7. Create default business hours
  INSERT INTO public.business_hours (tenant_id, day_of_week, is_open, open_time, close_time)
  VALUES 
    (new_tenant_id, 0, false, NULL, NULL),
    (new_tenant_id, 1, true, '09:00', '22:00'),
    (new_tenant_id, 2, true, '09:00', '22:00'),
    (new_tenant_id, 3, true, '09:00', '22:00'),
    (new_tenant_id, 4, true, '09:00', '22:00'),
    (new_tenant_id, 5, true, '09:00', '23:00'),
    (new_tenant_id, 6, true, '09:00', '23:00');

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', new_tenant_id,
    'tenant_slug', new_tenant_record.slug,
    'tenant_name', new_tenant_record.name,
    'owner_user_id', p_owner_user_id,
    'provisioning_id', provisioning_id
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Update provisioning status to failed
    IF provisioning_id IS NOT NULL THEN
      UPDATE public.auto_provisioning
      SET 
        status = 'failed',
        error_message = SQLERRM
      WHERE id = provisioning_id;
    END IF;
    
    RAISE EXCEPTION 'Tenant provisioning failed: %', SQLERRM;
END;
$$;
