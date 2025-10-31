-- ============================================================================
-- PROFESSIONAL TENANT PROVISIONING V2 - PART 1: AUDIT TABLE
-- ============================================================================

DROP TABLE IF EXISTS tenant_provisioning_audit_v2 CASCADE;

CREATE TABLE tenant_provisioning_audit_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Request metadata
  idempotency_key UUID NOT NULL,
  request_id UUID NOT NULL,
  admin_user_id UUID NOT NULL,
  admin_email TEXT NOT NULL,
  
  -- Tenant information
  tenant_id UUID,
  tenant_slug TEXT NOT NULL,
  tenant_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  owner_id UUID,
  
  -- Status tracking
  status TEXT NOT NULL CHECK (status IN (
    'initiated', 'validating', 'creating_auth_user', 'creating_tenant',
    'creating_records', 'verifying', 'completed', 'failed',
    'rolling_back', 'rolled_back'
  )),
  
  -- Timing information
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration_ms INTEGER,
  
  -- Error details
  error_code TEXT,
  error_message TEXT,
  error_details JSONB,
  
  -- Metadata
  request_data JSONB NOT NULL,
  response_data JSONB,
  rollback_reason TEXT,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_v2_idempotency ON tenant_provisioning_audit_v2(idempotency_key);
CREATE INDEX idx_audit_v2_tenant ON tenant_provisioning_audit_v2(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_audit_v2_admin ON tenant_provisioning_audit_v2(admin_user_id, created_at DESC);
CREATE INDEX idx_audit_v2_status ON tenant_provisioning_audit_v2(status, created_at DESC);
CREATE INDEX idx_audit_v2_owner ON tenant_provisioning_audit_v2(owner_email, created_at DESC);

ALTER TABLE tenant_provisioning_audit_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all audit logs" ON tenant_provisioning_audit_v2
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE user_id = auth.uid()
    AND role IN ('SUPER_ADMIN', 'ADMIN')
    AND status = 'ACTIVE'
  )
);

CREATE POLICY "System insert audit logs" ON tenant_provisioning_audit_v2
FOR INSERT WITH CHECK (true);

COMMENT ON TABLE tenant_provisioning_audit_v2 IS 'Complete audit trail for tenant provisioning v2. Tracks every stage, timing, errors, and rollbacks for forensics and debugging.';
