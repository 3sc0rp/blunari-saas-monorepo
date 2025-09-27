-- Create monitoring tables for observability dashboard

-- System health metrics table
CREATE TABLE public.system_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL, -- uptime, response_time, error_rate, throughput
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT NOT NULL, -- ms, percentage, count, etc.
  service_name TEXT NOT NULL, -- api, database, auth, functions
  endpoint TEXT, -- specific endpoint or service component
  status_code INTEGER, -- HTTP status code if applicable
  severity TEXT NOT NULL DEFAULT 'info', -- info, warning, error, critical
  metadata JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Database performance metrics table  
CREATE TABLE public.database_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL, -- query_time, connection_count, locks, cache_hit_ratio
  metric_value NUMERIC NOT NULL,
  query_fingerprint TEXT, -- normalized query for performance tracking
  table_name TEXT,
  index_name TEXT,
  connection_pool_size INTEGER,
  active_connections INTEGER,
  waiting_connections INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Error logs table with severity tracking
CREATE TABLE public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL, -- application, database, auth, payment
  severity TEXT NOT NULL, -- low, medium, high, critical
  message TEXT NOT NULL,
  stack_trace TEXT,
  request_id TEXT,
  user_id UUID,
  tenant_id UUID,
  endpoint TEXT,
  method TEXT,
  status_code INTEGER,
  response_time_ms INTEGER,
  user_agent TEXT,
  ip_address INET,
  metadata JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance trends table for historical analysis
CREATE TABLE public.performance_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_category TEXT NOT NULL, -- application, database, infrastructure, business
  metric_name TEXT NOT NULL,
  aggregation_period TEXT NOT NULL, -- minute, hour, day, week, month
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  min_value NUMERIC,
  max_value NUMERIC,
  avg_value NUMERIC,
  sum_value NUMERIC,
  count_value BIGINT,
  percentile_50 NUMERIC,
  percentile_95 NUMERIC,
  percentile_99 NUMERIC,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Alerts configuration table
CREATE TABLE public.alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL UNIQUE,
  description TEXT,
  metric_name TEXT NOT NULL,
  threshold_value NUMERIC NOT NULL,
  threshold_operator TEXT NOT NULL, -- gt, lt, eq, gte, lte
  severity TEXT NOT NULL, -- low, medium, high, critical
  enabled BOOLEAN DEFAULT true,
  notification_channels JSONB DEFAULT '[]'::jsonb, -- email, slack, webhook
  cooldown_minutes INTEGER DEFAULT 15,
  conditions JSONB DEFAULT '{}'::jsonb, -- additional conditions
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Alert instances table
CREATE TABLE public.alert_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.alert_rules(id) ON DELETE CASCADE,
  metric_value NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, acknowledged, resolved
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  fired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Business metrics table for KPI tracking
CREATE TABLE public.business_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL, -- booking_success_rate, payment_success_rate, user_activity
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Request traces table for debugging
CREATE TABLE public.request_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id TEXT NOT NULL UNIQUE,
  parent_span_id TEXT,
  span_id TEXT NOT NULL,
  operation_name TEXT NOT NULL,
  service_name TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_ms INTEGER,
  status TEXT NOT NULL, -- success, error, timeout
  http_method TEXT,
  http_url TEXT,
  http_status_code INTEGER,
  user_id UUID,
  tenant_id UUID,
  tags JSONB DEFAULT '{}'::jsonb,
  logs JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all monitoring tables
ALTER TABLE public.system_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.database_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_traces ENABLE ROW LEVEL SECURITY;

-- RLS Policies for observability data (admin access only)
CREATE POLICY "Admins can view all system metrics" ON public.system_health_metrics
  FOR SELECT
  USING (has_employee_role('SUPPORT'));

CREATE POLICY "System can insert health metrics" ON public.system_health_metrics
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view database metrics" ON public.database_metrics
  FOR SELECT
  USING (has_employee_role('SUPPORT'));

CREATE POLICY "System can insert database metrics" ON public.database_metrics
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view error logs" ON public.error_logs
  FOR SELECT
  USING (has_employee_role('SUPPORT'));

CREATE POLICY "Admins can update error logs" ON public.error_logs
  FOR UPDATE
  USING (has_employee_role('SUPPORT'));

CREATE POLICY "System can insert error logs" ON public.error_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view performance trends" ON public.performance_trends
  FOR SELECT
  USING (has_employee_role('SUPPORT'));

CREATE POLICY "System can manage performance trends" ON public.performance_trends
  FOR ALL
  USING (true);

CREATE POLICY "Admins can manage alert rules" ON public.alert_rules
  FOR ALL
  USING (has_employee_role('ADMIN'));

CREATE POLICY "Admins can view alert instances" ON public.alert_instances
  FOR SELECT
  USING (has_employee_role('SUPPORT'));

CREATE POLICY "Admins can update alert instances" ON public.alert_instances
  FOR UPDATE
  USING (has_employee_role('SUPPORT'));

CREATE POLICY "System can insert alert instances" ON public.alert_instances
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own tenant business metrics" ON public.business_metrics
  FOR SELECT
  USING (user_has_tenant_access(tenant_id) OR has_employee_role('SUPPORT'));

CREATE POLICY "System can manage business metrics" ON public.business_metrics
  FOR ALL
  USING (true);

CREATE POLICY "Admins can view request traces" ON public.request_traces
  FOR SELECT
  USING (has_employee_role('SUPPORT'));

CREATE POLICY "System can insert request traces" ON public.request_traces
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_system_health_metrics_name_time ON public.system_health_metrics(metric_name, recorded_at DESC);
CREATE INDEX idx_system_health_metrics_service ON public.system_health_metrics(service_name, recorded_at DESC);
CREATE INDEX idx_database_metrics_name_time ON public.database_metrics(metric_name, recorded_at DESC);
CREATE INDEX idx_error_logs_severity_time ON public.error_logs(severity, occurred_at DESC);
CREATE INDEX idx_error_logs_resolved ON public.error_logs(resolved, occurred_at DESC) WHERE NOT resolved;
CREATE INDEX idx_performance_trends_category_period ON public.performance_trends(metric_category, aggregation_period, period_start DESC);
CREATE INDEX idx_alert_instances_status ON public.alert_instances(status, fired_at DESC) WHERE status = 'active';
CREATE INDEX idx_business_metrics_tenant_time ON public.business_metrics(tenant_id, metric_name, created_at DESC);
CREATE INDEX idx_request_traces_trace_id ON public.request_traces(trace_id);
CREATE INDEX idx_request_traces_time ON public.request_traces(start_time DESC);

-- Create triggers for updated_at columns
CREATE TRIGGER update_alert_rules_updated_at
  BEFORE UPDATE ON public.alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create functions for monitoring and alerting
CREATE OR REPLACE FUNCTION public.record_system_metric(
  p_metric_name TEXT,
  p_metric_value NUMERIC,
  p_metric_unit TEXT,
  p_service_name TEXT,
  p_endpoint TEXT DEFAULT NULL,
  p_status_code INTEGER DEFAULT NULL,
  p_severity TEXT DEFAULT 'info',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  metric_id UUID;
BEGIN
  INSERT INTO public.system_health_metrics (
    metric_name, metric_value, metric_unit, service_name, 
    endpoint, status_code, severity, metadata
  ) VALUES (
    p_metric_name, p_metric_value, p_metric_unit, p_service_name,
    p_endpoint, p_status_code, p_severity, p_metadata
  ) RETURNING id INTO metric_id;
  
  -- Check for alert conditions
  PERFORM public.check_alert_conditions(p_metric_name, p_metric_value);
  
  RETURN metric_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_alert_conditions(
  p_metric_name TEXT,
  p_metric_value NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rule_record RECORD;
  should_alert BOOLEAN;
BEGIN
  -- Check each active alert rule for this metric
  FOR rule_record IN 
    SELECT * FROM public.alert_rules 
    WHERE metric_name = p_metric_name AND enabled = true
  LOOP
    should_alert := false;
    
    -- Evaluate threshold condition
    CASE rule_record.threshold_operator
      WHEN 'gt' THEN
        should_alert := p_metric_value > rule_record.threshold_value;
      WHEN 'gte' THEN
        should_alert := p_metric_value >= rule_record.threshold_value;
      WHEN 'lt' THEN
        should_alert := p_metric_value < rule_record.threshold_value;
      WHEN 'lte' THEN
        should_alert := p_metric_value <= rule_record.threshold_value;
      WHEN 'eq' THEN
        should_alert := p_metric_value = rule_record.threshold_value;
    END CASE;
    
    -- Create alert instance if condition is met and not in cooldown
    IF should_alert THEN
      -- Check cooldown period
      IF NOT EXISTS (
        SELECT 1 FROM public.alert_instances 
        WHERE rule_id = rule_record.id 
        AND status = 'active'
        AND fired_at > now() - INTERVAL '1 minute' * rule_record.cooldown_minutes
      ) THEN
        INSERT INTO public.alert_instances (
          rule_id, metric_value, threshold_value, severity, message, metadata
        ) VALUES (
          rule_record.id, 
          p_metric_value, 
          rule_record.threshold_value,
          rule_record.severity,
          format('%s alert: %s %s %s (current: %s)', 
                 rule_record.severity,
                 p_metric_name,
                 rule_record.threshold_operator, 
                 rule_record.threshold_value,
                 p_metric_value),
          jsonb_build_object('rule_name', rule_record.rule_name)
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Create function to aggregate performance trends
CREATE OR REPLACE FUNCTION public.aggregate_performance_trends()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_hour TIMESTAMPTZ;
  hour_start TIMESTAMPTZ;
  hour_end TIMESTAMPTZ;
BEGIN
  current_hour := date_trunc('hour', now());
  hour_start := current_hour - INTERVAL '1 hour';
  hour_end := current_hour;
  
  -- Aggregate system health metrics by hour
  INSERT INTO public.performance_trends (
    metric_category, metric_name, aggregation_period,
    period_start, period_end, min_value, max_value, avg_value,
    sum_value, count_value, percentile_50, percentile_95, percentile_99
  )
  SELECT 
    'application' as metric_category,
    metric_name,
    'hour' as aggregation_period,
    hour_start,
    hour_end,
    MIN(metric_value),
    MAX(metric_value),
    AVG(metric_value),
    SUM(metric_value),
    COUNT(*),
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY metric_value),
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value),
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY metric_value)
  FROM public.system_health_metrics
  WHERE recorded_at >= hour_start AND recorded_at < hour_end
  GROUP BY metric_name
  ON CONFLICT DO NOTHING;
  
  -- Aggregate database metrics by hour
  INSERT INTO public.performance_trends (
    metric_category, metric_name, aggregation_period,
    period_start, period_end, min_value, max_value, avg_value,
    sum_value, count_value, percentile_50, percentile_95, percentile_99
  )
  SELECT 
    'database' as metric_category,
    metric_name,
    'hour' as aggregation_period,
    hour_start,
    hour_end,
    MIN(metric_value),
    MAX(metric_value),
    AVG(metric_value),
    SUM(metric_value),
    COUNT(*),
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY metric_value),
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value),
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY metric_value)
  FROM public.database_metrics
  WHERE recorded_at >= hour_start AND recorded_at < hour_end
  GROUP BY metric_name
  ON CONFLICT DO NOTHING;
END;
$$;

-- Insert default alert rules
INSERT INTO public.alert_rules (rule_name, description, metric_name, threshold_value, threshold_operator, severity, notification_channels) VALUES
('High Response Time', 'Alert when API response time exceeds 1000ms', 'response_time', 1000, 'gt', 'medium', '["email"]'::jsonb),
('High Error Rate', 'Alert when error rate exceeds 5%', 'error_rate', 5, 'gt', 'high', '["email", "slack"]'::jsonb),
('Database Connection Pool Full', 'Alert when database connections exceed 80%', 'connection_pool_usage', 80, 'gt', 'high', '["email", "slack"]'::jsonb),
('Critical Error Spike', 'Alert on critical errors', 'critical_errors', 0, 'gt', 'critical', '["email", "slack", "webhook"]'::jsonb),
('Low Booking Success Rate', 'Alert when booking success rate drops below 95%', 'booking_success_rate', 95, 'lt', 'medium', '["email"]'::jsonb);

-- Enable realtime for monitoring tables
ALTER TABLE public.system_health_metrics REPLICA IDENTITY FULL;
ALTER TABLE public.error_logs REPLICA IDENTITY FULL;
ALTER TABLE public.alert_instances REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_health_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.error_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_instances;