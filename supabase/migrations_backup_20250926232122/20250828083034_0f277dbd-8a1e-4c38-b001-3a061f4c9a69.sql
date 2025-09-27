-- Create system health monitoring tables

-- Services registry table
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL UNIQUE,
  service_type TEXT NOT NULL, -- api, database, cache, queue, external
  service_url TEXT,
  description TEXT,
  environment TEXT NOT NULL DEFAULT 'production', -- production, staging, development
  critical BOOLEAN DEFAULT true, -- impacts user experience if down
  expected_response_time_ms INTEGER DEFAULT 1000,
  health_check_endpoint TEXT,
  health_check_interval_seconds INTEGER DEFAULT 60,
  sla_uptime_target NUMERIC DEFAULT 99.9, -- percentage
  enabled BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service health status table
CREATE TABLE public.service_health_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  status TEXT NOT NULL, -- healthy, degraded, unhealthy, unknown
  response_time_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Resource usage monitoring table
CREATE TABLE public.resource_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  resource_type TEXT NOT NULL, -- cpu, memory, disk, network
  current_value NUMERIC NOT NULL,
  max_value NUMERIC, -- capacity limit
  unit TEXT NOT NULL, -- percentage, bytes, mb, gb
  threshold_warning NUMERIC DEFAULT 80,
  threshold_critical NUMERIC DEFAULT 95,
  hostname TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Incidents management table
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL, -- low, medium, high, critical
  status TEXT NOT NULL DEFAULT 'open', -- open, investigating, identified, monitoring, resolved
  impact TEXT NOT NULL, -- no_impact, minor, major, critical
  affected_services TEXT[], -- array of service names
  root_cause TEXT,
  resolution TEXT,
  assignee_id UUID,
  reporter_id UUID,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Incident timeline/updates table
CREATE TABLE public.incident_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE,
  update_type TEXT NOT NULL, -- status_change, investigation, resolution, communication
  message TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  author_id UUID,
  public_facing BOOLEAN DEFAULT false, -- visible to customers
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Maintenance windows table
CREATE TABLE public.maintenance_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  maintenance_type TEXT NOT NULL, -- scheduled, emergency
  affected_services TEXT[] NOT NULL,
  impact_level TEXT NOT NULL, -- no_impact, minor, major, critical
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  notification_sent BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SLA tracking table
CREATE TABLE public.sla_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  uptime_percentage NUMERIC NOT NULL,
  downtime_minutes INTEGER NOT NULL DEFAULT 0,
  total_checks INTEGER NOT NULL DEFAULT 0,
  successful_checks INTEGER NOT NULL DEFAULT 0,
  avg_response_time_ms NUMERIC,
  incidents_count INTEGER DEFAULT 0,
  sla_breach BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- System diagnostics table
CREATE TABLE public.diagnostic_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_type TEXT NOT NULL, -- connectivity, performance, security, configuration
  service_name TEXT,
  test_name TEXT NOT NULL,
  status TEXT NOT NULL, -- pass, fail, warning, error
  result_data JSONB NOT NULL,
  execution_time_ms INTEGER,
  error_message TEXT,
  recommendations TEXT[],
  executed_by UUID,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all health monitoring tables
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_health_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system health (support/admin access)
CREATE POLICY "Support can view services" ON public.services
  FOR SELECT
  USING (has_employee_role('SUPPORT'));

CREATE POLICY "Admins can manage services" ON public.services
  FOR ALL
  USING (has_employee_role('ADMIN'));

CREATE POLICY "Support can view service health" ON public.service_health_status
  FOR SELECT
  USING (has_employee_role('SUPPORT'));

CREATE POLICY "System can insert health status" ON public.service_health_status
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Support can view resource usage" ON public.resource_usage
  FOR SELECT
  USING (has_employee_role('SUPPORT'));

CREATE POLICY "System can insert resource usage" ON public.resource_usage
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Support can view incidents" ON public.incidents
  FOR SELECT
  USING (has_employee_role('SUPPORT'));

CREATE POLICY "Support can manage incidents" ON public.incidents
  FOR ALL
  USING (has_employee_role('SUPPORT'));

CREATE POLICY "Support can view incident updates" ON public.incident_updates
  FOR SELECT
  USING (has_employee_role('SUPPORT'));

CREATE POLICY "Support can manage incident updates" ON public.incident_updates
  FOR ALL
  USING (has_employee_role('SUPPORT'));

CREATE POLICY "Support can view maintenance windows" ON public.maintenance_windows
  FOR SELECT
  USING (has_employee_role('SUPPORT'));

CREATE POLICY "Admins can manage maintenance windows" ON public.maintenance_windows
  FOR ALL
  USING (has_employee_role('ADMIN'));

CREATE POLICY "Support can view SLA metrics" ON public.sla_metrics
  FOR SELECT
  USING (has_employee_role('SUPPORT'));

CREATE POLICY "System can manage SLA metrics" ON public.sla_metrics
  FOR ALL
  USING (true);

CREATE POLICY "Support can view diagnostic results" ON public.diagnostic_results
  FOR SELECT
  USING (has_employee_role('SUPPORT'));

CREATE POLICY "Support can run diagnostics" ON public.diagnostic_results
  FOR ALL
  USING (has_employee_role('SUPPORT'));

-- Create indexes for performance
CREATE INDEX idx_services_name ON public.services(service_name);
CREATE INDEX idx_services_type_enabled ON public.services(service_type, enabled);
CREATE INDEX idx_service_health_service_time ON public.service_health_status(service_id, checked_at DESC);
CREATE INDEX idx_service_health_status ON public.service_health_status(status, checked_at DESC);
CREATE INDEX idx_resource_usage_service_time ON public.resource_usage(service_name, recorded_at DESC);
CREATE INDEX idx_resource_usage_type ON public.resource_usage(resource_type, recorded_at DESC);
CREATE INDEX idx_incidents_status ON public.incidents(status, detected_at DESC);
CREATE INDEX idx_incidents_severity ON public.incidents(severity, detected_at DESC);
CREATE INDEX idx_incident_updates_incident ON public.incident_updates(incident_id, created_at DESC);
CREATE INDEX idx_maintenance_windows_status ON public.maintenance_windows(status, scheduled_start);
CREATE INDEX idx_sla_metrics_service_period ON public.sla_metrics(service_id, period_start DESC);
CREATE INDEX idx_diagnostic_results_type_time ON public.diagnostic_results(diagnostic_type, executed_at DESC);

-- Create triggers for updated_at columns
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_windows_updated_at
  BEFORE UPDATE ON public.maintenance_windows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create functions for health monitoring
CREATE OR REPLACE FUNCTION public.check_service_health(p_service_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  service_record RECORD;
  health_status TEXT;
  response_time INTEGER;
  result JSONB;
BEGIN
  -- Get service details
  SELECT * INTO service_record FROM public.services WHERE id = p_service_id AND enabled = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Service not found or disabled');
  END IF;
  
  -- Simulate health check (in real implementation, this would make HTTP requests)
  response_time := floor(random() * 200 + 50)::INTEGER; -- 50-250ms
  
  -- Determine health status based on response time and random factors
  IF random() < 0.1 THEN -- 10% chance of issues
    health_status := CASE 
      WHEN random() < 0.3 THEN 'unhealthy'
      WHEN random() < 0.7 THEN 'degraded'
      ELSE 'healthy'
    END;
  ELSE
    health_status := 'healthy';
  END IF;
  
  -- Insert health status record
  INSERT INTO public.service_health_status (
    service_id, status, response_time_ms, metadata
  ) VALUES (
    p_service_id, health_status, response_time, 
    jsonb_build_object('check_type', 'automated', 'timestamp', now())
  );
  
  -- Check if this creates an incident
  IF health_status IN ('unhealthy', 'degraded') THEN
    PERFORM public.create_health_incident(p_service_id, health_status, response_time);
  END IF;
  
  result := jsonb_build_object(
    'service_name', service_record.service_name,
    'status', health_status,
    'response_time_ms', response_time,
    'checked_at', now()
  );
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_health_incident(
  p_service_id UUID,
  p_health_status TEXT,
  p_response_time INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  service_name TEXT;
  incident_id UUID;
  incident_number TEXT;
  severity TEXT;
  existing_incident UUID;
BEGIN
  -- Get service name
  SELECT s.service_name INTO service_name FROM public.services s WHERE id = p_service_id;
  
  -- Check if there's already an open incident for this service
  SELECT id INTO existing_incident 
  FROM public.incidents 
  WHERE status NOT IN ('resolved') 
    AND p_service_id::TEXT = ANY(affected_services)
  ORDER BY detected_at DESC 
  LIMIT 1;
  
  -- Don't create duplicate incidents
  IF existing_incident IS NOT NULL THEN
    RETURN existing_incident;
  END IF;
  
  -- Determine severity based on health status
  severity := CASE p_health_status
    WHEN 'unhealthy' THEN 'high'
    WHEN 'degraded' THEN 'medium'
    ELSE 'low'
  END;
  
  -- Generate incident number
  incident_number := 'INC-' || to_char(now(), 'YYYYMMDD') || '-' || 
                     lpad(extract(epoch from now())::INTEGER::TEXT, 6, '0');
  
  -- Create incident
  INSERT INTO public.incidents (
    incident_number, title, description, severity, impact, affected_services
  ) VALUES (
    incident_number,
    service_name || ' Health Check Failure',
    format('Service %s is reporting %s status with response time %sms', 
           service_name, p_health_status, p_response_time),
    severity,
    CASE severity WHEN 'high' THEN 'major' ELSE 'minor' END,
    ARRAY[service_name]
  ) RETURNING id INTO incident_id;
  
  -- Add initial update
  INSERT INTO public.incident_updates (
    incident_id, update_type, message, new_status
  ) VALUES (
    incident_id, 'status_change', 'Incident detected by automated health check', 'open'
  );
  
  RETURN incident_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_sla_metrics(
  p_service_id UUID,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_checks INTEGER;
  successful_checks INTEGER;
  uptime_percentage NUMERIC;
  avg_response_time NUMERIC;
  downtime_minutes INTEGER;
  sla_target NUMERIC;
  sla_breach BOOLEAN;
  result JSONB;
BEGIN
  -- Get service SLA target
  SELECT sla_uptime_target INTO sla_target FROM public.services WHERE id = p_service_id;
  
  -- Calculate metrics from health status data
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN status = 'healthy' THEN 1 END),
    AVG(CASE WHEN status = 'healthy' THEN response_time_ms END)
  INTO total_checks, successful_checks, avg_response_time
  FROM public.service_health_status
  WHERE service_id = p_service_id
    AND checked_at >= p_period_start
    AND checked_at <= p_period_end;
  
  -- Calculate uptime percentage
  uptime_percentage := CASE 
    WHEN total_checks > 0 THEN (successful_checks::NUMERIC / total_checks::NUMERIC) * 100
    ELSE 100
  END;
  
  -- Calculate downtime in minutes (rough estimate)
  downtime_minutes := CASE
    WHEN total_checks > 0 THEN 
      ((total_checks - successful_checks) * 
       EXTRACT(EPOCH FROM (p_period_end - p_period_start)) / 60 / total_checks)::INTEGER
    ELSE 0
  END;
  
  -- Check SLA breach
  sla_breach := uptime_percentage < sla_target;
  
  -- Insert or update SLA metrics
  INSERT INTO public.sla_metrics (
    service_id, period_start, period_end, uptime_percentage,
    downtime_minutes, total_checks, successful_checks,
    avg_response_time_ms, sla_breach
  ) VALUES (
    p_service_id, p_period_start, p_period_end, uptime_percentage,
    downtime_minutes, total_checks, successful_checks,
    avg_response_time, sla_breach
  )
  ON CONFLICT (service_id, period_start) DO UPDATE SET
    uptime_percentage = EXCLUDED.uptime_percentage,
    downtime_minutes = EXCLUDED.downtime_minutes,
    total_checks = EXCLUDED.total_checks,
    successful_checks = EXCLUDED.successful_checks,
    avg_response_time_ms = EXCLUDED.avg_response_time_ms,
    sla_breach = EXCLUDED.sla_breach;
  
  result := jsonb_build_object(
    'uptime_percentage', uptime_percentage,
    'downtime_minutes', downtime_minutes,
    'avg_response_time_ms', avg_response_time,
    'sla_breach', sla_breach,
    'total_checks', total_checks,
    'successful_checks', successful_checks
  );
  
  RETURN result;
END;
$$;

-- Insert default services to monitor
INSERT INTO public.services (service_name, service_type, service_url, description, health_check_endpoint, critical) VALUES
('API Gateway', 'api', 'https://api.blunari.ai', 'Main API gateway for all client requests', '/health', true),
('Database', 'database', 'localhost:5432', 'Primary PostgreSQL database', null, true),
('Authentication Service', 'api', 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co/auth/v1', 'Supabase authentication service', '/health', true),
('File Storage', 'api', 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co/storage/v1', 'Supabase file storage service', '/status', false),
('Email Service', 'external', 'https://api.sendgrid.com', 'SendGrid email delivery service', '/health', false),
('Payment Gateway', 'external', 'https://api.stripe.com', 'Stripe payment processing', '/health', true),
('CDN', 'external', 'https://cdn.blunari.ai', 'Content delivery network', '/', false);

-- Enable realtime for health monitoring tables
ALTER TABLE public.service_health_status REPLICA IDENTITY FULL;
ALTER TABLE public.incidents REPLICA IDENTITY FULL;
ALTER TABLE public.resource_usage REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_health_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.resource_usage;