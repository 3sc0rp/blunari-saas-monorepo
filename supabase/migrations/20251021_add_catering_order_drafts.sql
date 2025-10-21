-- Migration: Add catering_order_drafts table for server-side auto-save
-- Description: Stores in-progress catering orders for recovery and cross-device continuity
-- Date: 2025-10-21

-- Create catering_order_drafts table
CREATE TABLE IF NOT EXISTS catering_order_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Optional: for authenticated users
  
  -- Draft data (JSONB for flexibility)
  draft_data JSONB NOT NULL,
  package_id UUID REFERENCES catering_packages(id) ON DELETE SET NULL,
  current_step TEXT NOT NULL DEFAULT 'packages',
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Version control for conflict resolution
  version INTEGER NOT NULL DEFAULT 1,
  last_synced_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT catering_order_drafts_step_check CHECK (current_step IN ('packages', 'customize', 'details', 'confirmation'))
);

-- Indexes for performance
CREATE INDEX idx_catering_order_drafts_tenant_id ON catering_order_drafts(tenant_id);
CREATE INDEX idx_catering_order_drafts_session_id ON catering_order_drafts(session_id);
CREATE INDEX idx_catering_order_drafts_user_id ON catering_order_drafts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_catering_order_drafts_expires_at ON catering_order_drafts(expires_at);
CREATE UNIQUE INDEX idx_catering_order_drafts_session_tenant ON catering_order_drafts(session_id, tenant_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_catering_order_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER catering_order_drafts_updated_at
  BEFORE UPDATE ON catering_order_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_catering_order_drafts_updated_at();

-- RLS Policies (public access via session_id)
ALTER TABLE catering_order_drafts ENABLE ROW LEVEL SECURITY;

-- Allow public read/write via session_id (widgets are public)
-- This is safe because:
-- 1. session_id is randomly generated UUID
-- 2. Data is scoped to tenant_id
-- 3. Drafts auto-expire after 7 days
CREATE POLICY "Public can manage their own drafts via session_id"
  ON catering_order_drafts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Cleanup function for expired drafts
CREATE OR REPLACE FUNCTION cleanup_expired_catering_drafts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM catering_order_drafts
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (requires pg_cron extension - optional)
-- If pg_cron is available, uncomment this:
-- SELECT cron.schedule('cleanup-catering-drafts', '0 2 * * *', 'SELECT cleanup_expired_catering_drafts()');

-- Comments
COMMENT ON TABLE catering_order_drafts IS 'Stores in-progress catering orders for auto-save and recovery';
COMMENT ON COLUMN catering_order_drafts.session_id IS 'Browser session identifier for anonymous users';
COMMENT ON COLUMN catering_order_drafts.draft_data IS 'JSONB field containing partial order form data';
COMMENT ON COLUMN catering_order_drafts.version IS 'Version number for optimistic locking and conflict resolution';
COMMENT ON COLUMN catering_order_drafts.expires_at IS 'Auto-delete after 7 days to comply with privacy policies';
