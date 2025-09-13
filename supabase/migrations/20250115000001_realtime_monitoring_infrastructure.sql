-- =============================================================================
-- Realtime Monitoring Infrastructure Migration
-- =============================================================================
-- This migration creates the database infrastructure needed to support
-- enterprise-grade realtime subscription monitoring, health status tracking,
-- and batch processing for the advanced useRealtimeSubscription hook.

-- 1. REALTIME CONNECTION METRICS TABLE
-- Stores detailed metrics about individual realtime connections
CREATE TABLE public.realtime_connection_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    connection_id TEXT NOT NULL, -- Client-generated connection identifier
    channel_name TEXT NOT NULL, -- Supabase realtime channel name
    subscription_type TEXT NOT NULL CHECK (subscription_type IN ('orders', 'menu_items', 'reservations', 'custom')),
    
    -- Connection lifecycle events
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    disconnected_at TIMESTAMPTZ,
    last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Performance metrics
    total_messages_received INTEGER NOT NULL DEFAULT 0,
    total_messages_sent INTEGER NOT NULL DEFAULT 0,
    avg_response_time_ms DECIMAL(10,2) DEFAULT 0,
    max_response_time_ms INTEGER DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    retry_count INTEGER NOT NULL DEFAULT 0,
    
    -- Connection quality metrics
    connection_quality TEXT CHECK (connection_quality IN ('excellent', 'good', 'poor', 'critical')) DEFAULT 'good',
    bandwidth_usage_kb DECIMAL(10,2) DEFAULT 0,
    packet_loss_rate DECIMAL(5,4) DEFAULT 0, -- Percentage as decimal (0.0001 = 0.01%)
    
    -- Metadata
    client_info JSONB DEFAULT '{}', -- Browser, OS, device info
    connection_meta JSONB DEFAULT '{}', -- Additional connection metadata
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. REALTIME HEALTH STATUS TABLE  
-- Tracks overall health status of realtime subscriptions by tenant
CREATE TABLE public.realtime_health_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    subscription_type TEXT NOT NULL CHECK (subscription_type IN ('orders', 'menu_items', 'reservations', 'custom')),
    
    -- Health metrics
    status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'offline')) DEFAULT 'healthy',
    active_connections INTEGER NOT NULL DEFAULT 0,
    failed_connections INTEGER NOT NULL DEFAULT 0,
    avg_connection_duration_minutes DECIMAL(10,2) DEFAULT 0,
    
    -- Performance indicators
    success_rate DECIMAL(5,4) NOT NULL DEFAULT 1.0000, -- Percentage as decimal
    avg_latency_ms DECIMAL(8,2) DEFAULT 0,
    error_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
    
    -- Resource utilization
    memory_usage_mb DECIMAL(8,2) DEFAULT 0,
    cpu_usage_percent DECIMAL(5,2) DEFAULT 0,
    network_usage_kb DECIMAL(10,2) DEFAULT 0,
    
    -- Status tracking
    last_health_check_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    healthy_since TIMESTAMPTZ DEFAULT NOW(),
    last_incident_at TIMESTAMPTZ,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    health_details JSONB DEFAULT '{}', -- Detailed health information
    alert_thresholds JSONB DEFAULT '{}', -- Custom alert thresholds
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one health status per tenant per subscription type
    UNIQUE(tenant_id, subscription_type)
);

-- 3. BATCH PROCESSING LOGS TABLE
-- Tracks batch operations for efficient data processing
CREATE TABLE public.batch_processing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    batch_id TEXT NOT NULL, -- Client-generated batch identifier
    operation_type TEXT NOT NULL CHECK (operation_type IN ('subscribe', 'unsubscribe', 'bulk_update', 'sync', 'cleanup')),
    
    -- Batch details
    item_count INTEGER NOT NULL DEFAULT 0,
    processed_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    
    -- Performance metrics
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    processing_time_ms INTEGER,
    
    -- Status tracking
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
    progress_percent DECIMAL(5,2) DEFAULT 0.00,
    
    -- Error handling
    error_details JSONB DEFAULT '{}', -- Error information for failed items
    retry_attempts INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    
    -- Metadata
    batch_data JSONB DEFAULT '{}', -- Batch configuration and data
    client_info JSONB DEFAULT '{}', -- Client that initiated the batch
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. REALTIME SUBSCRIPTION EVENTS TABLE
-- Detailed event log for debugging and analytics
CREATE TABLE public.realtime_subscription_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    connection_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'connection_opened', 'connection_closed', 'subscription_started', 
        'subscription_ended', 'message_received', 'message_sent', 
        'error_occurred', 'retry_attempted', 'heartbeat', 'reconnection'
    )),
    
    -- Event details
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    channel_name TEXT,
    message_data JSONB DEFAULT '{}',
    error_message TEXT,
    response_time_ms INTEGER,
    
    -- Context
    subscription_type TEXT,
    client_version TEXT,
    session_id TEXT,
    
    -- Metadata
    event_meta JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Realtime connection metrics indexes
CREATE INDEX idx_realtime_connection_metrics_tenant_id ON public.realtime_connection_metrics(tenant_id);
CREATE INDEX idx_realtime_connection_metrics_connection_id ON public.realtime_connection_metrics(connection_id);
CREATE INDEX idx_realtime_connection_metrics_channel ON public.realtime_connection_metrics(channel_name);
CREATE INDEX idx_realtime_connection_metrics_connected_at ON public.realtime_connection_metrics(connected_at);
CREATE INDEX idx_realtime_connection_metrics_last_heartbeat ON public.realtime_connection_metrics(last_heartbeat_at);
CREATE INDEX idx_realtime_connection_metrics_subscription_type ON public.realtime_connection_metrics(subscription_type);

-- Realtime health status indexes
CREATE INDEX idx_realtime_health_status_tenant_id ON public.realtime_health_status(tenant_id);
CREATE INDEX idx_realtime_health_status_status ON public.realtime_health_status(status);
CREATE INDEX idx_realtime_health_status_last_check ON public.realtime_health_status(last_health_check_at);
CREATE INDEX idx_realtime_health_status_subscription_type ON public.realtime_health_status(subscription_type);

-- Batch processing logs indexes
CREATE INDEX idx_batch_processing_logs_tenant_id ON public.batch_processing_logs(tenant_id);
CREATE INDEX idx_batch_processing_logs_batch_id ON public.batch_processing_logs(batch_id);
CREATE INDEX idx_batch_processing_logs_status ON public.batch_processing_logs(status);
CREATE INDEX idx_batch_processing_logs_started_at ON public.batch_processing_logs(started_at);
CREATE INDEX idx_batch_processing_logs_operation_type ON public.batch_processing_logs(operation_type);

-- Realtime subscription events indexes
CREATE INDEX idx_realtime_subscription_events_tenant_id ON public.realtime_subscription_events(tenant_id);
CREATE INDEX idx_realtime_subscription_events_connection_id ON public.realtime_subscription_events(connection_id);
CREATE INDEX idx_realtime_subscription_events_event_type ON public.realtime_subscription_events(event_type);
CREATE INDEX idx_realtime_subscription_events_timestamp ON public.realtime_subscription_events(event_timestamp);
CREATE INDEX idx_realtime_subscription_events_channel ON public.realtime_subscription_events(channel_name);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.realtime_connection_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtime_health_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_processing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtime_subscription_events ENABLE ROW LEVEL SECURITY;

-- Realtime connection metrics policies
CREATE POLICY "Users can view their tenant's realtime connection metrics" ON public.realtime_connection_metrics
    FOR SELECT USING (
        tenant_id = public.get_current_user_tenant_id()
    );

CREATE POLICY "Users can insert realtime connection metrics for their tenant" ON public.realtime_connection_metrics
    FOR INSERT WITH CHECK (
        tenant_id = public.get_current_user_tenant_id()
    );

CREATE POLICY "Users can update their tenant's realtime connection metrics" ON public.realtime_connection_metrics
    FOR UPDATE USING (
        tenant_id = public.get_current_user_tenant_id()
    );

-- Realtime health status policies
CREATE POLICY "Users can view their tenant's realtime health status" ON public.realtime_health_status
    FOR SELECT USING (
        tenant_id = public.get_current_user_tenant_id()
    );

CREATE POLICY "Service role can manage realtime health status" ON public.realtime_health_status
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Batch processing logs policies  
CREATE POLICY "Users can view their tenant's batch processing logs" ON public.batch_processing_logs
    FOR SELECT USING (
        tenant_id = public.get_current_user_tenant_id()
    );

CREATE POLICY "Users can insert batch processing logs for their tenant" ON public.batch_processing_logs
    FOR INSERT WITH CHECK (
        tenant_id = public.get_current_user_tenant_id()
    );

CREATE POLICY "Users can update their tenant's batch processing logs" ON public.batch_processing_logs
    FOR UPDATE USING (
        tenant_id = public.get_current_user_tenant_id()
    );

-- Realtime subscription events policies
CREATE POLICY "Users can view their tenant's realtime subscription events" ON public.realtime_subscription_events
    FOR SELECT USING (
        tenant_id = public.get_current_user_tenant_id()
    );

CREATE POLICY "Service role can manage realtime subscription events" ON public.realtime_subscription_events
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to update timestamps automatically
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
CREATE TRIGGER update_realtime_connection_metrics_updated_at 
    BEFORE UPDATE ON public.realtime_connection_metrics 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_realtime_health_status_updated_at 
    BEFORE UPDATE ON public.realtime_health_status 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_batch_processing_logs_updated_at 
    BEFORE UPDATE ON public.batch_processing_logs 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate connection duration on disconnect
CREATE OR REPLACE FUNCTION public.calculate_connection_duration()
RETURNS TRIGGER AS $$
BEGIN
    -- Only calculate duration when disconnected_at is set
    IF NEW.disconnected_at IS NOT NULL AND OLD.disconnected_at IS NULL THEN
        -- Update health status metrics
        UPDATE public.realtime_health_status 
        SET 
            avg_connection_duration_minutes = (
                SELECT AVG(EXTRACT(EPOCH FROM (disconnected_at - connected_at)) / 60)
                FROM public.realtime_connection_metrics 
                WHERE tenant_id = NEW.tenant_id 
                  AND subscription_type = NEW.subscription_type
                  AND disconnected_at IS NOT NULL
            ),
            updated_at = NOW()
        WHERE tenant_id = NEW.tenant_id AND subscription_type = NEW.subscription_type;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_connection_duration_trigger
    AFTER UPDATE ON public.realtime_connection_metrics
    FOR EACH ROW EXECUTE FUNCTION public.calculate_connection_duration();

-- Function to update health status based on connection metrics
CREATE OR REPLACE FUNCTION public.update_health_status_from_metrics()
RETURNS TRIGGER AS $$
DECLARE
    health_record RECORD;
    new_status TEXT;
    error_rate_threshold DECIMAL := 0.1; -- 10% error rate threshold
    connection_threshold INTEGER := 5; -- Minimum connections for health assessment
BEGIN
    -- Get current health status for this tenant and subscription type
    SELECT * INTO health_record 
    FROM public.realtime_health_status 
    WHERE tenant_id = NEW.tenant_id AND subscription_type = NEW.subscription_type;
    
    -- If no health record exists, create one
    IF health_record IS NULL THEN
        INSERT INTO public.realtime_health_status (
            tenant_id, subscription_type, status, active_connections
        ) VALUES (
            NEW.tenant_id, NEW.subscription_type, 'healthy', 1
        );
        RETURN NEW;
    END IF;
    
    -- Calculate current metrics
    WITH metrics AS (
        SELECT 
            COUNT(*) as total_connections,
            COUNT(*) FILTER (WHERE disconnected_at IS NULL) as active_connections,
            AVG(error_count::DECIMAL / GREATEST(total_messages_received, 1)) as avg_error_rate,
            AVG(avg_response_time_ms) as avg_latency
        FROM public.realtime_connection_metrics 
        WHERE tenant_id = NEW.tenant_id 
          AND subscription_type = NEW.subscription_type
          AND connected_at >= NOW() - INTERVAL '1 hour'
    )
    UPDATE public.realtime_health_status 
    SET 
        active_connections = metrics.active_connections,
        error_rate = COALESCE(metrics.avg_error_rate, 0),
        avg_latency_ms = COALESCE(metrics.avg_latency, 0),
        last_health_check_at = NOW(),
        updated_at = NOW()
    FROM metrics
    WHERE tenant_id = NEW.tenant_id AND subscription_type = NEW.subscription_type;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_health_status_from_metrics_trigger
    AFTER INSERT OR UPDATE ON public.realtime_connection_metrics
    FOR EACH ROW EXECUTE FUNCTION public.update_health_status_from_metrics();

-- =============================================================================
-- REALTIME PUBLICATION SETUP
-- =============================================================================

-- Add new tables to realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_connection_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_health_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.batch_processing_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_subscription_events;

-- Enable replica identity for realtime
ALTER TABLE public.realtime_connection_metrics REPLICA IDENTITY FULL;
ALTER TABLE public.realtime_health_status REPLICA IDENTITY FULL;
ALTER TABLE public.batch_processing_logs REPLICA IDENTITY FULL;
ALTER TABLE public.realtime_subscription_events REPLICA IDENTITY FULL;

-- =============================================================================
-- DATA CLEANUP FUNCTIONS
-- =============================================================================

-- Function to clean up old connection metrics (retain 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_realtime_metrics()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.realtime_connection_metrics 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    DELETE FROM public.realtime_subscription_events 
    WHERE created_at < NOW() - INTERVAL '7 days';
    
    DELETE FROM public.batch_processing_logs 
    WHERE created_at < NOW() - INTERVAL '30 days' 
      AND status IN ('completed', 'failed', 'cancelled');
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- INITIAL DATA AND VALIDATION
-- =============================================================================

-- Create initial health status records for existing tenants
INSERT INTO public.realtime_health_status (tenant_id, subscription_type, status)
SELECT DISTINCT 
    t.id as tenant_id,
    unnest(ARRAY['orders', 'menu_items', 'reservations']) as subscription_type,
    'healthy' as status
FROM public.tenants t
ON CONFLICT (tenant_id, subscription_type) DO NOTHING;

-- Add helpful comments
COMMENT ON TABLE public.realtime_connection_metrics IS 'Stores detailed metrics for individual realtime connections including performance and quality metrics';
COMMENT ON TABLE public.realtime_health_status IS 'Tracks overall health status of realtime subscriptions by tenant and subscription type';
COMMENT ON TABLE public.batch_processing_logs IS 'Logs batch operations for efficient processing of multiple realtime operations';
COMMENT ON TABLE public.realtime_subscription_events IS 'Detailed event log for realtime subscription debugging and analytics';

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Realtime monitoring infrastructure migration completed successfully';
    RAISE NOTICE 'Created tables: realtime_connection_metrics, realtime_health_status, batch_processing_logs, realtime_subscription_events';
    RAISE NOTICE 'Added RLS policies, indexes, triggers, and realtime publication setup';
    RAISE NOTICE 'Initial health status records created for existing tenants';
END;
$$;