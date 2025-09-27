-- Enhanced Database Isolation with Complete Tenant Separation
-- This migration strengthens RLS policies for absolute tenant isolation

-- Create security definer function to get current user's tenant
CREATE OR REPLACE FUNCTION public.get_current_user_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  tenant_uuid UUID;
BEGIN
  SELECT t.id INTO tenant_uuid
  FROM public.auto_provisioning ap
  JOIN public.tenants t ON t.id = ap.tenant_id
  WHERE ap.user_id = auth.uid()
    AND ap.status = 'completed'
  ORDER BY ap.created_at DESC
  LIMIT 1;
  
  RETURN tenant_uuid;
END;
$$;

-- Create function to check if user has access to specific tenant
CREATE OR REPLACE FUNCTION public.user_has_tenant_access(target_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.auto_provisioning ap
    WHERE ap.user_id = auth.uid()
      AND ap.tenant_id = target_tenant_id
      AND ap.status = 'completed'
  );
END;
$$;

-- Update booking_holds RLS policies for enhanced isolation
DROP POLICY IF EXISTS "holds_isolation" ON public.booking_holds;
CREATE POLICY "Tenant booking holds isolation"
ON public.booking_holds
FOR ALL
TO authenticated
USING (tenant_id = public.get_current_user_tenant_id());

-- Update bookings RLS policies for enhanced isolation
DROP POLICY IF EXISTS "bookings_isolation" ON public.bookings;
CREATE POLICY "Tenant bookings isolation"
ON public.bookings
FOR ALL
TO authenticated
USING (tenant_id = public.get_current_user_tenant_id());

-- Update domains RLS policies for enhanced isolation
DROP POLICY IF EXISTS "domains_isolation" ON public.domains;
CREATE POLICY "Tenant domains isolation"
ON public.domains
FOR ALL
TO authenticated
USING (tenant_id = public.get_current_user_tenant_id());

-- Update restaurant_tables RLS policies for enhanced isolation
DROP POLICY IF EXISTS "tables_isolation" ON public.restaurant_tables;
CREATE POLICY "Tenant tables isolation"
ON public.restaurant_tables
FOR ALL
TO authenticated
USING (tenant_id = public.get_current_user_tenant_id());

-- Update tenant_features RLS policies for enhanced isolation
DROP POLICY IF EXISTS "tenant_features_isolation" ON public.tenant_features;
CREATE POLICY "Tenant features isolation"
ON public.tenant_features
FOR ALL
TO authenticated
USING (tenant_id = public.get_current_user_tenant_id());

-- Create analytics tracking table with tenant isolation
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  user_session TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on analytics_events
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Create policy for analytics_events
CREATE POLICY "Tenant analytics isolation"
ON public.analytics_events
FOR ALL
TO authenticated
USING (tenant_id = public.get_current_user_tenant_id());

-- Create settings table with tenant isolation
CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, setting_key)
);

-- Enable RLS on tenant_settings
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for tenant_settings
CREATE POLICY "Tenant settings isolation"
ON public.tenant_settings
FOR ALL
TO authenticated
USING (tenant_id = public.get_current_user_tenant_id());

-- Create trigger for tenant_settings updated_at
CREATE TRIGGER update_tenant_settings_updated_at
  BEFORE UPDATE ON public.tenant_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create widget configurations table with tenant isolation
CREATE TABLE IF NOT EXISTS public.widget_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  widget_type TEXT NOT NULL DEFAULT 'booking_form',
  configuration JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on widget_configs
ALTER TABLE public.widget_configs ENABLE ROW LEVEL SECURITY;

-- Create policy for widget_configs
CREATE POLICY "Tenant widget configs isolation"
ON public.widget_configs
FOR ALL
TO authenticated
USING (tenant_id = public.get_current_user_tenant_id());

-- Create trigger for widget_configs updated_at
CREATE TRIGGER update_widget_configs_updated_at
  BEFORE UPDATE ON public.widget_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance with tenant isolation
CREATE INDEX IF NOT EXISTS idx_booking_holds_tenant_time ON public.booking_holds(tenant_id, booking_time);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_time ON public.bookings(tenant_id, booking_time);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_tenant_active ON public.restaurant_tables(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant_type ON public.analytics_events(tenant_id, event_type);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_key ON public.tenant_settings(tenant_id, setting_key);
CREATE INDEX IF NOT EXISTS idx_widget_configs_tenant_active ON public.widget_configs(tenant_id, is_active);

-- Create default widget configuration for existing tenants
INSERT INTO public.widget_configs (tenant_id, widget_type, configuration)
SELECT 
  t.id,
  'booking_form',
  '{
    "theme": "modern",
    "primaryColor": "#2563eb",
    "accentColor": "#1d4ed8",
    "fontFamily": "Inter",
    "borderRadius": "8px",
    "showLogo": true,
    "enableAnimations": true,
    "allowSpecialRequests": true,
    "requirePhone": false,
    "minPartySize": 1,
    "maxPartySize": 12,
    "advanceBookingDays": 30,
    "timeSlotInterval": 15
  }'::jsonb
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.widget_configs wc 
  WHERE wc.tenant_id = t.id AND wc.widget_type = 'booking_form'
);