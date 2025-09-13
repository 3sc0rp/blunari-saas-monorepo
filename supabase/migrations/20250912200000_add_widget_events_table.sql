-- Create widget_events table for real-time analytics
CREATE TABLE widget_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_id TEXT NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('view', 'interaction', 'conversion', 'error', 'performance')),
    event_data JSONB NOT NULL DEFAULT '{}',
    user_session TEXT NOT NULL,
    page_url TEXT,
    user_agent TEXT,
    performance_metrics JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX idx_widget_events_widget_id ON widget_events(widget_id);
CREATE INDEX idx_widget_events_tenant_id ON widget_events(tenant_id);
CREATE INDEX idx_widget_events_event_type ON widget_events(event_type);
CREATE INDEX idx_widget_events_created_at ON widget_events(created_at);
CREATE INDEX idx_widget_events_user_session ON widget_events(user_session);

-- Composite indexes for common queries
CREATE INDEX idx_widget_events_tenant_widget_time ON widget_events(tenant_id, widget_id, created_at);
CREATE INDEX idx_widget_events_tenant_type_time ON widget_events(tenant_id, event_type, created_at);

-- Add RLS policies for security
ALTER TABLE widget_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access events for their tenant
CREATE POLICY "Users can view widget events for their tenant" ON widget_events
    FOR SELECT USING (
        tenant_id IN (
            SELECT t.id FROM tenants t 
            WHERE t.id = (auth.jwt() ->> 'tenant_id')::uuid
        )
    );

-- Policy: Service role can manage all events (for Edge Functions)
CREATE POLICY "Service role can manage all widget events" ON widget_events
    FOR ALL USING (auth.role() = 'service_role');

-- Create a function to clean up old events (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_widget_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM widget_events 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Create a scheduled job to clean up old events daily
-- Note: This requires the pg_cron extension
-- SELECT cron.schedule('cleanup-widget-events', '0 2 * * *', 'SELECT cleanup_old_widget_events();');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON widget_events TO anon, authenticated;
GRANT ALL ON widget_events TO service_role;