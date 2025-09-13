-- =============================================================================
-- Alert Rules and Notification System Migration
-- =============================================================================
-- This migration adds alert rules and notification tables to support
-- enterprise-grade monitoring and alerting for realtime connections.

-- 1. ALERT RULES TABLE
-- Configuration for monitoring thresholds and alerting rules
CREATE TABLE public.alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    subscription_type TEXT NOT NULL CHECK (subscription_type IN ('orders', 'menu_items', 'reservations', 'custom')),
    
    -- Rule identification
    rule_name TEXT NOT NULL,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT true,
    
    -- Threshold configuration
    metric_name TEXT NOT NULL CHECK (metric_name IN (
        'error_rate', 'response_time', 'connection_count', 'health_score',
        'memory_usage', 'cpu_usage', 'packet_loss', 'retry_rate'
    )),
    threshold_value DECIMAL(10,4) NOT NULL,
    threshold_operator TEXT NOT NULL CHECK (threshold_operator IN ('gt', 'lt', 'eq', 'gte', 'lte')),
    
    -- Alert configuration
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    cooldown_minutes INTEGER NOT NULL DEFAULT 15, -- Minimum time between alerts
    max_alerts_per_hour INTEGER NOT NULL DEFAULT 4,
    
    -- Notification channels
    notification_channels JSONB NOT NULL DEFAULT '["email"]', -- email, slack, webhook, sms
    notification_config JSONB DEFAULT '{}', -- Channel-specific configuration
    
    -- Conditions
    evaluation_window_minutes INTEGER NOT NULL DEFAULT 5, -- Time window for evaluation
    min_data_points INTEGER NOT NULL DEFAULT 3, -- Minimum data points required
    consecutive_breaches INTEGER NOT NULL DEFAULT 1, -- Consecutive breaches to trigger
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    tags JSONB DEFAULT '{}',
    custom_config JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure unique rule per tenant/subscription/metric
    UNIQUE(tenant_id, subscription_type, metric_name, rule_name)
);

-- 2. ALERT INSTANCES TABLE
-- Records of triggered alerts
CREATE TABLE public.alert_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    rule_id UUID NOT NULL REFERENCES public.alert_rules(id) ON DELETE CASCADE,
    subscription_type TEXT NOT NULL,
    
    -- Alert details
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL CHECK (status IN ('triggered', 'acknowledged', 'resolved', 'suppressed')) DEFAULT 'triggered',
    message TEXT NOT NULL,
    
    -- Threshold information
    metric_value DECIMAL(10,4),
    threshold_value DECIMAL(10,4),
    breach_percentage DECIMAL(5,2), -- How much over/under threshold
    
    -- Resolution tracking
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolution_note TEXT,
    
    -- Correlation and context
    correlation_id TEXT,
    connection_id TEXT,
    related_events JSONB DEFAULT '{}',
    context_data JSONB DEFAULT '{}',
    
    -- Notification tracking
    notifications_sent JSONB DEFAULT '{}', -- Track sent notifications by channel
    notification_attempts INTEGER NOT NULL DEFAULT 0,
    last_notification_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. NOTIFICATION HISTORY TABLE
-- Tracks all notification attempts and delivery status
CREATE TABLE public.notification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    alert_instance_id UUID REFERENCES public.alert_instances(id) ON DELETE CASCADE,
    
    -- Notification details
    channel_type TEXT NOT NULL CHECK (channel_type IN ('email', 'slack', 'webhook', 'sms', 'push')),
    recipient TEXT NOT NULL, -- Email, phone, webhook URL, etc.
    
    -- Message details
    subject TEXT,
    message_body TEXT,
    message_format TEXT CHECK (message_format IN ('text', 'html', 'json', 'markdown')),
    
    -- Delivery tracking
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'suppressed')) DEFAULT 'pending',
    attempt_count INTEGER NOT NULL DEFAULT 1,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    
    -- Timestamps
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    
    -- Error tracking
    error_message TEXT,
    error_code TEXT,
    retry_after TIMESTAMPTZ,
    
    -- External tracking
    external_id TEXT, -- Provider-specific message ID
    webhook_response JSONB,
    delivery_metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TENANT NOTIFICATION PREFERENCES TABLE
-- Stores notification preferences per tenant
CREATE TABLE public.tenant_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Global notification settings
    enabled BOOLEAN NOT NULL DEFAULT true,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    
    -- Channel preferences
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    email_addresses JSONB DEFAULT '[]', -- Array of email addresses
    email_format TEXT CHECK (email_format IN ('text', 'html')) DEFAULT 'html',
    
    slack_enabled BOOLEAN NOT NULL DEFAULT false,
    slack_webhook_url TEXT,
    slack_channel TEXT,
    slack_username TEXT DEFAULT 'Blunari Alerts',
    
    webhook_enabled BOOLEAN NOT NULL DEFAULT false,
    webhook_url TEXT,
    webhook_secret TEXT,
    webhook_timeout_seconds INTEGER DEFAULT 30,
    
    sms_enabled BOOLEAN NOT NULL DEFAULT false,
    sms_numbers JSONB DEFAULT '[]', -- Array of phone numbers
    
    -- Severity filtering
    min_severity TEXT CHECK (min_severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    severity_channels JSONB DEFAULT '{}', -- Map severity to preferred channels
    
    -- Rate limiting
    max_notifications_per_hour INTEGER DEFAULT 10,
    max_notifications_per_day INTEGER DEFAULT 50,
    batch_notifications BOOLEAN DEFAULT false,
    batch_interval_minutes INTEGER DEFAULT 30,
    
    -- Custom configuration
    custom_templates JSONB DEFAULT '{}',
    additional_context JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(tenant_id)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Alert rules indexes
CREATE INDEX idx_alert_rules_tenant_id ON public.alert_rules(tenant_id);
CREATE INDEX idx_alert_rules_enabled ON public.alert_rules(enabled);
CREATE INDEX idx_alert_rules_subscription_type ON public.alert_rules(subscription_type);
CREATE INDEX idx_alert_rules_metric_name ON public.alert_rules(metric_name);
CREATE INDEX idx_alert_rules_severity ON public.alert_rules(severity);

-- Alert instances indexes
CREATE INDEX idx_alert_instances_tenant_id ON public.alert_instances(tenant_id);
CREATE INDEX idx_alert_instances_rule_id ON public.alert_instances(rule_id);
CREATE INDEX idx_alert_instances_status ON public.alert_instances(status);
CREATE INDEX idx_alert_instances_severity ON public.alert_instances(severity);
CREATE INDEX idx_alert_instances_triggered_at ON public.alert_instances(triggered_at);
CREATE INDEX idx_alert_instances_correlation_id ON public.alert_instances(correlation_id);

-- Notification history indexes
CREATE INDEX idx_notification_history_tenant_id ON public.notification_history(tenant_id);
CREATE INDEX idx_notification_history_alert_instance_id ON public.notification_history(alert_instance_id);
CREATE INDEX idx_notification_history_status ON public.notification_history(status);
CREATE INDEX idx_notification_history_channel_type ON public.notification_history(channel_type);
CREATE INDEX idx_notification_history_scheduled_at ON public.notification_history(scheduled_at);

-- Tenant notification preferences indexes
CREATE INDEX idx_tenant_notification_preferences_tenant_id ON public.tenant_notification_preferences(tenant_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Alert rules policies
CREATE POLICY "Users can manage alert rules for their tenant" ON public.alert_rules
    FOR ALL USING (
        tenant_id = public.get_current_user_tenant_id()
    );

CREATE POLICY "Service role can manage all alert rules" ON public.alert_rules
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Alert instances policies
CREATE POLICY "Users can view alert instances for their tenant" ON public.alert_instances
    FOR SELECT USING (
        tenant_id = public.get_current_user_tenant_id()
    );

CREATE POLICY "Users can acknowledge alerts for their tenant" ON public.alert_instances
    FOR UPDATE USING (
        tenant_id = public.get_current_user_tenant_id()
    );

CREATE POLICY "Service role can manage all alert instances" ON public.alert_instances
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Notification history policies
CREATE POLICY "Users can view notification history for their tenant" ON public.notification_history
    FOR SELECT USING (
        tenant_id = public.get_current_user_tenant_id()
    );

CREATE POLICY "Service role can manage all notification history" ON public.notification_history
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Tenant notification preferences policies
CREATE POLICY "Users can manage notification preferences for their tenant" ON public.tenant_notification_preferences
    FOR ALL USING (
        tenant_id = public.get_current_user_tenant_id()
    );

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Update timestamp function (reuse existing)
CREATE TRIGGER update_alert_rules_updated_at 
    BEFORE UPDATE ON public.alert_rules 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alert_instances_updated_at 
    BEFORE UPDATE ON public.alert_instances 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_history_updated_at 
    BEFORE UPDATE ON public.notification_history 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_notification_preferences_updated_at 
    BEFORE UPDATE ON public.tenant_notification_preferences 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check alert cooldown
CREATE OR REPLACE FUNCTION public.check_alert_cooldown(
    p_tenant_id UUID,
    p_rule_id UUID,
    p_cooldown_minutes INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    last_alert_time TIMESTAMPTZ;
BEGIN
    SELECT MAX(triggered_at) INTO last_alert_time
    FROM public.alert_instances
    WHERE tenant_id = p_tenant_id AND rule_id = p_rule_id;
    
    IF last_alert_time IS NULL THEN
        RETURN true; -- No previous alerts
    END IF;
    
    RETURN (NOW() - last_alert_time) > (p_cooldown_minutes || ' minutes')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Function to get notification preferences
CREATE OR REPLACE FUNCTION public.get_notification_preferences(p_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE
    preferences JSONB;
BEGIN
    SELECT row_to_json(tnp)::JSONB INTO preferences
    FROM public.tenant_notification_preferences tnp
    WHERE tenant_id = p_tenant_id;
    
    IF preferences IS NULL THEN
        -- Return default preferences
        preferences := '{"enabled": true, "email_enabled": true, "min_severity": "medium", "max_notifications_per_hour": 10}';
    END IF;
    
    RETURN preferences;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- REALTIME PUBLICATION SETUP
-- =============================================================================

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_notification_preferences;

-- Enable replica identity
ALTER TABLE public.alert_rules REPLICA IDENTITY FULL;
ALTER TABLE public.alert_instances REPLICA IDENTITY FULL;
ALTER TABLE public.notification_history REPLICA IDENTITY FULL;
ALTER TABLE public.tenant_notification_preferences REPLICA IDENTITY FULL;

-- =============================================================================
-- DEFAULT DATA
-- =============================================================================

-- Insert default alert rules for existing tenants
INSERT INTO public.alert_rules (tenant_id, subscription_type, rule_name, description, metric_name, threshold_value, threshold_operator, severity, notification_channels)
SELECT DISTINCT 
    t.id as tenant_id,
    unnest(ARRAY['orders', 'menu_items', 'reservations']) as subscription_type,
    'High Error Rate' as rule_name,
    'Alert when error rate exceeds 10%' as description,
    'error_rate' as metric_name,
    0.10 as threshold_value,
    'gt' as threshold_operator,
    'high' as severity,
    '["email"]'::jsonb as notification_channels
FROM public.tenants t
ON CONFLICT (tenant_id, subscription_type, metric_name, rule_name) DO NOTHING;

INSERT INTO public.alert_rules (tenant_id, subscription_type, rule_name, description, metric_name, threshold_value, threshold_operator, severity, notification_channels)
SELECT DISTINCT 
    t.id as tenant_id,
    unnest(ARRAY['orders', 'menu_items', 'reservations']) as subscription_type,
    'Slow Response Time' as rule_name,
    'Alert when response time exceeds 2 seconds' as description,
    'response_time' as metric_name,
    2000 as threshold_value,
    'gt' as threshold_operator,
    'medium' as severity,
    '["email"]'::jsonb as notification_channels
FROM public.tenants t
ON CONFLICT (tenant_id, subscription_type, metric_name, rule_name) DO NOTHING;

-- Insert default notification preferences for existing tenants
INSERT INTO public.tenant_notification_preferences (tenant_id, enabled, email_enabled, min_severity)
SELECT 
    t.id as tenant_id,
    true as enabled,
    true as email_enabled,
    'medium' as min_severity
FROM public.tenants t
ON CONFLICT (tenant_id) DO NOTHING;

-- =============================================================================
-- HELPFUL VIEWS
-- =============================================================================

-- View for active alerts with rule details
CREATE OR REPLACE VIEW public.active_alerts AS
SELECT 
    ai.id,
    ai.tenant_id,
    ai.subscription_type,
    ar.rule_name,
    ar.description,
    ai.severity,
    ai.message,
    ai.metric_value,
    ai.threshold_value,
    ai.triggered_at,
    ai.status,
    ar.notification_channels,
    ROW_NUMBER() OVER (PARTITION BY ai.tenant_id ORDER BY ai.triggered_at DESC) as alert_rank
FROM public.alert_instances ai
JOIN public.alert_rules ar ON ai.rule_id = ar.id
WHERE ai.status IN ('triggered', 'acknowledged')
ORDER BY ai.triggered_at DESC;

-- View for notification summary
CREATE OR REPLACE VIEW public.notification_summary AS
SELECT 
    nh.tenant_id,
    nh.channel_type,
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (WHERE nh.status = 'delivered') as delivered_count,
    COUNT(*) FILTER (WHERE nh.status = 'failed') as failed_count,
    MAX(nh.created_at) as last_notification,
    AVG(EXTRACT(EPOCH FROM (nh.delivered_at - nh.sent_at))) as avg_delivery_time_seconds
FROM public.notification_history nh
WHERE nh.created_at >= NOW() - INTERVAL '30 days'
GROUP BY nh.tenant_id, nh.channel_type;

-- Add helpful comments
COMMENT ON TABLE public.alert_rules IS 'Configuration for monitoring alert rules and thresholds';
COMMENT ON TABLE public.alert_instances IS 'Records of triggered alerts with resolution tracking';
COMMENT ON TABLE public.notification_history IS 'Audit trail of notification delivery attempts';
COMMENT ON TABLE public.tenant_notification_preferences IS 'Per-tenant notification channel and delivery preferences';

COMMENT ON FUNCTION public.check_alert_cooldown IS 'Checks if enough time has passed since last alert to prevent spam';
COMMENT ON FUNCTION public.get_notification_preferences IS 'Retrieves notification preferences for a tenant with fallback to defaults';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Alert rules and notification system migration completed successfully';
    RAISE NOTICE 'Created tables: alert_rules, alert_instances, notification_history, tenant_notification_preferences';
    RAISE NOTICE 'Added RLS policies, indexes, triggers, views, and default data';
    RAISE NOTICE 'Notification system ready for enterprise-grade alerting';
END;
$$;