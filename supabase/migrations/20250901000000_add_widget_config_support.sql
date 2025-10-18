-- Add support for enhanced widget configurations
-- This migration adds support for both booking and catering widget types with their specific configurations

-- Update widget_configs table to support both booking and catering widgets
-- First, check if widget_configs exists, if not create it
CREATE TABLE IF NOT EXISTS public.widget_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL DEFAULT 'booking',
  configuration JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, widget_type)
);

-- Enable RLS if not already enabled
ALTER TABLE public.widget_configs ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and create new one
DROP POLICY IF EXISTS "Tenant widget configs isolation" ON public.widget_configs;
DROP POLICY IF EXISTS "Tenant isolation for widget configs" ON public.widget_configs;

CREATE POLICY "Tenant isolation for widget configs" ON public.widget_configs
FOR ALL USING (
  tenant_id IN (
    SELECT tenant_id FROM public.user_roles 
    WHERE user_id = auth.uid()
  )
);

-- Add updated_at trigger if not exists
DROP TRIGGER IF EXISTS update_widget_configs_updated_at ON public.widget_configs;
CREATE TRIGGER update_widget_configs_updated_at
  BEFORE UPDATE ON public.widget_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add constraint to ensure widget_type is valid
ALTER TABLE public.widget_configs DROP CONSTRAINT IF EXISTS check_widget_type;
ALTER TABLE public.widget_configs ADD CONSTRAINT check_widget_type 
  CHECK (widget_type IN ('booking', 'catering'));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_widget_configs_tenant_type ON public.widget_configs(tenant_id, widget_type);

-- Function to get or create default widget config
CREATE OR REPLACE FUNCTION public.get_widget_config(
  _tenant_id UUID,
  _widget_type TEXT DEFAULT 'booking'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _config JSONB;
  _default_booking_config JSONB := '{
    "theme": "light",
    "primaryColor": "#3b82f6",
    "showAvailability": true,
    "showPricing": false,
    "requirePhone": true,
    "allowCancellation": true,
    "maxAdvanceBooking": 30,
    "timeSlotInterval": 30,
    "enableWaitlist": true,
    "enableNotifications": true,
    "showReviews": false
  }';
  _default_catering_config JSONB := '{
    "theme": "light",
    "primaryColor": "#3b82f6",
    "showPackages": true,
    "showCustomOrders": true,
    "enableQuotes": true,
    "showGallery": true,
    "packageFilters": true,
    "minOrderDays": 3,
    "requirePhone": true,
    "enableNotifications": true,
    "showTestimonials": false
  }';
BEGIN
  -- Try to get existing config
  SELECT configuration INTO _config
  FROM public.widget_configs
  WHERE tenant_id = _tenant_id AND widget_type = _widget_type;
  
  -- If not found, create default config
  IF _config IS NULL THEN
    INSERT INTO public.widget_configs (tenant_id, widget_type, configuration)
    VALUES (
      _tenant_id, 
      _widget_type, 
      CASE 
        WHEN _widget_type = 'catering' THEN _default_catering_config
        ELSE _default_booking_config
      END
    )
    ON CONFLICT (tenant_id, widget_type) DO UPDATE
    SET configuration = CASE 
      WHEN _widget_type = 'catering' THEN _default_catering_config
      ELSE _default_booking_config
    END
    RETURNING configuration INTO _config;
  END IF;
  
  RETURN _config;
END;
$$;

-- Function to update widget config
CREATE OR REPLACE FUNCTION public.update_widget_config(
  _tenant_id UUID,
  _widget_type TEXT,
  _config JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _updated_config JSONB;
BEGIN
  -- Upsert the configuration
  INSERT INTO public.widget_configs (tenant_id, widget_type, configuration)
  VALUES (_tenant_id, _widget_type, _config)
  ON CONFLICT (tenant_id, widget_type) 
  DO UPDATE SET 
    configuration = _config,
    updated_at = now()
  RETURNING configuration INTO _updated_config;
  
  RETURN _updated_config;
END;
$$;

-- Insert default widget configurations for existing tenants
INSERT INTO public.widget_configs (tenant_id, widget_type, configuration)
SELECT 
  t.id as tenant_id,
  'booking' as widget_type,
  jsonb_build_object(
    'theme', 'light',
    'primaryColor', COALESCE(t.primary_color, '#3b82f6'),
    'showAvailability', true,
    'showPricing', false,
    'requirePhone', true,
    'allowCancellation', true,
    'maxAdvanceBooking', 30,
    'timeSlotInterval', 30,
    'enableWaitlist', true,
    'enableNotifications', true,
    'showReviews', false
  ) as configuration
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.widget_configs wc 
  WHERE wc.tenant_id = t.id AND wc.widget_type = 'booking'
)
ON CONFLICT (tenant_id, widget_type) DO NOTHING;

-- Insert default catering widget configurations for tenants with catering enabled
INSERT INTO public.widget_configs (tenant_id, widget_type, configuration)
SELECT 
  t.id as tenant_id,
  'catering' as widget_type,
  jsonb_build_object(
    'theme', 'light',
    'primaryColor', COALESCE(t.primary_color, '#3b82f6'),
    'showPackages', true,
    'showCustomOrders', true,
    'enableQuotes', true,
    'showGallery', true,
    'packageFilters', true,
    'minOrderDays', 3,
    'requirePhone', true,
    'enableNotifications', true,
    'showTestimonials', false
  ) as configuration
FROM public.tenants t
WHERE EXISTS (
  SELECT 1 FROM public.tenant_features tf 
  WHERE tf.tenant_id = t.id AND tf.feature_key = 'catering' AND tf.enabled = true
)
AND NOT EXISTS (
  SELECT 1 FROM public.widget_configs wc 
  WHERE wc.tenant_id = t.id AND wc.widget_type = 'catering'
)
ON CONFLICT (tenant_id, widget_type) DO NOTHING;

-- Grant permissions for the functions
GRANT EXECUTE ON FUNCTION public.get_widget_config(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_widget_config(UUID, TEXT, JSONB) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.widget_configs IS 'Widget configuration settings for both booking and catering widgets per tenant';
COMMENT ON COLUMN public.widget_configs.widget_type IS 'Type of widget: booking or catering';
COMMENT ON COLUMN public.widget_configs.configuration IS 'JSON configuration object with widget-specific settings';
COMMENT ON FUNCTION public.get_widget_config(UUID, TEXT) IS 'Get widget configuration for a tenant, creating default if not exists';
COMMENT ON FUNCTION public.update_widget_config(UUID, TEXT, JSONB) IS 'Update or create widget configuration for a tenant';
