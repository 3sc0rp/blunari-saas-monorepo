-- Admin expansion migration: feature flags, usage, billing, integrations, api keys, internal notes, stripe columns

-- Stripe / plan related columns on tenants
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS plan_code text,
ADD COLUMN IF NOT EXISTS plan_renews_at timestamptz,
ADD COLUMN IF NOT EXISTS adoption_score numeric;

-- Feature flags per tenant
CREATE TABLE IF NOT EXISTS tenant_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  enabled_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  enabled_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, feature_key)
);

-- Daily module usage aggregates
CREATE TABLE IF NOT EXISTS tenant_module_usage_daily (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  usage_date date NOT NULL,
  module_key text NOT NULL,
  primary_value bigint DEFAULT 0,
  secondary_values jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (tenant_id, usage_date, module_key)
);

-- Billing usage metrics (period level)
CREATE TABLE IF NOT EXISTS tenant_billing_usage (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  metric_key text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  quota numeric NULL,
  overage numeric NULL,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (tenant_id, period_start, metric_key)
);

-- Integration status table
CREATE TABLE IF NOT EXISTS integration_status (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  integration_key text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected',
  last_sync_at timestamptz,
  error_count int DEFAULT 0,
  last_error text,
  metadata jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (tenant_id, integration_key)
);

-- API Keys (hashed)
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  hashed_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);

-- Internal notes
CREATE TABLE IF NOT EXISTS tenant_internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tenant_internal_notes_tenant ON tenant_internal_notes(tenant_id, created_at DESC);

-- Simple view to compute current adoption percentage (modules used in last 14 days / distinct feature flags enabled)
CREATE OR REPLACE VIEW tenant_adoption_snapshot AS
SELECT t.id as tenant_id,
  COALESCE(NULLIF(count(DISTINCT CASE WHEN tm.usage_date >= (current_date - interval '14 days') THEN tm.module_key END),0),0) as active_modules,
  COALESCE(NULLIF(count(DISTINCT CASE WHEN f.enabled THEN f.feature_key END),0),0) as enabled_features,
  CASE WHEN count(DISTINCT CASE WHEN f.enabled THEN f.feature_key END) = 0 THEN 0
       ELSE (count(DISTINCT CASE WHEN tm.usage_date >= (current_date - interval '14 days') THEN tm.module_key END)::numeric / NULLIF(count(DISTINCT CASE WHEN f.enabled THEN f.feature_key END),0)) END as adoption_ratio
FROM tenants t
LEFT JOIN tenant_feature_flags f ON f.tenant_id = t.id
LEFT JOIN tenant_module_usage_daily tm ON tm.tenant_id = t.id
GROUP BY t.id;
