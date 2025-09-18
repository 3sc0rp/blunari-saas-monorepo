-- Create integration provider tables and data
CREATE TABLE IF NOT EXISTS integration_providers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('pos', 'accounting', 'marketing', 'delivery', 'analytics', 'communication')),
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  auth_type TEXT NOT NULL CHECK (auth_type IN ('oauth2', 'api_key', 'manual')),
  auth_config JSONB DEFAULT '{}',
  capabilities TEXT[] DEFAULT '{}',
  webhook_events TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create integrations table
CREATE TABLE IF NOT EXISTS integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES integration_providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error', 'syncing')),
  is_enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  credentials JSONB DEFAULT '{}', -- Encrypted credentials
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  error_message TEXT,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, provider_id)
);

-- Create sync history table
CREATE TABLE IF NOT EXISTS sync_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE integration_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for integration_providers (public read for active providers)
CREATE POLICY "Integration providers are viewable by all authenticated users"
  ON integration_providers FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for integrations (tenant-specific)
CREATE POLICY "Users can view their tenant's integrations"
  ON integrations FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert integrations for their tenant"
  ON integrations FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their tenant's integrations"
  ON integrations FOR UPDATE
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their tenant's integrations"
  ON integrations FOR DELETE
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));

-- RLS Policies for sync_history (tenant-specific)
CREATE POLICY "Users can view their tenant's sync history"
  ON sync_history FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert sync history for their tenant"
  ON sync_history FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));

-- Insert sample integration providers
INSERT INTO integration_providers (name, slug, category, description, auth_type, capabilities, webhook_events) VALUES
('Clover', 'clover', 'pos', 'Complete POS integration with Clover systems', 'oauth2', 
 ARRAY['orders', 'payments', 'inventory', 'customers', 'employees'], 
 ARRAY['order_created', 'payment_processed', 'inventory_updated']),
('Square', 'square', 'pos', 'Sync transactions, inventory, and customer data from Square', 'oauth2',
 ARRAY['transactions', 'inventory', 'customers', 'locations'],
 ARRAY['payment', 'refund', 'inventory_count_updated']),
('Toast', 'toast', 'pos', 'Restaurant POS system integration', 'oauth2',
 ARRAY['orders', 'payments', 'menu', 'customers'],
 ARRAY['order_created', 'order_updated', 'payment_processed']),
('QuickBooks', 'quickbooks', 'accounting', 'Sync financial data with QuickBooks Online', 'oauth2',
 ARRAY['sales', 'expenses', 'customers', 'items', 'payments'],
 ARRAY[]::text[]),
('Xero', 'xero', 'accounting', 'Cloud-based accounting software integration', 'oauth2',
 ARRAY['invoices', 'expenses', 'contacts', 'items'],
 ARRAY[]::text[]),
('Mailchimp', 'mailchimp', 'marketing', 'Customer marketing and email campaigns', 'api_key',
 ARRAY['customers', 'campaigns', 'automation', 'analytics'],
 ARRAY['campaign_sent', 'subscribe', 'unsubscribe']),
('Constant Contact', 'constant-contact', 'marketing', 'Email marketing and automation platform', 'oauth2',
 ARRAY['contacts', 'email_campaigns', 'events', 'reporting'],
 ARRAY[]::text[]),
('DoorDash', 'doordash', 'delivery', 'Manage delivery orders and logistics', 'api_key',
 ARRAY['orders', 'menu', 'delivery_tracking', 'analytics'],
 ARRAY['order_created', 'order_confirmed', 'order_delivered']),
('Uber Eats', 'uber-eats', 'delivery', 'Food delivery platform integration', 'oauth2',
 ARRAY['orders', 'menu', 'restaurant_info'],
 ARRAY['order_created', 'order_cancelled', 'order_delivered']),
('Grubhub', 'grubhub', 'delivery', 'Online food ordering and delivery', 'api_key',
 ARRAY['orders', 'menu', 'availability'],
 ARRAY['order_placed', 'order_cancelled']),
('Google Analytics', 'google-analytics', 'analytics', 'Website and app analytics integration', 'oauth2',
 ARRAY['web_traffic', 'conversions', 'demographics', 'behavior'],
 ARRAY[]::text[]),
('Facebook Pixel', 'facebook-pixel', 'analytics', 'Track website conversions and build audiences', 'api_key',
 ARRAY['conversions', 'events', 'audiences'],
 ARRAY[]::text[]),
('Twilio', 'twilio', 'communication', 'SMS and voice communication platform', 'api_key',
 ARRAY['sms', 'voice', 'verification', 'notifications'],
 ARRAY[]::text[]),
('Slack', 'slack', 'communication', 'Team communication and notifications', 'oauth2',
 ARRAY['notifications', 'alerts', 'messaging'],
 ARRAY[]::text[])
ON CONFLICT (slug) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_integrations_tenant_id ON integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider_id ON integrations(provider_id);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);
CREATE INDEX IF NOT EXISTS idx_sync_history_tenant_id ON sync_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_integration_id ON sync_history(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_started_at ON sync_history(started_at);

-- Create functions for updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_integration_providers_updated_at BEFORE UPDATE ON integration_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
