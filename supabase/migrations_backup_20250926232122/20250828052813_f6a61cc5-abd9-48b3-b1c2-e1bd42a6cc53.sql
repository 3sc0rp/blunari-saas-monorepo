-- Create core tables for multi-tenant restaurant booking SaaS
-- All tables include tenant_id for isolation

-- Tenants table (core entity)
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tenant features management
CREATE TABLE public.tenant_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'plan' CHECK (source IN ('plan', 'override')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, feature_key)
);

-- Provisioning runs for tenant setup tracking
CREATE TABLE public.provisioning_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  request_data JSONB NOT NULL,
  result_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Provisioning steps
CREATE TABLE public.provisioning_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.provisioning_runs(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  step_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Event outbox for reliable async processing
CREATE TABLE public.event_outbox (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead_letter')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Domains for custom tenant domains
CREATE TABLE public.domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  domain_type TEXT NOT NULL CHECK (domain_type IN ('your_subdomain', 'customer_subdomain')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'error', 'deleted')),
  ssl_status TEXT NOT NULL DEFAULT 'pending' CHECK (ssl_status IN ('ok', 'pending', 'failed')),
  verification_record TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Restaurant tables/seating
CREATE TABLE public.restaurant_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  table_type TEXT NOT NULL DEFAULT 'standard' CHECK (table_type IN ('standard', 'booth', 'bar', 'outdoor', 'private')),
  position_x FLOAT,
  position_y FLOAT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Bookings
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  party_size INTEGER NOT NULL CHECK (party_size > 0),
  booking_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 120 CHECK (duration_minutes > 0),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'seated', 'completed', 'cancelled', 'no_show')),
  special_requests TEXT,
  deposit_required BOOLEAN NOT NULL DEFAULT false,
  deposit_amount INTEGER, -- in cents
  deposit_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Booking holds (temporary reservations)
CREATE TABLE public.booking_holds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  party_size INTEGER NOT NULL CHECK (party_size > 0),
  booking_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 120,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  session_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provisioning_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provisioning_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_holds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant isolation
-- Note: Service role can access all data, these policies apply to anon/authenticated users

-- Tenants - only allow service role access for now
CREATE POLICY "service_role_access" ON public.tenants FOR ALL USING (false);

-- Features - tenant-isolated
CREATE POLICY "tenant_features_isolation" ON public.tenant_features 
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.tenants WHERE id = tenant_id)
);

-- Provisioning - service role only
CREATE POLICY "service_role_provisioning" ON public.provisioning_runs FOR ALL USING (false);
CREATE POLICY "service_role_provisioning_steps" ON public.provisioning_steps FOR ALL USING (false);

-- Event outbox - service role only
CREATE POLICY "service_role_outbox" ON public.event_outbox FOR ALL USING (false);

-- Domains - tenant-isolated
CREATE POLICY "domains_isolation" ON public.domains 
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.tenants WHERE id = tenant_id)
);

-- Restaurant tables - tenant-isolated
CREATE POLICY "tables_isolation" ON public.restaurant_tables 
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.tenants WHERE id = tenant_id)
);

-- Bookings - tenant-isolated
CREATE POLICY "bookings_isolation" ON public.bookings 
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.tenants WHERE id = tenant_id)
);

-- Booking holds - tenant-isolated
CREATE POLICY "holds_isolation" ON public.booking_holds 
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.tenants WHERE id = tenant_id)
);

-- Create indexes for performance
CREATE INDEX idx_tenants_slug ON public.tenants(slug);
CREATE INDEX idx_tenant_features_lookup ON public.tenant_features(tenant_id, feature_key);
CREATE INDEX idx_provisioning_idempotency ON public.provisioning_runs(idempotency_key);
CREATE INDEX idx_outbox_processing ON public.event_outbox(status, scheduled_at);
CREATE INDEX idx_domains_tenant ON public.domains(tenant_id);
CREATE INDEX idx_bookings_tenant_time ON public.bookings(tenant_id, booking_time);
CREATE INDEX idx_holds_expires ON public.booking_holds(expires_at);
CREATE INDEX idx_restaurant_tables_tenant ON public.restaurant_tables(tenant_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_features_updated_at
  BEFORE UPDATE ON public.tenant_features
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_provisioning_runs_updated_at
  BEFORE UPDATE ON public.provisioning_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_domains_updated_at
  BEFORE UPDATE ON public.domains
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_restaurant_tables_updated_at
  BEFORE UPDATE ON public.restaurant_tables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();