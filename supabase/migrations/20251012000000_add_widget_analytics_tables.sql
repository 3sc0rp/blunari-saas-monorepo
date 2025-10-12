-- Alter widget_events table to add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add widget_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='widget_events' AND column_name='widget_type'
  ) THEN
    ALTER TABLE widget_events ADD COLUMN widget_type TEXT CHECK (widget_type IN ('booking', 'catering'));
  END IF;

  -- Add event_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='widget_events' AND column_name='event_type'
  ) THEN
    ALTER TABLE widget_events ADD COLUMN event_type TEXT CHECK (event_type IN ('view', 'click', 'submit', 'error'));
  END IF;

  -- Add session_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='widget_events' AND column_name='session_id'
  ) THEN
    ALTER TABLE widget_events ADD COLUMN session_id TEXT;
  END IF;

  -- Add session_duration column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='widget_events' AND column_name='session_duration'
  ) THEN
    ALTER TABLE widget_events ADD COLUMN session_duration INTEGER;
  END IF;

  -- Add source column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='widget_events' AND column_name='source'
  ) THEN
    ALTER TABLE widget_events ADD COLUMN source TEXT;
  END IF;

  -- Add metadata column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='widget_events' AND column_name='metadata'
  ) THEN
    ALTER TABLE widget_events ADD COLUMN metadata JSONB;
  END IF;
END $$;

-- Create widget_analytics_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS widget_analytics_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL CHECK (widget_type IN ('booking', 'catering')),
  time_range TEXT NOT NULL CHECK (time_range IN ('1d', '7d', '30d')),
  auth_method TEXT NOT NULL CHECK (auth_method IN ('anonymous', 'authenticated')),
  duration_ms INTEGER NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  error_code TEXT,
  request_origin TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_widget_analytics_logs_tenant_id ON widget_analytics_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_logs_created_at ON widget_analytics_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_logs_correlation_id ON widget_analytics_logs(correlation_id);

CREATE INDEX IF NOT EXISTS idx_widget_events_tenant_id ON widget_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_widget_events_widget_type ON widget_events(widget_type);
CREATE INDEX IF NOT EXISTS idx_widget_events_event_type ON widget_events(event_type);
CREATE INDEX IF NOT EXISTS idx_widget_events_created_at ON widget_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_widget_events_session_id ON widget_events(session_id) WHERE session_id IS NOT NULL;

-- Enable RLS
ALTER TABLE widget_analytics_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for widget_analytics_logs
-- Service role can do everything (for Edge Function)
CREATE POLICY "Service role full access on widget_analytics_logs"
  ON widget_analytics_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Tenant admins can view their own logs
CREATE POLICY "Tenant admins can view their analytics logs"
  ON widget_analytics_logs
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM employees 
      WHERE user_id = auth.uid() 
      AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- RLS Policies for widget_events
-- Service role can do everything (for Edge Function and widget)
CREATE POLICY "Service role full access on widget_events"
  ON widget_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Anonymous users can insert widget events (for tracking)
CREATE POLICY "Anyone can insert widget events"
  ON widget_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Tenant admins can view their own widget events
CREATE POLICY "Tenant admins can view their widget events"
  ON widget_events
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM employees 
      WHERE user_id = auth.uid() 
      AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- Add comment
COMMENT ON TABLE widget_analytics_logs IS 'Logs all widget analytics API requests for debugging and monitoring';
COMMENT ON TABLE widget_events IS 'Tracks widget interaction events (views, clicks, submissions) for analytics';
