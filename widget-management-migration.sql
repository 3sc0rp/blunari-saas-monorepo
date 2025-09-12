-- ====================================================================
-- Widget Management Database Migration
-- ====================================================================
-- Run this script in your Supabase SQL Editor
-- Date: September 12, 2025
-- Purpose: Enable real-time Widget Management with WebSocket support

-- ====================================================================
-- 1. CREATE WIDGET CONFIGURATIONS TABLE
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.widget_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  widget_type TEXT NOT NULL CHECK (widget_type IN ('booking', 'catering')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure one widget config per type per tenant
  UNIQUE(tenant_id, widget_type)
);

-- ====================================================================
-- 2. CREATE WIDGET ANALYTICS TABLE
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.widget_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID REFERENCES public.widget_configurations(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'interaction', 'conversion')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Optional fields for enhanced analytics
  session_id TEXT,
  user_agent TEXT,
  ip_address INET,
  referrer TEXT,
  page_url TEXT
);

-- ====================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ====================================================================

ALTER TABLE public.widget_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_analytics ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 4. CREATE RLS POLICIES FOR TENANT ISOLATION
-- ====================================================================

CREATE POLICY "Tenant isolation for widget configurations" ON public.widget_configurations
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant isolation for widget analytics" ON public.widget_analytics
  FOR ALL USING (
    widget_id IN (
      SELECT id FROM public.widget_configurations wc
      WHERE wc.tenant_id IN (
        SELECT tenant_id FROM public.user_roles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- ====================================================================
-- 5. CREATE PERFORMANCE INDEXES
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_widget_configurations_tenant ON public.widget_configurations(tenant_id, widget_type);
CREATE INDEX IF NOT EXISTS idx_widget_configurations_active ON public.widget_configurations(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_widget ON public.widget_analytics(widget_id, event_type);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_timestamp ON public.widget_analytics(widget_id, timestamp DESC);

-- ====================================================================
-- 6. CREATE UPDATED_AT TRIGGER
-- ====================================================================

CREATE TRIGGER update_widget_configurations_updated_at
  BEFORE UPDATE ON public.widget_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ====================================================================
-- 7. CREATE CHANGE TRACKING FUNCTION
-- ====================================================================

CREATE OR REPLACE FUNCTION public.track_widget_config_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log significant configuration changes
  IF OLD.config IS DISTINCT FROM NEW.config THEN
    INSERT INTO public.widget_analytics (widget_id, event_type, metadata)
    VALUES (
      NEW.id, 
      'interaction',
      jsonb_build_object(
        'action', 'config_updated',
        'changed_by', auth.uid(),
        'change_timestamp', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER track_widget_config_change_trigger
  AFTER UPDATE ON public.widget_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.track_widget_config_change();

-- ====================================================================
-- 8. INSERT DEFAULT CONFIGURATIONS FOR EXISTING TENANTS
-- ====================================================================

-- Default Booking Widget Configurations
INSERT INTO public.widget_configurations (tenant_id, widget_type, config, is_active)
SELECT 
  t.id as tenant_id,
  'booking' as widget_type,
  jsonb_build_object(
    'theme', 'light',
    'primaryColor', '#3b82f6',
    'borderRadius', '8',
    'fontFamily', 'system',
    'showAvailability', true,
    'requirePhone', true,
    'enableNotifications', true,
    'maxAdvanceBooking', 30,
    'minBookingWindow', 2,
    'welcomeMessage', 'Welcome! Book your table with us.',
    'customFields', '[]'::jsonb
  ) as config,
  true as is_active
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.widget_configurations wc 
  WHERE wc.tenant_id = t.id AND wc.widget_type = 'booking'
)
ON CONFLICT (tenant_id, widget_type) DO NOTHING;

-- Default Catering Widget Configurations
INSERT INTO public.widget_configurations (tenant_id, widget_type, config, is_active)
SELECT 
  t.id as tenant_id,
  'catering' as widget_type,
  jsonb_build_object(
    'theme', 'light',
    'primaryColor', '#f97316',
    'borderRadius', '8',
    'fontFamily', 'system',
    'showMenuPreviews', true,
    'requireEventDetails', true,
    'enableQuickQuote', true,
    'minAdvanceNotice', 48,
    'maxGuestCount', 500,
    'welcomeMessage', 'Discover our catering services for your special event.',
    'eventTypes', '["corporate", "wedding", "private"]'::jsonb
  ) as config,
  true as is_active
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.widget_configurations wc 
  WHERE wc.tenant_id = t.id AND wc.widget_type = 'catering'
)
ON CONFLICT (tenant_id, widget_type) DO NOTHING;

-- ====================================================================
-- 9. ADD TABLE COMMENTS FOR DOCUMENTATION
-- ====================================================================

COMMENT ON TABLE public.widget_configurations IS 'Widget configurations for booking and catering widgets with real-time sync support';
COMMENT ON TABLE public.widget_analytics IS 'Real-time analytics events for widget interactions and conversions';
COMMENT ON COLUMN public.widget_configurations.config IS 'JSON configuration object containing all widget settings';
COMMENT ON COLUMN public.widget_analytics.event_type IS 'Type of analytics event: view, interaction, or conversion';

-- ====================================================================
-- 10. ENABLE REAL-TIME SUBSCRIPTIONS
-- ====================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.widget_configurations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.widget_analytics;

-- ====================================================================
-- MIGRATION COMPLETE!
-- ====================================================================
-- ✅ widget_configurations table created with tenant isolation
-- ✅ widget_analytics table created for real-time tracking
-- ✅ RLS policies applied for security
-- ✅ Performance indexes created
-- ✅ Change tracking triggers enabled
-- ✅ Default configurations inserted for all existing tenants
-- ✅ Real-time subscriptions enabled
-- 
-- 🎯 Your useWidgetManagement hooks are now ready to use!
-- 📍 Switch your test page from Mock Mode to Real Mode
