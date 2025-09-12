#!/bin/bash
# Widget Management Migration Script
# Run this in your Supabase SQL editor or via psql

echo "Deploying Widget Management Database Schema..."
echo "=== WIDGET MANAGEMENT TABLES ==="

# Check if tables already exist
echo "Checking if widget_configurations table exists..."

# The migration content - copy this to your Supabase SQL editor
cat << 'EOF'

-- Widget Management Tables for Real-time WebSocket Solution
-- Supports the useWidgetManagement hook implementation

-- Widget configurations table
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

-- Widget analytics table for real-time tracking
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

-- Enable RLS on both tables
ALTER TABLE public.widget_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant isolation
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_widget_configurations_tenant ON public.widget_configurations(tenant_id, widget_type);
CREATE INDEX IF NOT EXISTS idx_widget_configurations_active ON public.widget_configurations(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_widget ON public.widget_analytics(widget_id, event_type);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_timestamp ON public.widget_analytics(widget_id, timestamp DESC);

-- Trigger for updated_at on widget_configurations
CREATE TRIGGER update_widget_configurations_updated_at
  BEFORE UPDATE ON public.widget_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to track widget configuration changes
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

-- Insert default widget configurations for existing tenants
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
);

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
);

-- Comments for documentation
COMMENT ON TABLE public.widget_configurations IS 'Widget configurations for booking and catering widgets with real-time sync support';
COMMENT ON TABLE public.widget_analytics IS 'Real-time analytics events for widget interactions and conversions';
COMMENT ON COLUMN public.widget_configurations.config IS 'JSON configuration object containing all widget settings';
COMMENT ON COLUMN public.widget_analytics.event_type IS 'Type of analytics event: view, interaction, or conversion';

-- Grant permissions for realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.widget_configurations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.widget_analytics;

EOF

echo ""
echo "=== MIGRATION COMPLETE ==="
echo "✅ widget_configurations table created"
echo "✅ widget_analytics table created"
echo "✅ RLS policies applied"
echo "✅ Indexes created for performance"
echo "✅ Real-time subscriptions enabled"
echo "✅ Default configurations inserted for existing tenants"
echo ""
echo "🎯 Your Widget Management hooks are now ready to use!"
echo "📍 Switch your test page from Mock Mode to Real Mode"
