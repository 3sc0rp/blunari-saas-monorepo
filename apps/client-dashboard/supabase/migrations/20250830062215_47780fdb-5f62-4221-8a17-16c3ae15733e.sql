-- Create POS Integration System Tables

-- Create enum types for POS providers and statuses
CREATE TYPE pos_provider AS ENUM (
  'toast', 'square', 'clover', 'resy', 'opentable', 'custom_webhook'
);

CREATE TYPE integration_status AS ENUM (
  'pending', 'active', 'error', 'disabled', 'testing'
);

CREATE TYPE health_status AS ENUM (
  'healthy', 'degraded', 'unhealthy'
);

CREATE TYPE sync_status AS ENUM (
  'pending', 'synced', 'error', 'partial'
);

-- POS Integrations table - stores integration configurations
CREATE TABLE public.pos_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  provider pos_provider NOT NULL,
  provider_name TEXT NOT NULL,
  restaurant_id TEXT,
  api_endpoint TEXT,
  webhook_secret TEXT,
  credentials JSONB NOT NULL DEFAULT '{}',
  configuration JSONB NOT NULL DEFAULT '{}',
  status integration_status NOT NULL DEFAULT 'pending',
  health_status health_status NOT NULL DEFAULT 'healthy',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_health_check TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  webhook_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_sync_enabled BOOLEAN NOT NULL DEFAULT true,
  sync_interval_minutes INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_tenant_provider UNIQUE (tenant_id, provider, restaurant_id)
);

-- POS Events table - logs all incoming events from POS systems
CREATE TABLE public.pos_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.pos_integrations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_source TEXT NOT NULL DEFAULT 'webhook',
  external_id TEXT,
  event_data JSONB NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- POS Health Checks table - tracks integration health monitoring
CREATE TABLE public.pos_health_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.pos_integrations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  check_type TEXT NOT NULL,
  status TEXT NOT NULL,
  response_time_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  endpoint_tested TEXT,
  metadata JSONB DEFAULT '{}',
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- POS Menu Items table - synchronized menu data from POS systems
CREATE TABLE public.pos_menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.pos_integrations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price INTEGER, -- price in cents
  currency TEXT NOT NULL DEFAULT 'USD',
  available BOOLEAN NOT NULL DEFAULT true,
  modifiers JSONB DEFAULT '[]',
  allergens JSONB DEFAULT '[]',
  nutrition_info JSONB DEFAULT '{}',
  image_url TEXT,
  sync_status sync_status NOT NULL DEFAULT 'pending',
  last_synced_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_integration_external_id UNIQUE (integration_id, external_id)
);

-- POS Webhook Logs table - detailed webhook request/response logging
CREATE TABLE public.pos_webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID REFERENCES public.pos_integrations(id) ON DELETE CASCADE,
  tenant_id UUID,
  webhook_url TEXT NOT NULL,
  http_method TEXT NOT NULL,
  headers JSONB,
  request_body JSONB,
  response_status INTEGER,
  response_body TEXT,
  response_time_ms INTEGER,
  signature_valid BOOLEAN,
  processing_result TEXT,
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pos_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for tenant isolation
CREATE POLICY "Tenant POS integrations isolation" ON public.pos_integrations
  FOR ALL USING (tenant_id = get_current_user_tenant_id())
  WITH CHECK (tenant_id = get_current_user_tenant_id());

CREATE POLICY "Tenant POS events isolation" ON public.pos_events
  FOR ALL USING (tenant_id = get_current_user_tenant_id())
  WITH CHECK (tenant_id = get_current_user_tenant_id());

CREATE POLICY "Tenant POS health checks isolation" ON public.pos_health_checks
  FOR ALL USING (tenant_id = get_current_user_tenant_id())
  WITH CHECK (tenant_id = get_current_user_tenant_id());

CREATE POLICY "Tenant POS menu items isolation" ON public.pos_menu_items
  FOR ALL USING (tenant_id = get_current_user_tenant_id())
  WITH CHECK (tenant_id = get_current_user_tenant_id());

CREATE POLICY "Tenant POS webhook logs isolation" ON public.pos_webhook_logs
  FOR ALL USING (tenant_id = get_current_user_tenant_id())
  WITH CHECK (tenant_id = get_current_user_tenant_id());

-- Webhook logs need special policy for public webhooks (no tenant check for incoming webhooks)
CREATE POLICY "Public webhook logging" ON public.pos_webhook_logs
  FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_pos_integrations_tenant_provider ON public.pos_integrations(tenant_id, provider);
CREATE INDEX idx_pos_integrations_status ON public.pos_integrations(status, health_status);
CREATE INDEX idx_pos_events_integration_created ON public.pos_events(integration_id, created_at DESC);
CREATE INDEX idx_pos_events_tenant_type ON public.pos_events(tenant_id, event_type);
CREATE INDEX idx_pos_health_checks_integration_checked ON public.pos_health_checks(integration_id, checked_at DESC);
CREATE INDEX idx_pos_menu_items_integration_external ON public.pos_menu_items(integration_id, external_id);
CREATE INDEX idx_pos_webhook_logs_integration_created ON public.pos_webhook_logs(integration_id, created_at DESC);

-- Create updated_at trigger for pos_integrations
CREATE TRIGGER update_pos_integrations_updated_at
  BEFORE UPDATE ON public.pos_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for pos_menu_items  
CREATE TRIGGER update_pos_menu_items_updated_at
  BEFORE UPDATE ON public.pos_menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create helper functions for POS integration management
CREATE OR REPLACE FUNCTION public.process_pos_event(
  p_integration_id UUID,
  p_event_type TEXT,
  p_event_data JSONB,
  p_external_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_id UUID;
  tenant_uuid UUID;
BEGIN
  -- Get tenant_id from integration
  SELECT tenant_id INTO tenant_uuid
  FROM public.pos_integrations
  WHERE id = p_integration_id;
  
  IF tenant_uuid IS NULL THEN
    RAISE EXCEPTION 'Integration not found: %', p_integration_id;
  END IF;
  
  -- Insert event
  INSERT INTO public.pos_events (
    integration_id, tenant_id, event_type, event_source,
    event_data, external_id
  ) VALUES (
    p_integration_id, tenant_uuid, p_event_type, 'webhook',
    p_event_data, p_external_id
  ) RETURNING id INTO event_id;
  
  -- Update integration last sync time
  UPDATE public.pos_integrations
  SET last_sync_at = now()
  WHERE id = p_integration_id;
  
  RETURN event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_pos_integration_health(
  p_integration_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tenant_uuid UUID;
BEGIN
  -- Get tenant_id from integration
  SELECT tenant_id INTO tenant_uuid
  FROM public.pos_integrations
  WHERE id = p_integration_id;
  
  IF tenant_uuid IS NULL THEN
    RAISE EXCEPTION 'Integration not found: %', p_integration_id;
  END IF;
  
  -- Update integration health
  UPDATE public.pos_integrations
  SET 
    health_status = p_status::health_status,
    last_health_check = now(),
    error_message = p_error_message
  WHERE id = p_integration_id;
  
  -- Insert health check record
  INSERT INTO public.pos_health_checks (
    integration_id, tenant_id, check_type, status, error_message
  ) VALUES (
    p_integration_id, tenant_uuid, 'api', 
    CASE p_status 
      WHEN 'healthy' THEN 'success'
      WHEN 'degraded' THEN 'warning'
      ELSE 'error'
    END,
    p_error_message
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_pos_menu_item(
  p_integration_id UUID,
  p_external_id TEXT,
  p_item_data JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_id UUID;
  tenant_uuid UUID;
BEGIN
  -- Get tenant_id from integration
  SELECT tenant_id INTO tenant_uuid
  FROM public.pos_integrations
  WHERE id = p_integration_id;
  
  IF tenant_uuid IS NULL THEN
    RAISE EXCEPTION 'Integration not found: %', p_integration_id;
  END IF;
  
  -- Insert or update menu item
  INSERT INTO public.pos_menu_items (
    integration_id, tenant_id, external_id, name, description,
    category, price, currency, available, modifiers, allergens,
    nutrition_info, image_url, metadata
  ) VALUES (
    p_integration_id, tenant_uuid, p_external_id,
    p_item_data->>'name',
    p_item_data->>'description',
    p_item_data->>'category',
    (p_item_data->>'price')::INTEGER,
    COALESCE(p_item_data->>'currency', 'USD'),
    COALESCE((p_item_data->>'available')::BOOLEAN, true),
    COALESCE(p_item_data->'modifiers', '[]'::jsonb),
    COALESCE(p_item_data->'allergens', '[]'::jsonb),
    COALESCE(p_item_data->'nutrition_info', '{}'::jsonb),
    p_item_data->>'image_url',
    COALESCE(p_item_data->'metadata', '{}'::jsonb)
  )
  ON CONFLICT (integration_id, external_id)
  DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    price = EXCLUDED.price,
    currency = EXCLUDED.currency,
    available = EXCLUDED.available,
    modifiers = EXCLUDED.modifiers,
    allergens = EXCLUDED.allergens,
    nutrition_info = EXCLUDED.nutrition_info,
    image_url = EXCLUDED.image_url,
    sync_status = 'synced',
    last_synced_at = now(),
    metadata = EXCLUDED.metadata,
    updated_at = now()
  RETURNING id INTO item_id;
  
  RETURN item_id;
END;
$$;