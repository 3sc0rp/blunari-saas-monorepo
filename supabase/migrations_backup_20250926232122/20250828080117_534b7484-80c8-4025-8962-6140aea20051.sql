-- Enhanced provision_tenant function to handle all new schema
CREATE OR REPLACE FUNCTION public.provision_tenant(
  p_user_id uuid, 
  p_restaurant_name text, 
  p_restaurant_slug text, 
  p_timezone text DEFAULT 'America/New_York'::text,
  p_currency text DEFAULT 'USD'::text,
  p_description text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_website text DEFAULT NULL,
  p_address jsonb DEFAULT NULL,
  p_cuisine_type_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_tenant_id UUID;
  provisioning_id UUID;
BEGIN
  -- Create auto_provisioning record
  INSERT INTO public.auto_provisioning (
    user_id, restaurant_name, restaurant_slug, timezone, currency, status
  ) VALUES (
    p_user_id, p_restaurant_name, p_restaurant_slug, p_timezone, p_currency, 'processing'
  ) RETURNING id INTO provisioning_id;

  -- Create tenant with enhanced fields
  INSERT INTO public.tenants (
    name, slug, timezone, currency, status, description, phone, email, website, address, cuisine_type_id
  ) VALUES (
    p_restaurant_name, p_restaurant_slug, p_timezone, p_currency, 'active',
    p_description, p_phone, p_email, p_website, p_address, p_cuisine_type_id
  ) RETURNING id INTO new_tenant_id;

  -- Update provisioning record with tenant_id
  UPDATE public.auto_provisioning 
  SET tenant_id = new_tenant_id, status = 'completed', completed_at = now()
  WHERE id = provisioning_id;

  -- Enable default features for new tenant
  INSERT INTO public.tenant_features (tenant_id, feature_key, enabled, source)
  VALUES 
    (new_tenant_id, 'basic_booking', true, 'plan'),
    (new_tenant_id, 'email_notifications', true, 'plan'),
    (new_tenant_id, 'basic_analytics', true, 'plan'),
    (new_tenant_id, 'widget_integration', true, 'plan');

  -- Create default tables for the restaurant
  INSERT INTO public.restaurant_tables (tenant_id, name, capacity, table_type, active)
  VALUES 
    (new_tenant_id, 'Table 1', 2, 'standard', true),
    (new_tenant_id, 'Table 2', 2, 'standard', true),
    (new_tenant_id, 'Table 3', 4, 'standard', true),
    (new_tenant_id, 'Table 4', 4, 'standard', true),
    (new_tenant_id, 'Table 5', 6, 'standard', true),
    (new_tenant_id, 'Table 6', 6, 'standard', true),
    (new_tenant_id, 'Table 7', 8, 'large', true),
    (new_tenant_id, 'Table 8', 8, 'large', true);

  -- Create default business hours (Monday-Friday 9-22, Saturday-Sunday 9-23)
  INSERT INTO public.business_hours (tenant_id, day_of_week, is_open, open_time, close_time)
  VALUES 
    (new_tenant_id, 0, false, NULL, NULL), -- Sunday closed by default
    (new_tenant_id, 1, true, '09:00', '22:00'), -- Monday
    (new_tenant_id, 2, true, '09:00', '22:00'), -- Tuesday
    (new_tenant_id, 3, true, '09:00', '22:00'), -- Wednesday
    (new_tenant_id, 4, true, '09:00', '22:00'), -- Thursday
    (new_tenant_id, 5, true, '09:00', '23:00'), -- Friday
    (new_tenant_id, 6, true, '09:00', '23:00'); -- Saturday

  -- Create default party size configuration
  INSERT INTO public.party_size_configs (
    tenant_id, min_party_size, max_party_size, default_party_size, 
    allow_large_parties, large_party_threshold
  ) VALUES (
    new_tenant_id, 1, 12, 2, true, 8
  );

  RETURN new_tenant_id;
END;
$function$