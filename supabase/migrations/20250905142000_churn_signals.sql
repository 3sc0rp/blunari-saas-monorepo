-- Churn signals & supporting table
CREATE TABLE IF NOT EXISTS churn_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  signal_key text NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_churn_signals_tenant ON churn_signals(tenant_id, created_at DESC);
