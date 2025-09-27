-- Create POS providers table
CREATE TABLE public.pos_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  webhook_enabled BOOLEAN NOT NULL DEFAULT true,
  menu_sync_enabled BOOLEAN NOT NULL DEFAULT true,
  event_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  configuration_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  api_documentation_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'beta')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create POS integrations table
CREATE TABLE public.pos_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  provider_id UUID NOT NULL REFERENCES public.pos_providers(id),
  integration_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'error', 'disabled')),
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb, -- encrypted in real implementation
  webhook_url TEXT,
  webhook_secret TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_health_check TIMESTAMP WITH TIME ZONE,
  health_status TEXT NOT NULL DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, provider_id)
);

-- Create POS events table
CREATE TABLE public.pos_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.pos_integrations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_source TEXT NOT NULL, -- 'webhook', 'polling', 'manual'
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  scheduled_retry_at TIMESTAMP WITH TIME ZONE,
  external_id TEXT, -- POS system's event ID
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create POS menu items table
CREATE TABLE public.pos_menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.pos_integrations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  external_id TEXT NOT NULL, -- POS system's menu item ID
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price INTEGER, -- in cents
  currency TEXT NOT NULL DEFAULT 'USD',
  available BOOLEAN NOT NULL DEFAULT true,
  modifiers JSONB NOT NULL DEFAULT '[]'::jsonb,
  allergens JSONB NOT NULL DEFAULT '[]'::jsonb,
  nutrition_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_url TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error')),
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(integration_id, external_id)
);

-- Create POS configurations table
CREATE TABLE public.pos_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.pos_integrations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  setting_type TEXT NOT NULL DEFAULT 'custom' CHECK (setting_type IN ('webhook', 'sync', 'event', 'custom')),
  description TEXT,
  is_sensitive BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(integration_id, setting_key)
);

-- Create POS health checks table
CREATE TABLE public.pos_health_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.pos_integrations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  check_type TEXT NOT NULL, -- 'api', 'webhook', 'sync'
  status TEXT NOT NULL CHECK (status IN ('success', 'warning', 'error')),
  response_time_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  check_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create POS webhook logs table
CREATE TABLE public.pos_webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.pos_integrations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  webhook_url TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'POST',
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_status INTEGER,
  response_body TEXT,
  processing_time_ms INTEGER,
  verified BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default POS providers
INSERT INTO public.pos_providers (name, slug, description, event_types, configuration_schema) VALUES
(
  'Toast POS',
  'toast',
  'Complete restaurant management platform with real-time event processing',
  '["seat_events", "course_timing", "check_close", "spend_updates", "menu_changes"]'::jsonb,
  '{
    "required": ["api_key", "restaurant_id"],
    "optional": ["webhook_secret", "location_id"],
    "webhook_events": ["OrderCreated", "OrderClosed", "MenuItemUpdated"]
  }'::jsonb
),
(
  'Square',
  'square',
  'Payment processing and order management system',
  '["payment_events", "order_updates", "inventory_changes"]'::jsonb,
  '{
    "required": ["access_token", "application_id"],
    "optional": ["webhook_signature_key"],
    "webhook_events": ["payment.created", "payment.updated", "order.created"]
  }'::jsonb
),
(
  'Clover',
  'clover',
  'Comprehensive restaurant management and POS system',
  '["order_events", "payment_events", "inventory_updates", "employee_actions"]'::jsonb,
  '{
    "required": ["access_token", "merchant_id"],
    "optional": ["app_secret"],
    "webhook_events": ["OrderCreated", "PaymentCreated", "InventoryUpdated"]
  }'::jsonb
),
(
  'Resy',
  'resy',
  'Reservation management and dining experience platform',
  '["reservation_events", "guest_updates", "table_management"]'::jsonb,
  '{
    "required": ["api_key", "venue_id"],
    "optional": ["webhook_secret"],
    "webhook_events": ["reservation.created", "reservation.updated", "reservation.cancelled"]
  }'::jsonb
),
(
  'OpenTable',
  'opentable',
  'Restaurant reservation and guest management system',
  '["reservation_events", "guest_profile_updates", "review_alerts"]'::jsonb,
  '{
    "required": ["client_id", "client_secret", "restaurant_id"],
    "optional": ["webhook_url"],
    "webhook_events": ["reservation.booked", "reservation.modified", "guest.updated"]
  }'::jsonb
),
(
  'Custom API',
  'custom',
  'Flexible webhook-based integration for custom POS systems',
  '["custom_events", "flexible_webhooks"]'::jsonb,
  '{
    "required": ["webhook_url"],
    "optional": ["auth_header", "secret_key", "custom_headers"],
    "webhook_events": ["custom.event"]
  }'::jsonb
);

-- Enable RLS on all tables
ALTER TABLE public.pos_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- POS providers - readable by all authenticated users
CREATE POLICY "Anyone can view POS providers" ON public.pos_providers
  FOR SELECT USING (true);

-- POS integrations - tenant isolation
CREATE POLICY "Tenant POS integrations isolation" ON public.pos_integrations
  FOR ALL USING (tenant_id = get_current_user_tenant_id());

CREATE POLICY "Employees can view all integrations" ON public.pos_integrations
  FOR SELECT USING (has_employee_role('SUPPORT'::employee_role));

-- POS events - tenant isolation
CREATE POLICY "Tenant POS events isolation" ON public.pos_events
  FOR ALL USING (tenant_id = get_current_user_tenant_id());

CREATE POLICY "Employees can view all events" ON public.pos_events
  FOR SELECT USING (has_employee_role('SUPPORT'::employee_role));

CREATE POLICY "System can insert events" ON public.pos_events
  FOR INSERT WITH CHECK (true);

-- POS menu items - tenant isolation
CREATE POLICY "Tenant POS menu items isolation" ON public.pos_menu_items
  FOR ALL USING (tenant_id = get_current_user_tenant_id());

CREATE POLICY "Employees can view all menu items" ON public.pos_menu_items
  FOR SELECT USING (has_employee_role('SUPPORT'::employee_role));

-- POS configurations - tenant isolation
CREATE POLICY "Tenant POS configurations isolation" ON public.pos_configurations
  FOR ALL USING (tenant_id = get_current_user_tenant_id());

CREATE POLICY "Employees can view all configurations" ON public.pos_configurations
  FOR SELECT USING (has_employee_role('SUPPORT'::employee_role));

-- POS health checks - tenant isolation
CREATE POLICY "Tenant POS health checks isolation" ON public.pos_health_checks
  FOR ALL USING (tenant_id = get_current_user_tenant_id());

CREATE POLICY "Employees can view all health checks" ON public.pos_health_checks
  FOR SELECT USING (has_employee_role('SUPPORT'::employee_role));

CREATE POLICY "System can insert health checks" ON public.pos_health_checks
  FOR INSERT WITH CHECK (true);

-- POS webhook logs - tenant isolation
CREATE POLICY "Tenant POS webhook logs isolation" ON public.pos_webhook_logs
  FOR ALL USING (tenant_id = get_current_user_tenant_id());

CREATE POLICY "Employees can view all webhook logs" ON public.pos_webhook_logs
  FOR SELECT USING (has_employee_role('SUPPORT'::employee_role));

CREATE POLICY "System can insert webhook logs" ON public.pos_webhook_logs
  FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_pos_integrations_tenant_id ON public.pos_integrations(tenant_id);
CREATE INDEX idx_pos_integrations_status ON public.pos_integrations(status);
CREATE INDEX idx_pos_integrations_health_status ON public.pos_integrations(health_status);

CREATE INDEX idx_pos_events_integration_id ON public.pos_events(integration_id);
CREATE INDEX idx_pos_events_tenant_id ON public.pos_events(tenant_id);
CREATE INDEX idx_pos_events_processed ON public.pos_events(processed);
CREATE INDEX idx_pos_events_created_at ON public.pos_events(created_at);
CREATE INDEX idx_pos_events_event_type ON public.pos_events(event_type);

CREATE INDEX idx_pos_menu_items_integration_id ON public.pos_menu_items(integration_id);
CREATE INDEX idx_pos_menu_items_tenant_id ON public.pos_menu_items(tenant_id);
CREATE INDEX idx_pos_menu_items_sync_status ON public.pos_menu_items(sync_status);

CREATE INDEX idx_pos_health_checks_integration_id ON public.pos_health_checks(integration_id);
CREATE INDEX idx_pos_health_checks_created_at ON public.pos_health_checks(created_at);
CREATE INDEX idx_pos_health_checks_status ON public.pos_health_checks(status);

CREATE INDEX idx_pos_webhook_logs_integration_id ON public.pos_webhook_logs(integration_id);
CREATE INDEX idx_pos_webhook_logs_created_at ON public.pos_webhook_logs(created_at);

-- Create triggers for updated_at
CREATE TRIGGER update_pos_providers_updated_at
  BEFORE UPDATE ON public.pos_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pos_integrations_updated_at
  BEFORE UPDATE ON public.pos_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pos_menu_items_updated_at
  BEFORE UPDATE ON public.pos_menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pos_configurations_updated_at
  BEFORE UPDATE ON public.pos_configurations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create database functions for POS operations
CREATE OR REPLACE FUNCTION public.process_pos_event(
  p_integration_id UUID,
  p_event_type TEXT,
  p_event_data JSONB,
  p_external_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.update_pos_integration_health(
  p_integration_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    health_status = p_status,
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
$function$;

CREATE OR REPLACE FUNCTION public.sync_pos_menu_item(
  p_integration_id UUID,
  p_external_id TEXT,
  p_item_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Enable realtime for POS tables
ALTER TABLE public.pos_integrations REPLICA IDENTITY FULL;
ALTER TABLE public.pos_events REPLICA IDENTITY FULL;
ALTER TABLE public.pos_health_checks REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_integrations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_health_checks;