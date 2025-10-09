-- Fix the provision_tenant function to use valid table_type values
-- The check constraint only allows: 'standard', 'booth', 'bar', 'outdoor', 'private'

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
  owner_employee_id UUID;
BEGIN
  -- Start transaction
  -- BEGIN; -- Removed as function is already in transaction

  -- 1. Create tenant
  INSERT INTO public.tenants (
    slug,
    name,
    status,
    plan_tier,
    plan_status,
    billing_cycle,
    address,
    city,
    state,
    country,
    postal_code,
    owner_email
  )
  VALUES (
    p_tenant_data->>'slug',
    p_tenant_data->>'name',
    'active',
    COALESCE((p_tenant_data->>'plan_tier')::TEXT, 'premium'),
    COALESCE((p_tenant_data->>'plan_status')::TEXT, 'trialing'),
    COALESCE((p_tenant_data->>'billing_cycle')::TEXT, 'monthly'),
    p_tenant_data->>'address',
    p_tenant_data->>'city',
    p_tenant_data->>'state',
    p_tenant_data->>'country',
    p_tenant_data->>'postal_code',
    p_owner_email
  )
  RETURNING id, slug, name, status INTO new_tenant_record;
  
  new_tenant_id := new_tenant_record.id;

  -- 2. Create owner employee record
  INSERT INTO public.employees (
    tenant_id,
    user_id,
    email,
    role,
    status,
    full_name
  )
  VALUES (
    new_tenant_id,
    p_owner_user_id,
    p_owner_email,
    'OWNER',
    'ACTIVE',
    COALESCE(p_tenant_data->>'owner_name', 'Owner')
  )
  RETURNING id INTO owner_employee_id;

  -- 3. Create tenant settings with defaults
  INSERT INTO public.tenant_settings (
    tenant_id,
    booking_buffer_minutes,
    max_advance_booking_days,
    min_advance_booking_hours,
    default_booking_duration_minutes,
    allow_same_day_bookings,
    require_phone,
    require_notes,
    auto_confirm_bookings,
    send_confirmation_email,
    send_reminder_email,
    reminder_hours_before,
    cancellation_policy,
    max_party_size,
    currency,
    timezone,
    locale,
    date_format,
    time_format,
    first_day_of_week
  )
  VALUES (
    new_tenant_id,
    15, -- booking_buffer_minutes
    30, -- max_advance_booking_days
    2,  -- min_advance_booking_hours
    120, -- default_booking_duration_minutes
    true, -- allow_same_day_bookings
    true, -- require_phone
    false, -- require_notes
    false, -- auto_confirm_bookings
    true, -- send_confirmation_email
    true, -- send_reminder_email
    24, -- reminder_hours_before
    'Cancellations must be made 24 hours in advance', -- cancellation_policy
    20, -- max_party_size
    'USD', -- currency
    'America/New_York', -- timezone
    'en-US', -- locale
    'MM/DD/YYYY', -- date_format
    '12h', -- time_format
    0 -- first_day_of_week (Sunday)
  );

  -- Enable default features for new tenant
  INSERT INTO public.tenant_features (tenant_id, feature_key, enabled, source)
  VALUES 
    (new_tenant_id, 'basic_booking', true, 'plan'),
    (new_tenant_id, 'email_notifications', true, 'plan'),
    (new_tenant_id, 'basic_analytics', true, 'plan'),
    (new_tenant_id, 'widget_integration', true, 'plan');

  -- Create default tables for the restaurant (fixed to use 'standard' instead of 'large')
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

  -- COMMIT; -- Removed as function manages its own transaction

  -- Return success with tenant data
  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', new_tenant_id,
    'tenant_slug', new_tenant_record.slug,
    'tenant_name', new_tenant_record.name,
    'owner_employee_id', owner_employee_id
  );

EXCEPTION
  WHEN OTHERS THEN
    -- ROLLBACK; -- PostgreSQL automatically rolls back on exception in function
    RAISE EXCEPTION 'Tenant provisioning failed: %', SQLERRM;
END;
$$;
