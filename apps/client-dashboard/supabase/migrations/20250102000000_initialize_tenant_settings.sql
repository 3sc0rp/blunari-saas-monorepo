-- Migration: Initialize default settings for existing tenants
-- Description: This migration creates default settings entries for all existing tenants
-- Created: $(date)

-- Function to create default settings for a tenant
CREATE OR REPLACE FUNCTION create_default_tenant_settings(tenant_uuid UUID)
RETURNS void AS $$
BEGIN
  -- Insert default branding settings
  INSERT INTO public.tenant_settings (tenant_id, setting_key, setting_value)
  VALUES (tenant_uuid, 'branding', jsonb_build_object(
    'restaurantName', (SELECT name FROM tenants WHERE id = tenant_uuid LIMIT 1),
    'tagline', '',
    'logoUrl', COALESCE((SELECT logo_url FROM tenants WHERE id = tenant_uuid LIMIT 1), ''),
    'faviconUrl', '',
    'primaryColor', COALESCE((SELECT primary_color FROM tenants WHERE id = tenant_uuid LIMIT 1), '#1e3a8a'),
    'secondaryColor', '#f59e0b',
    'accentColor', '#059669',
    'customDomain', '',
    'domainStatus', 'pending'
  ))
  ON CONFLICT (tenant_id, setting_key) DO NOTHING;

  -- Insert default operational settings
  INSERT INTO public.tenant_settings (tenant_id, setting_key, setting_value)
  VALUES (tenant_uuid, 'operational', jsonb_build_object(
    'timezone', COALESCE((SELECT timezone FROM tenants WHERE id = tenant_uuid LIMIT 1), 'America/New_York'),
    'businessHours', jsonb_build_array(
      jsonb_build_object('day', 0, 'isOpen', false, 'openTime', '09:00', 'closeTime', '22:00'),
      jsonb_build_object('day', 1, 'isOpen', true, 'openTime', '09:00', 'closeTime', '22:00'),
      jsonb_build_object('day', 2, 'isOpen', true, 'openTime', '09:00', 'closeTime', '22:00'),
      jsonb_build_object('day', 3, 'isOpen', true, 'openTime', '09:00', 'closeTime', '22:00'),
      jsonb_build_object('day', 4, 'isOpen', true, 'openTime', '09:00', 'closeTime', '22:00'),
      jsonb_build_object('day', 5, 'isOpen', true, 'openTime', '09:00', 'closeTime', '22:00'),
      jsonb_build_object('day', 6, 'isOpen', false, 'openTime', '09:00', 'closeTime', '22:00')
    ),
    'defaultServiceDuration', 90,
    'advanceBookingDays', 30,
    'cancellationPolicy', 'Cancellations must be made at least 24 hours in advance.',
    'depositPolicy', jsonb_build_object(
      'enabled', false,
      'defaultAmount', 25.00,
      'largePartyThreshold', 8,
      'largePartyAmount', 50.00
    )
  ))
  ON CONFLICT (tenant_id, setting_key) DO NOTHING;

  -- Insert default integration settings
  INSERT INTO public.tenant_settings (tenant_id, setting_key, setting_value)
  VALUES (tenant_uuid, 'integrations', jsonb_build_object(
    'sms', jsonb_build_object('enabled', false, 'provider', 'twilio'),
    'email', jsonb_build_object('enabled', true, 'provider', 'resend'),
    'pos', jsonb_build_object('enabled', false, 'provider', 'square'),
    'analytics', jsonb_build_object('enabled', true)
  ))
  ON CONFLICT (tenant_id, setting_key) DO NOTHING;

  -- Insert default notification settings
  INSERT INTO public.tenant_settings (tenant_id, setting_key, setting_value)
  VALUES (tenant_uuid, 'notifications', jsonb_build_object(
    'email', jsonb_build_object(
      'confirmations', true,
      'reminders', true,
      'cancellations', true,
      'noshowAlerts', true,
      'reminderHours', 24
    ),
    'sms', jsonb_build_object(
      'confirmations', false,
      'reminders', false,
      'cancellations', false,
      'reminderHours', 2
    ),
    'staff', jsonb_build_object(
      'overbookingAlerts', true,
      'noshowAlerts', true,
      'cancellationAlerts', true,
      'dailySummary', true,
      'summaryTime', '08:00'
    ),
    'customer', jsonb_build_object(
      'waitlistUpdates', true,
      'promotionalEmails', false,
      'birthdayReminders', true
    )
  ))
  ON CONFLICT (tenant_id, setting_key) DO NOTHING;

END;
$$ LANGUAGE plpgsql;

-- Create default settings for all existing tenants
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN SELECT id FROM public.tenants LOOP
    PERFORM create_default_tenant_settings(tenant_record.id);
  END LOOP;
END $$;

-- Create trigger function to automatically create settings for new tenants
CREATE OR REPLACE FUNCTION create_settings_for_new_tenant()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_tenant_settings(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run the function when a new tenant is created
DROP TRIGGER IF EXISTS create_tenant_settings_trigger ON public.tenants;
CREATE TRIGGER create_tenant_settings_trigger
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION create_settings_for_new_tenant();

-- Create storage bucket for tenant assets if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-assets', 'tenant-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for tenant assets
CREATE POLICY "Tenant assets are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tenant-assets');

CREATE POLICY "Tenant can upload their own assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tenant-assets' 
  AND (storage.foldername(name))[1] = public.get_current_user_tenant_id()::text
);

CREATE POLICY "Tenant can update their own assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tenant-assets' 
  AND (storage.foldername(name))[1] = public.get_current_user_tenant_id()::text
);

CREATE POLICY "Tenant can delete their own assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tenant-assets' 
  AND (storage.foldername(name))[1] = public.get_current_user_tenant_id()::text
);

-- Add comment for documentation
COMMENT ON FUNCTION create_default_tenant_settings IS 'Creates default settings for a tenant including branding, operational, integration, and notification settings';
COMMENT ON FUNCTION create_settings_for_new_tenant IS 'Trigger function to automatically create default settings when a new tenant is created';
