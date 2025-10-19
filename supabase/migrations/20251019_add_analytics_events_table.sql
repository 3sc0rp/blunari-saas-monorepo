-- Migration: Add analytics_events table for server-side event tracking
-- Purpose: Store catering widget analytics events server-side to bypass ad blockers
-- Date: 2025-10-19

-- Drop table if it exists (to fix any previous failed attempts)
DROP TABLE IF EXISTS public.analytics_events CASCADE;

-- Create analytics_events table
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL CHECK (event_name IN (
    'catering_widget_viewed',
    'catering_package_viewed',
    'catering_package_selected',
    'catering_step_completed',
    'catering_field_focused',
    'catering_field_completed',
    'catering_field_error',
    'catering_validation_error',
    'catering_draft_saved',
    'catering_draft_restored',
    'catering_order_submitted',
    'catering_order_failed',
    'catering_form_abandoned'
  )),
  event_data JSONB DEFAULT '{}'::jsonb,
  session_id TEXT,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant_id ON public.analytics_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON public.analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON public.analytics_events(session_id);

-- Enable Row Level Security
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role can insert (for Edge Function)
CREATE POLICY "Service role can insert analytics events"
  ON public.analytics_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- RLS Policy: Tenants can view their own analytics
CREATE POLICY "Tenants can view own analytics"
  ON public.analytics_events
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.auto_provisioning 
      WHERE user_id = auth.uid() 
      AND status = 'completed'
    )
  );

-- RLS Policy: Admins can view all analytics
CREATE POLICY "Admins can view all analytics"
  ON public.analytics_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM public.employees 
      WHERE user_id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- Create function to clean up old analytics (retention policy)
CREATE OR REPLACE FUNCTION public.cleanup_old_analytics_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete events older than 90 days
  DELETE FROM public.analytics_events
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Comment on table
COMMENT ON TABLE public.analytics_events IS 'Server-side storage for catering widget analytics events. Bypasses ad blockers and provides reliable tracking.';
