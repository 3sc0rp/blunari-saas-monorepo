-- Create domain status types
CREATE TYPE domain_status AS ENUM ('pending', 'active', 'error', 'expired', 'suspended');
CREATE TYPE ssl_status AS ENUM ('pending', 'active', 'error', 'expired', 'renewing');
CREATE TYPE domain_type AS ENUM ('custom', 'subdomain', 'wildcard');

-- Create domains table (enhanced from existing)
DROP TABLE IF EXISTS public.domains CASCADE;
CREATE TABLE public.domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  domain_type domain_type NOT NULL DEFAULT 'custom',
  status domain_status NOT NULL DEFAULT 'pending',
  ssl_status ssl_status NOT NULL DEFAULT 'pending',
  verification_record TEXT,
  verification_status TEXT DEFAULT 'pending',
  cloudflare_hostname_id TEXT,
  cloudflare_zone_id TEXT,
  ssl_cert_id TEXT,
  ssl_expires_at TIMESTAMP WITH TIME ZONE,
  dns_records JSONB DEFAULT '[]'::jsonb,
  redirect_to TEXT,
  is_primary BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create domain health checks table
CREATE TABLE public.domain_health_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_id UUID NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  check_type TEXT NOT NULL, -- 'ssl', 'dns', 'http', 'performance'
  status TEXT NOT NULL CHECK (status IN ('success', 'warning', 'error')),
  response_time_ms INTEGER,
  ssl_days_remaining INTEGER,
  error_message TEXT,
  check_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create domain analytics table
CREATE TABLE public.domain_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_id UUID NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  date DATE NOT NULL,
  requests_count INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  bandwidth_bytes BIGINT DEFAULT 0,
  avg_response_time_ms INTEGER,
  error_rate DECIMAL(5,2) DEFAULT 0,
  cache_hit_rate DECIMAL(5,2) DEFAULT 0,
  countries JSONB DEFAULT '{}'::jsonb,
  top_pages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(domain_id, date)
);

-- Create DNS records table
CREATE TABLE public.dns_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_id UUID NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  record_type TEXT NOT NULL, -- 'A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  ttl INTEGER DEFAULT 3600,
  priority INTEGER,
  cloudflare_record_id TEXT,
  managed BOOLEAN DEFAULT true, -- Whether this record is managed by our system
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create SSL certificates table
CREATE TABLE public.ssl_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_id UUID NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  certificate_authority TEXT DEFAULT 'cloudflare', -- 'cloudflare', 'letsencrypt', 'custom'
  certificate_data TEXT, -- PEM encoded certificate
  private_key_data TEXT, -- PEM encoded private key (encrypted)
  chain_data TEXT, -- Certificate chain
  subject_alt_names TEXT[], -- SAN domains
  issued_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  auto_renew BOOLEAN DEFAULT true,
  status ssl_status NOT NULL DEFAULT 'pending',
  last_renewal_attempt TIMESTAMP WITH TIME ZONE,
  renewal_error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create domain events table for audit log
CREATE TABLE public.domain_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_id UUID NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- 'created', 'verified', 'ssl_issued', 'ssl_renewed', 'dns_updated', 'error'
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  triggered_by UUID, -- employee_id or system
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default DNS templates
CREATE TABLE public.dns_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL, -- 'standard', 'cdn', 'email', 'custom'
  records JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

INSERT INTO public.dns_templates (name, description, template_type, records, is_default) VALUES
(
  'Standard Web Hosting',
  'Basic DNS setup for web hosting with CDN',
  'standard',
  '[
    {"type": "A", "name": "@", "value": "185.158.133.1", "ttl": 3600},
    {"type": "A", "name": "www", "value": "185.158.133.1", "ttl": 3600},
    {"type": "CNAME", "name": "*", "value": "@", "ttl": 3600}
  ]'::jsonb,
  true
),
(
  'CDN Optimized',
  'Optimized DNS setup with Cloudflare CDN',
  'cdn',
  '[
    {"type": "A", "name": "@", "value": "185.158.133.1", "ttl": 1},
    {"type": "A", "name": "www", "value": "185.158.133.1", "ttl": 1},
    {"type": "CNAME", "name": "cdn", "value": "@", "ttl": 3600}
  ]'::jsonb,
  false
);

-- Enable RLS on all tables
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dns_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ssl_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dns_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Domains - tenant isolation
CREATE POLICY "Tenant domains isolation" ON public.domains
  FOR ALL USING (tenant_id = get_current_user_tenant_id());

CREATE POLICY "Employees can view all domains" ON public.domains
  FOR SELECT USING (has_employee_role('SUPPORT'::employee_role));

CREATE POLICY "Employees can manage domains" ON public.domains
  FOR ALL USING (has_employee_role('ADMIN'::employee_role));

-- Domain health checks - tenant isolation
CREATE POLICY "Tenant domain health checks isolation" ON public.domain_health_checks
  FOR ALL USING (tenant_id = get_current_user_tenant_id());

CREATE POLICY "Employees can view all health checks" ON public.domain_health_checks
  FOR SELECT USING (has_employee_role('SUPPORT'::employee_role));

CREATE POLICY "System can insert health checks" ON public.domain_health_checks
  FOR INSERT WITH CHECK (true);

-- Domain analytics - tenant isolation
CREATE POLICY "Tenant domain analytics isolation" ON public.domain_analytics
  FOR ALL USING (tenant_id = get_current_user_tenant_id());

CREATE POLICY "Employees can view all analytics" ON public.domain_analytics
  FOR SELECT USING (has_employee_role('SUPPORT'::employee_role));

CREATE POLICY "System can manage analytics" ON public.domain_analytics
  FOR ALL WITH CHECK (true);

-- DNS records - tenant isolation
CREATE POLICY "Tenant DNS records isolation" ON public.dns_records
  FOR ALL USING (tenant_id = get_current_user_tenant_id());

CREATE POLICY "Employees can view all DNS records" ON public.dns_records
  FOR SELECT USING (has_employee_role('SUPPORT'::employee_role));

-- SSL certificates - tenant isolation
CREATE POLICY "Tenant SSL certificates isolation" ON public.ssl_certificates
  FOR ALL USING (tenant_id = get_current_user_tenant_id());

CREATE POLICY "Employees can view all certificates" ON public.ssl_certificates
  FOR SELECT USING (has_employee_role('SUPPORT'::employee_role));

-- Domain events - tenant isolation
CREATE POLICY "Tenant domain events isolation" ON public.domain_events
  FOR ALL USING (tenant_id = get_current_user_tenant_id());

CREATE POLICY "Employees can view all events" ON public.domain_events
  FOR SELECT USING (has_employee_role('SUPPORT'::employee_role));

CREATE POLICY "System can insert events" ON public.domain_events
  FOR INSERT WITH CHECK (true);

-- DNS templates - public read
CREATE POLICY "Anyone can view DNS templates" ON public.dns_templates
  FOR SELECT USING (true);

CREATE POLICY "Employees can manage templates" ON public.dns_templates
  FOR ALL USING (has_employee_role('ADMIN'::employee_role));

-- Create indexes for performance
CREATE INDEX idx_domains_tenant_id ON public.domains(tenant_id);
CREATE INDEX idx_domains_status ON public.domains(status);
CREATE INDEX idx_domains_ssl_status ON public.domains(ssl_status);
CREATE INDEX idx_domains_ssl_expires_at ON public.domains(ssl_expires_at);

CREATE INDEX idx_domain_health_checks_domain_id ON public.domain_health_checks(domain_id);
CREATE INDEX idx_domain_health_checks_created_at ON public.domain_health_checks(created_at);
CREATE INDEX idx_domain_health_checks_status ON public.domain_health_checks(status);

CREATE INDEX idx_domain_analytics_domain_id ON public.domain_analytics(domain_id);
CREATE INDEX idx_domain_analytics_date ON public.domain_analytics(date);

CREATE INDEX idx_dns_records_domain_id ON public.dns_records(domain_id);
CREATE INDEX idx_dns_records_type ON public.dns_records(record_type);

CREATE INDEX idx_ssl_certificates_domain_id ON public.ssl_certificates(domain_id);
CREATE INDEX idx_ssl_certificates_expires_at ON public.ssl_certificates(expires_at);

CREATE INDEX idx_domain_events_domain_id ON public.domain_events(domain_id);
CREATE INDEX idx_domain_events_created_at ON public.domain_events(created_at);

-- Create triggers for updated_at
CREATE TRIGGER update_domains_updated_at
  BEFORE UPDATE ON public.domains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dns_records_updated_at
  BEFORE UPDATE ON public.dns_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ssl_certificates_updated_at
  BEFORE UPDATE ON public.ssl_certificates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create database functions for domain operations
CREATE OR REPLACE FUNCTION public.add_domain(
  p_tenant_id UUID,
  p_domain TEXT,
  p_domain_type domain_type DEFAULT 'custom'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  domain_id UUID;
  verification_txt TEXT;
BEGIN
  -- Generate verification TXT record
  verification_txt := 'blunari-verify=' || encode(gen_random_bytes(16), 'hex');
  
  -- Insert domain
  INSERT INTO public.domains (
    tenant_id, domain, domain_type, verification_record
  ) VALUES (
    p_tenant_id, p_domain, p_domain_type, verification_txt
  ) RETURNING id INTO domain_id;
  
  -- Log event
  INSERT INTO public.domain_events (
    domain_id, tenant_id, event_type, event_data
  ) VALUES (
    domain_id, p_tenant_id, 'created', 
    jsonb_build_object('domain', p_domain, 'type', p_domain_type)
  );
  
  RETURN domain_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_domain(
  p_domain_id UUID,
  p_verification_success BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  domain_record RECORD;
BEGIN
  -- Get domain details
  SELECT * INTO domain_record FROM public.domains WHERE id = p_domain_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Domain not found: %', p_domain_id;
  END IF;
  
  -- Update verification status
  UPDATE public.domains
  SET 
    verification_status = CASE WHEN p_verification_success THEN 'verified' ELSE 'failed' END,
    status = CASE WHEN p_verification_success THEN 'active'::domain_status ELSE 'error'::domain_status END,
    updated_at = now()
  WHERE id = p_domain_id;
  
  -- Log event
  INSERT INTO public.domain_events (
    domain_id, tenant_id, event_type, event_data
  ) VALUES (
    p_domain_id, domain_record.tenant_id,
    CASE WHEN p_verification_success THEN 'verified' ELSE 'verification_failed' END,
    jsonb_build_object('success', p_verification_success)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_ssl_certificate(
  p_domain_id UUID,
  p_certificate_data TEXT,
  p_expires_at TIMESTAMP WITH TIME ZONE,
  p_status ssl_status
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cert_id UUID;
  domain_record RECORD;
BEGIN
  -- Get domain details
  SELECT * INTO domain_record FROM public.domains WHERE id = p_domain_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Domain not found: %', p_domain_id;
  END IF;
  
  -- Insert or update SSL certificate
  INSERT INTO public.ssl_certificates (
    domain_id, tenant_id, certificate_data, expires_at, status
  ) VALUES (
    p_domain_id, domain_record.tenant_id, p_certificate_data, p_expires_at, p_status
  )
  ON CONFLICT (domain_id) DO UPDATE SET
    certificate_data = EXCLUDED.certificate_data,
    expires_at = EXCLUDED.expires_at,
    status = EXCLUDED.status,
    updated_at = now()
  RETURNING id INTO cert_id;
  
  -- Update domain SSL status
  UPDATE public.domains
  SET 
    ssl_status = p_status,
    ssl_expires_at = p_expires_at,
    updated_at = now()
  WHERE id = p_domain_id;
  
  -- Log event
  INSERT INTO public.domain_events (
    domain_id, tenant_id, event_type, event_data
  ) VALUES (
    p_domain_id, domain_record.tenant_id, 'ssl_updated',
    jsonb_build_object('status', p_status, 'expires_at', p_expires_at)
  );
  
  RETURN cert_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_ssl_expiration()
RETURNS TABLE(domain_id UUID, domain_name TEXT, days_remaining INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.domain,
    EXTRACT(DAY FROM (d.ssl_expires_at - now()))::INTEGER
  FROM public.domains d
  WHERE d.ssl_expires_at IS NOT NULL
    AND d.ssl_expires_at < now() + INTERVAL '30 days'
    AND d.status = 'active'
  ORDER BY d.ssl_expires_at ASC;
END;
$function$;

-- Enable realtime for domain tables
ALTER TABLE public.domains REPLICA IDENTITY FULL;
ALTER TABLE public.domain_health_checks REPLICA IDENTITY FULL;
ALTER TABLE public.domain_events REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.domains;
ALTER PUBLICATION supabase_realtime ADD TABLE public.domain_health_checks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.domain_events;