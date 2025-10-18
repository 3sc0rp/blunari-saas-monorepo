-- Add catering widget configuration system
-- Allows tenants to customize their embeddable catering widget

CREATE TABLE IF NOT EXISTS public.catering_widget_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  
  -- Branding
  primary_color TEXT NOT NULL DEFAULT '#f97316',
  secondary_color TEXT NOT NULL DEFAULT '#ea580c',
  background_color TEXT NOT NULL DEFAULT '#ffffff',
  text_color TEXT NOT NULL DEFAULT '#1f2937',
  font_family TEXT NOT NULL DEFAULT 'Inter',
  
  -- Layout
  border_radius INTEGER NOT NULL DEFAULT 8,
  compact_mode BOOLEAN NOT NULL DEFAULT false,
  show_images BOOLEAN NOT NULL DEFAULT true,
  
  -- Features
  allow_guest_count_customization BOOLEAN NOT NULL DEFAULT true,
  show_dietary_filters BOOLEAN NOT NULL DEFAULT true,
  require_phone BOOLEAN NOT NULL DEFAULT false,
  require_venue BOOLEAN NOT NULL DEFAULT true,
  
  -- Content
  welcome_message TEXT NOT NULL DEFAULT 'Explore Our Catering Packages',
  success_message TEXT NOT NULL DEFAULT 'Thank you! We''ll contact you soon with a quote.',
  min_advance_notice_days INTEGER NOT NULL DEFAULT 3,
  
  -- Widget Settings
  active BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for tenant lookups
CREATE INDEX IF NOT EXISTS idx_catering_widget_configs_tenant_id 
ON public.catering_widget_configs(tenant_id);

-- Enable RLS
ALTER TABLE public.catering_widget_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Tenants can manage their own widget config
CREATE POLICY "Tenants can view their own catering widget config"
ON public.catering_widget_configs
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Tenants can update their own catering widget config"
ON public.catering_widget_configs
FOR UPDATE
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Tenants can insert their own catering widget config"
ON public.catering_widget_configs
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Create function to get catering widget config by slug (for public widget)
CREATE OR REPLACE FUNCTION public.get_catering_widget_config(p_slug TEXT)
RETURNS TABLE (
  tenant_id UUID,
  primary_color TEXT,
  secondary_color TEXT,
  background_color TEXT,
  text_color TEXT,
  font_family TEXT,
  border_radius INTEGER,
  compact_mode BOOLEAN,
  show_images BOOLEAN,
  allow_guest_count_customization BOOLEAN,
  show_dietary_filters BOOLEAN,
  require_phone BOOLEAN,
  require_venue BOOLEAN,
  welcome_message TEXT,
  success_message TEXT,
  min_advance_notice_days INTEGER,
  active BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cwc.tenant_id,
    cwc.primary_color,
    cwc.secondary_color,
    cwc.background_color,
    cwc.text_color,
    cwc.font_family,
    cwc.border_radius,
    cwc.compact_mode,
    cwc.show_images,
    cwc.allow_guest_count_customization,
    cwc.show_dietary_filters,
    cwc.require_phone,
    cwc.require_venue,
    cwc.welcome_message,
    cwc.success_message,
    cwc.min_advance_notice_days,
    cwc.active
  FROM public.catering_widget_configs cwc
  JOIN public.tenants t ON t.id = cwc.tenant_id
  WHERE t.slug = p_slug
    AND t.status = 'active'
    AND cwc.active = true;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_catering_widget_configs_updated_at
BEFORE UPDATE ON public.catering_widget_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default configurations for existing tenants
INSERT INTO public.catering_widget_configs (tenant_id)
SELECT id FROM public.tenants
WHERE id NOT IN (SELECT tenant_id FROM public.catering_widget_configs)
ON CONFLICT (tenant_id) DO NOTHING;

-- Comments
COMMENT ON TABLE public.catering_widget_configs IS 'Configuration for embeddable catering widgets per tenant';
COMMENT ON FUNCTION public.get_catering_widget_config IS 'Get catering widget configuration by tenant slug (public access)';

SELECT '✅ Catering widget configuration system created!' as status;

